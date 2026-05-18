import http from "node:http";
import { URL } from "node:url";
import {
  createToolsTeamNowWidget,
  handleJsonRpcPayload,
  SERVER_NAME,
  SERVER_VERSION
} from "./mcp.js";
import { createOpenApiDocument } from "./openapi.js";
import {
  JSON_HEADERS,
  isOriginAllowed,
  makeCorsHeaders,
  parseAllowedOrigins
} from "./http-response.js";

const PORT = Number.parseInt(process.env.PORT ?? "8787", 10);
const HOST = process.env.HOST ?? "127.0.0.1";
const ALLOWED_ORIGINS = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
const MAX_BODY_BYTES = 1024 * 1024;

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const corsHeaders = makeCorsHeaders(origin, ALLOWED_ORIGINS);

  if (!isOriginAllowed(origin, ALLOWED_ORIGINS)) {
    return sendJson(res, 403, { error: "Forbidden origin." }, corsHeaders);
  }

  if (req.method === "OPTIONS") {
    return sendNoContent(res, 204, corsHeaders);
  }

  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
    return sendJson(
      res,
      200,
      {
        name: SERVER_NAME,
        version: SERVER_VERSION,
        status: "ok",
        apiEndpoint: "/tools-team-now",
        openApiEndpoint: "/openapi.json",
        mcpEndpoint: "/mcp"
      },
      corsHeaders
    );
  }

  if (req.method === "GET" && url.pathname === "/tools-team-now") {
    return sendJson(res, 200, createToolsTeamNowWidget(), corsHeaders);
  }

  if (req.method === "GET" && url.pathname === "/openapi.json") {
    return sendJson(res, 200, createOpenApiDocument(process.env.API_BASE_URL ?? url.origin), corsHeaders);
  }

  if (url.pathname !== "/mcp") {
    return sendJson(res, 404, { error: "Not found." }, corsHeaders);
  }

  if (req.method === "GET") {
    res.setHeader("allow", "POST, GET, OPTIONS");
    return sendJson(
      res,
      405,
      { error: "This stateless MCP server does not offer an SSE stream." },
      corsHeaders
    );
  }

  if (req.method !== "POST") {
    res.setHeader("allow", "POST, GET, OPTIONS");
    return sendJson(res, 405, { error: "Method not allowed." }, corsHeaders);
  }

  try {
    const body = await readBody(req, MAX_BODY_BYTES);
    const payload = JSON.parse(body);
    const responsePayload = handleJsonRpcPayload(payload);

    if (responsePayload === null) {
      return sendNoContent(res, 202, corsHeaders);
    }

    return sendJson(res, 200, responsePayload, corsHeaders);
  } catch (error) {
    const message =
      error instanceof SyntaxError ? "Invalid JSON request body." : error.message;
    return sendJson(
      res,
      400,
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message
        }
      },
      corsHeaders
    );
  }
});

server.listen(PORT, HOST, () => {
  console.error(`${SERVER_NAME} ${SERVER_VERSION} listening on http://${HOST}:${PORT}`);
});

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;

    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > maxBytes) {
        reject(new Error("Request body is too large."));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.writeHead(statusCode, {
    ...JSON_HEADERS,
    ...extraHeaders
  });
  res.end(JSON.stringify(payload));
}

function sendNoContent(res, statusCode, extraHeaders = {}) {
  res.writeHead(statusCode, extraHeaders);
  res.end();
}
