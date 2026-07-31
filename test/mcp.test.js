import assert from "node:assert/strict";
import test from "node:test";
import {
  PROTOCOL_VERSION,
  TOOLS,
  createTeamStatuses,
  createToolsTeamNowWidget,
  buildCopyText,
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

test("createTeamStatuses covers the whole team in fixed order, deterministically", () => {
  const statuses = createTeamStatuses(() => 0);

  assert.deepEqual(
    statuses.map((s) => s.nickname),
    ["씨엘", "아린", "루카", "션"]
  );
  for (const s of statuses) {
    assert.equal(s.caption, "지금 아무 생각 없이 모니터를 바라보고 있다.");
    assert.equal(s.moodLabel, "무념");
    assert.equal(s.moodColor, "secondary");
  }
});

test("createTeamStatuses gives each teammate a distinct emoji from the pool", () => {
  const statuses = createTeamStatuses(() => 0);
  const emojis = statuses.map((s) => s.emoji);

  assert.equal(new Set(emojis).size, 4);
  assert.deepEqual(emojis, ["✨", "🌙", "⚡", "🌿"]);
});

test("tools_team_now returns a Kakao ListView board with one item per member", () => {
  const response = toolsTeamNowTool(() => 0);
  const payload = JSON.parse(response.content[0].text);

  assert.equal(payload.name, "tools_team_now");
  assert.equal(payload.widget.type, "ListView");
  assert.equal(payload.widget.children.length, 4);
  for (const item of payload.widget.children) {
    assert.equal(item.type, "ListViewItem");
  }
  assert.equal(Object.hasOwn(payload.widget, "status"), false);
});

test("each board item carries a mood badge", () => {
  const payload = createToolsTeamNowWidget(() => 0);
  const outerBox = payload.widget.children[0].children[0];
  const badge = outerBox.children[1];

  assert.equal(badge.type, "Badge");
  assert.equal(badge.label, "무념");
  assert.equal(badge.color, "secondary");
});

test("copy_text lists every teammate with their mood", () => {
  const copyText = buildCopyText(createTeamStatuses(() => 0));

  assert.ok(copyText.startsWith("**Tools Team Now**"));
  for (const nickname of ["씨엘", "아린", "루카", "션"]) {
    assert.ok(copyText.includes(`**${nickname}**`));
  }
  assert.ok(copyText.includes("`무념`"));
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
  assert.equal(apiPayload.widget.type, "ListView");

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
