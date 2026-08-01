import { SERVER_NAME, SERVER_VERSION } from "./mcp.js";

export function createOpenApiDocument(baseUrl) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  return {
    openapi: "3.1.0",
    info: {
      title: `${SERVER_NAME} API`,
      version: SERVER_VERSION,
      description:
        "ToolsTeamNow(툴즈팀나우)는 씨엘, 아린, 루카, 션 네 명이 지금 무엇을 하고 있는지 Kakao Tools ListView 위젯 payload로 보여주는 테스트용 API입니다."
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
            "This tool is part of the '툴즈팀 뭐해?' MCP and tells you what 툴즈팀 is doing right now. 툴즈팀 refers to the Kakao Tools team (카카오툴즈팀). When a user asks what 툴즈팀 is up to, use this tool to answer.",
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
                              required: ["type"],
                              properties: {
                                type: {
                                  type: "string"
                                }
                              },
                              additionalProperties: true
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
                              type: "Row",
                              align: "center",
                              gap: 6,
                              children: [
                                {
                                  type: "Box",
                                  align: "center",
                                  justify: "center",
                                  size: 40,
                                  radius: "full",
                                  background: { light: "#F1F2F4", dark: "#2B2B30" },
                                  children: [{ type: "Text", value: "😎", size: "md" }]
                                },
                                {
                                  type: "Col",
                                  flex: 1,
                                  gap: 2,
                                  children: [
                                    {
                                      type: "Row",
                                      align: "center",
                                      gap: 6,
                                      children: [
                                        {
                                          type: "Title",
                                          value: "씨엘",
                                          size: "md",
                                          weight: "semibold"
                                        },
                                        {
                                          type: "Badge",
                                          label: "무념",
                                          color: "secondary",
                                          variant: "soft",
                                          pill: true
                                        }
                                      ]
                                    },
                                    {
                                      type: "Caption",
                                      value: "지금 아무 생각 없이 모니터를 바라보고 있다.",
                                      size: "md"
                                    }
                                  ]
                                }
                              ]
                            },
                            { type: "Divider", spacing: 4 }
                          ]
                        },
                        copy_text:
                          "**Tools Team Now**\n\n- **씨엘** 지금 아무 생각 없이 모니터를 바라보고 있다. `무념`",
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
