import {
  createToolsTeamNowWidget,
  handleJsonRpcPayload,
  parseMembersParam,
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

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin") ?? undefined;
    const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);
    const corsHeaders = makeCorsHeaders(origin, allowedOrigins);

    if (!isOriginAllowed(origin, allowedOrigins)) {
      return json({ error: "Forbidden origin." }, 403, corsHeaders);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return json(
        {
          name: SERVER_NAME,
          version: SERVER_VERSION,
          status: "ok",
          apiEndpoint: "/tools-team-now",
          openApiEndpoint: "/openapi.json",
          mcpEndpoint: "/mcp"
        },
        200,
        corsHeaders
      );
    }

    if (request.method === "GET" && url.pathname === "/tools-team-now") {
      const team = parseMembersParam(url.searchParams.get("members"));
      return json(createToolsTeamNowWidget(undefined, team), 200, corsHeaders);
    }

    if (request.method === "GET" && url.pathname === "/openapi.json") {
      return json(createOpenApiDocument(env.API_BASE_URL ?? url.origin), 200, corsHeaders);
    }

    if (url.pathname !== "/mcp") {
      return json({ error: "Not found." }, 404, corsHeaders);
    }

    if (request.method === "GET") {
      return json(
        { error: "This stateless MCP server does not offer an SSE stream." },
        405,
        { ...corsHeaders, allow: "POST, GET, OPTIONS" }
      );
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed." }, 405, {
        ...corsHeaders,
        allow: "POST, GET, OPTIONS"
      });
    }

    try {
      const payload = await request.json();
      const responsePayload = handleJsonRpcPayload(payload);

      if (responsePayload === null) {
        return new Response(null, { status: 202, headers: corsHeaders });
      }

      return json(responsePayload, 200, corsHeaders);
    } catch (error) {
      const message =
        error instanceof SyntaxError ? "Invalid JSON request body." : error.message;
      return json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32700,
            message
          }
        },
        400,
        corsHeaders
      );
    }
  }
};

function json(payload, status, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...extraHeaders
    }
  });
}
