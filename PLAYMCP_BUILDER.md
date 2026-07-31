# PlayMCP in KC Builder Registration

Use this flow when registering ToolsTeamNow through the OpenAPI-based MCP Builder.

## Basic Info

- MCP 서버 이름: `ToolsTeamNow`
- 아이콘: `✨`
- 설명: `씨엘, 아린, 루카, 션 네 명이 지금 무엇을 하고 있는지 ListView 팀 상태 보드 위젯으로 보여주는 테스트용 MCP 서버입니다.`
- 태그: `test, mcp, widget, teamnow`
- OpenAPI Specification JSON: upload `openapi.json` from this project

## Temporary API Server

- API base URL: `https://tools-team-now.toolsteamnow.workers.dev`
- REST endpoint used by OpenAPI: `GET /tools-team-now`
- OpenAPI endpoint for reference: `https://tools-team-now.toolsteamnow.workers.dev/openapi.json`

## Expected Tool

The Builder should create one tool from the OpenAPI path:

- `tools_team_now`

## Notes

The REST API returns Kakao Tools widget payload JSON directly. After registering, verify in Preview that the Builder-generated MCP preserves the widget payload shape.
