import assert from "node:assert/strict";
import test from "node:test";
import {
  PROTOCOL_VERSION,
  TOOLS,
  createNowSentence,
  createToolsTeamNowWidget,
  handleJsonRpcPayload,
  toolsTeamNowTool
} from "../src/mcp.js";
import worker from "../src/worker.js";
import { createOpenApiDocument } from "../src/openapi.js";

test("initialize returns MCP 2025-03-26 capabilities", () => {
  const response = handleJsonRpcPayload({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: {
        name: "test-client",
        version: "0.0.1"
      }
    }
  });

  assert.equal(response.result.protocolVersion, PROTOCOL_VERSION);
  assert.deepEqual(response.result.capabilities, {
    tools: {
      listChanged: false
    }
  });
});

test("tools/list exposes Kakao-required tool metadata", () => {
  const response = handleJsonRpcPayload({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list"
  });

  assert.equal(response.result.tools.length, 1);
  assert.deepEqual(
    response.result.tools.map((tool) => tool.name),
    ["tools_team_now"]
  );

  for (const tool of response.result.tools) {
    assert.ok(tool.description);
    assert.ok(tool.inputSchema);
    assert.ok(tool.annotations.title);
    assert.equal(typeof tool.annotations.readOnlyHint, "boolean");
    assert.equal(typeof tool.annotations.destructiveHint, "boolean");
    assert.equal(typeof tool.annotations.openWorldHint, "boolean");
    assert.equal(typeof tool.annotations.idempotentHint, "boolean");
  }

  assert.deepEqual(response.result.tools, TOOLS);
});

test("tools_team_now returns a Kakao widget payload as text content", () => {
  const response = toolsTeamNowTool(() => 0);
  const payload = JSON.parse(response.content[0].text);

  assert.equal(payload.name, "tools_team_now");
  assert.equal(payload.widget.type, "Card");
  assert.equal(payload.widget.children[0].type, "Text");
  assert.equal(
    payload.widget.children[0].value,
    "씨엘은 지금 아무 생각 없이 모니터를 바라보고 있다."
  );
  assert.ok(payload.copy_text.includes(payload.widget.children[0].value));
  assert.equal(Object.hasOwn(payload.widget, "status"), false);
});

test("tools_team_now uses a natural topic particle for nicknames", () => {
  const randomValues = [0.51, 0, 0];
  const random = () => randomValues.shift() ?? 0;

  assert.equal(
    createNowSentence(random),
    "루카는 지금 아무 생각 없이 모니터를 바라보고 있다."
  );
});

test("tools_team_now includes 션 as a team member", () => {
  const randomValues = [0.99, 0, 0];
  const random = () => randomValues.shift() ?? 0;

  assert.equal(
    createNowSentence(random),
    "션은 지금 아무 생각 없이 모니터를 바라보고 있다."
  );
});

test("REST API widget payload matches the Kakao widget shape", () => {
  const payload = createToolsTeamNowWidget(() => 0);

  assert.equal(payload.name, "tools_team_now");
  assert.equal(payload.widget.type, "Card");
  assert.equal(payload.widget.children[0].value, "씨엘은 지금 아무 생각 없이 모니터를 바라보고 있다.");
  assert.ok(payload.copy_text.includes(payload.widget.children[0].value));
});

test("OpenAPI document exposes the REST endpoint for PlayMCP Builder", () => {
  const document = createOpenApiDocument("https://example.com/");

  assert.equal(document.openapi, "3.1.0");
  assert.deepEqual(document.servers, [{ url: "https://example.com" }]);
  assert.equal(
    document.paths["/tools-team-now"].get.operationId,
    "tools_team_now"
  );
});

test("notifications return no JSON-RPC body", () => {
  const response = handleJsonRpcPayload({
    jsonrpc: "2.0",
    method: "notifications/initialized"
  });

  assert.equal(response, null);
});

test("worker adapter serves the MCP endpoint", async () => {
  const response = await worker.fetch(
    new Request("https://example.com/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 7,
        method: "tools/list"
      })
    })
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.result.tools.length, 1);
});

test("worker adapter serves REST API and OpenAPI endpoints", async () => {
  const apiResponse = await worker.fetch(
    new Request("https://example.com/tools-team-now")
  );
  const apiPayload = await apiResponse.json();

  assert.equal(apiResponse.status, 200);
  assert.equal(apiPayload.name, "tools_team_now");
  assert.equal(apiPayload.widget.type, "Card");

  const openApiResponse = await worker.fetch(
    new Request("https://example.com/openapi.json")
  );
  const openApiPayload = await openApiResponse.json();

  assert.equal(openApiResponse.status, 200);
  assert.equal(openApiPayload.servers[0].url, "https://example.com");
  assert.equal(
    openApiPayload.paths["/tools-team-now"].get.operationId,
    "tools_team_now"
  );
});
