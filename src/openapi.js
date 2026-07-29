import { SERVER_NAME, SERVER_VERSION } from "./mcp.js";

export function createOpenApiDocument(baseUrl) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  return {
    openapi: "3.1.0",
    info: {
      title: `${SERVER_NAME} API`,
      version: SERVER_VERSION,
      description:
        "ToolsTeamNow(툴즈팀나우)는 씨엘, 아린, 루카, 션 중 한 명이 지금 무엇을 하고 있는지 Kakao Tools 위젯 payload로 알려주는 테스트용 API입니다."
    },
    servers: [
      {
        url: normalizedBaseUrl
      }
    ],
    paths: {
      "/tools-team-now": {
        get: {
          operationId: "tools_team_now",
          summary: "Get current ToolsTeamNow status",
          description:
            "Returns a Kakao Tools widget payload that says what 씨엘, 아린, 루카, or 션 is doing right now.",
          responses: {
            "200": {
              description: "Current ToolsTeamNow widget payload",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["widget", "copy_text", "name"],
                    properties: {
                      widget: {
                        type: "object",
                        required: ["type", "children"],
                        properties: {
                          type: {
                            type: "string",
                            const: "Card"
                          },
                          children: {
                            type: "array",
                            items: {
                              type: "object",
                              required: ["type", "value"],
                              properties: {
                                type: {
                                  type: "string",
                                  const: "Text"
                                },
                                value: {
                                  type: "string"
                                }
                              }
                            }
                          }
                        },
                        additionalProperties: true
                      },
                      copy_text: {
                        type: "string",
                        description: "Markdown text used by KakaoTalk sharing."
                      },
                      name: {
                        type: "string",
                        const: "tools_team_now"
                      }
                    },
                    additionalProperties: false
                  },
                  examples: {
                    default: {
                      value: {
                        widget: {
                          type: "Card",
                          children: [
                            {
                              type: "Text",
                              value: "씨엘은 지금 아무 생각 없이 모니터를 바라보고 있다."
                            }
                          ]
                        },
                        copy_text:
                          "**ToolsTeamNow**\n\n씨엘은 지금 아무 생각 없이 모니터를 바라보고 있다.",
                        name: "tools_team_now"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  };
}
