#!/usr/bin/env node

import { CONNECTOR_VERSION, createYipYapConnector } from "./connector-core.mjs";

const MAX_STDIN_LINE_BYTES = 128 * 1024;
const SUPPORTED_PROTOCOL_VERSIONS = new Set(["2025-06-18", "2025-03-26"]);

function providerFromArgv(argv) {
  if (argv.length !== 2 || argv[0] !== "--provider") {
    throw new TypeError("Expected --provider with one host id.");
  }
  return argv[1];
}

function jsonRpcError(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function exactRequestRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value
    : null;
}

function validJsonRpcId(value) {
  return value === null
    || typeof value === "string"
    || (typeof value === "number" && Number.isFinite(value));
}

export function createMcpRequestHandler({ connector }) {
  let initialized = false;
  return async function handleRequest(message) {
    const request = exactRequestRecord(message);
    const hasId = request !== null && Object.hasOwn(request, "id");
    const id = hasId && validJsonRpcId(request.id) ? request.id : null;
    if (
      !request
      || (hasId && !validJsonRpcId(request.id))
      || request.jsonrpc !== "2.0"
      || typeof request.method !== "string"
    ) {
      return jsonRpcError(id, -32600, "Invalid Request");
    }
    if (!hasId) {
      if (request.method === "notifications/initialized") initialized = true;
      return null;
    }
    if (request.method === "initialize") {
      const params = exactRequestRecord(request.params);
      const requested = params?.protocolVersion;
      if (typeof requested !== "string") {
        return jsonRpcError(id, -32602, "Invalid params");
      }
      initialized = true;
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.has(requested)
            ? requested
            : "2025-06-18",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "yipyap-account", version: CONNECTOR_VERSION },
        },
      };
    }
    if (!initialized) return jsonRpcError(id, -32002, "Server not initialized");
    if (request.method === "ping") {
      return { jsonrpc: "2.0", id, result: {} };
    }
    if (request.method === "tools/list") {
      return { jsonrpc: "2.0", id, result: { tools: connector.tools } };
    }
    if (request.method === "tools/call") {
      const params = exactRequestRecord(request.params);
      if (!params || typeof params.name !== "string") {
        return jsonRpcError(id, -32602, "Invalid params");
      }
      const result = await connector.callTool(params.name, params.arguments ?? {});
      return { jsonrpc: "2.0", id, result };
    }
    return jsonRpcError(id, -32601, "Method not found");
  };
}

export async function runStdioServer({ stdin, stdout, connector }) {
  const handleRequest = createMcpRequestHandler({ connector });
  let pending = Buffer.alloc(0);
  for await (const chunk of stdin) {
    pending = Buffer.concat([pending, Buffer.from(chunk)]);
    if (pending.byteLength > MAX_STDIN_LINE_BYTES && !pending.includes(0x0a)) {
      throw new Error("MCP input line exceeded its fixed bound.");
    }
    while (true) {
      const newline = pending.indexOf(0x0a);
      if (newline < 0) break;
      const line = pending.subarray(0, newline);
      pending = pending.subarray(newline + 1);
      if (line.byteLength === 0) continue;
      let response;
      try {
        if (line.byteLength > MAX_STDIN_LINE_BYTES) throw new SyntaxError();
        const decoded = new TextDecoder("utf-8", { fatal: true }).decode(line);
        response = await handleRequest(JSON.parse(decoded));
      } catch {
        response = jsonRpcError(null, -32700, "Parse error");
      }
      if (response !== null) stdout.write(`${JSON.stringify(response)}\n`);
    }
  }
  if (pending.byteLength !== 0) {
    stdout.write(`${JSON.stringify(jsonRpcError(null, -32700, "Parse error"))}\n`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let connector;
  try {
    connector = createYipYapConnector({ providerId: providerFromArgv(process.argv.slice(2)) });
  } catch {
    process.stderr.write("Yip-Yap connector configuration is invalid.\n");
    process.exitCode = 2;
  }
  if (connector) {
    runStdioServer({ stdin: process.stdin, stdout: process.stdout, connector }).catch(() => {
      process.stderr.write("Yip-Yap connector stopped after an input or transport failure.\n");
      process.exitCode = 1;
    });
  }
}
