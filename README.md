# ToolsTeamNow MCP Server

ToolsTeamNow is a tiny remote MCP server for Kakao Tools testing. It exposes one read-only tool:

- `tools_team_now`: returns a Kakao Tools `ListView` widget payload — a team status board where all four teammates (`씨엘`, `아린`, `루카`, `션`) each show what they are doing right now, with a signature emoji and a mood badge.

Each render picks a random emoji (from a pool of 20, unique per board), mood, and action for every member, so the board changes every time.

## Guide Alignment

This server follows the Kakao Tools guide points that matter for this test server:

- MCP protocol version: `2025-03-26`
- Transport: stateless Streamable HTTP at `/mcp`
- Tool metadata includes `name`, `description`, `inputSchema`, and full `annotations`
- Widget responses are returned as a JSON string inside MCP `content[0].text`
- The widget payload is wrapped in a top-level `widget` property and includes `copy_text`
- The board uses ChatKit core components: `ListView` / `ListViewItem` / `Box` / `Col` / `Text` / `Title` / `Caption` / `Badge`
- The widget payload does not set `widget.status`, because Kakao adds that field (it renders as the board header)

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
docker buildx build --platform linux/amd64 -t tools-team-now:0.2.0 --load .
docker run --rm -p 8787:8787 tools-team-now:0.2.0
```
