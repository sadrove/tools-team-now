# ToolsTeamNow MCP Server

ToolsTeamNow is a tiny remote MCP server for Kakao Tools testing. It exposes one read-only tool:

- `tools_team_now`: returns a Kakao Tools widget payload that renders a sentence like `씨엘은 지금 아무 생각 없이 모니터를 바라보고 있다.`

Nicknames are `씨엘`, `루카`, `아린`, and `베니`.

## Guide Alignment

This server follows the Kakao Tools guide points that matter for this test server:

- MCP protocol version: `2025-03-26`
- Transport: stateless Streamable HTTP at `/mcp`
- Tool metadata includes `name`, `description`, `inputSchema`, and full `annotations`
- Widget responses are returned as a JSON string inside MCP `content[0].text`
- The widget payload is wrapped in a top-level `widget` property and includes `copy_text`
- The widget payload does not set `widget.status`, because Kakao adds that field

## Local Run

```bash
npm test
npm run dev
```

The local MCP endpoint is:

```text
http://127.0.0.1:8787/mcp
```

Health check:

```bash
curl http://127.0.0.1:8787/health
```

List tools:

```bash
curl -s http://127.0.0.1:8787/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Call `tools_team_now`:

```bash
curl -s http://127.0.0.1:8787/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"tools_team_now","arguments":{}}}'
```

## Docker

```bash
docker buildx build --platform linux/amd64 -t tools-team-now:0.1.0 --load .
docker run --rm -p 8787:8787 tools-team-now:0.1.0
```
