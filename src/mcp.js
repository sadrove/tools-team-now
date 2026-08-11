export const PROTOCOL_VERSION = "2025-03-26";
export const SERVER_NAME = "ToolsTeamNow";
export const SERVER_VERSION = "0.4.0";

export const TEAM = ["씨엘", "아린", "루카", "션"];

export const EMOJIS = [
  "😎", "🤓", "🧐", "🥸", "🤠", "🫡", "🤖", "👽", "👾", "🤡",
  "🥳", "🤩", "😈", "👻", "🎃", "🤯", "🤪", "😜", "🥴", "🫠"
];

export const MOODS = [
  { phrase: "아무 생각 없이", label: "무념", color: "secondary" },
  { phrase: "조용히", label: "고요", color: "info" },
  { phrase: "살짝 신나서", label: "신남", color: "success" },
  { phrase: "멍하니", label: "멍", color: "secondary" },
  { phrase: "집중한 척하며", label: "집중", color: "discovery" },
  { phrase: "차분하게", label: "차분", color: "info" },
  { phrase: "왠지 뿌듯하게", label: "뿌듯", color: "warning" },
  { phrase: "잠깐 쉬는 마음으로", label: "휴식", color: "success" }
];

export const COFFEE_BUTTON_LABEL = "오늘 커피 쏘기 랜덤 1명 지정";
export const COFFEE_BUTTON_URL =
  "https://sandbox-chatgpt.kakao.com?t_src=kakaotalk&t_ch=cieltest&tool_choice=true&prompt=%EB%B0%A9%EA%B8%88%20%27%ED%88%B4%EC%A6%88%ED%8C%80%20%EB%AD%90%ED%95%B4%3F%27%20%ED%88%B4%20%EC%9D%91%EB%8B%B5%EC%9C%BC%EB%A1%9C%20%EB%82%98%EC%99%94%EB%8D%98%20%EC%82%AC%EB%9E%8C%20%EC%A4%91%EC%97%90%EC%84%9C%201%EB%AA%85%EC%9D%84%20%EB%9E%9C%EB%8D%A4%EC%9C%BC%EB%A1%9C%20%EB%BD%91%EC%95%84%EC%84%9C%20%EC%95%8C%EB%A0%A4%EC%A4%98.%20%EA%B7%B8%20%EC%82%AC%EB%9E%8C%EC%9D%B4%20%EC%BB%A4%ED%94%BC%EB%A5%BC%20%EC%8F%A0%EA%BA%BC%EC%95%BC";

export const ASK_BUTTON_LABEL = "엘튼, 써니는 뭐하고 있음?";
export const ASK_BUTTON_TEXT =
  '방금 사용한 툴을 이용해서 "엘튼", "써니"를 팀 사람으로 입력해서 뭐하고 있는지 알려줘';

const ACTIONS = [
  "모니터를 바라보고 있다",
  "커피잔을 만지작거리고 있다",
  "할 일 목록을 정리하고 있다",
  "새 아이디어를 떠올리고 있다",
  "키보드 위에 손을 올려두고 있다",
  "메모장을 열어두고 있다",
  "방금 떠오른 문장을 고쳐 쓰고 있다",
  "다음 테스트를 기다리고 있다"
];

export const TOOLS = [
  {
    name: "tools_team_now",
    description:
      "This tool belongs to the ToolsTeamNow(툴즈팀 뭐함?) MCP and reports what 툴즈팀, the Kakao Tools team(카카오툴즈팀), is doing right now. When a user asks what 툴즈팀(ToolsTeamNow) is up to, use this tool to answer.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    },
    annotations: {
      title: "Tools Team Now",
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: false
    }
  }
];

export function handleJsonRpcPayload(payload) {
  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return rpcError(null, -32600, "Invalid JSON-RPC batch.");
    }

    const responses = payload
      .map((message) => handleJsonRpcMessage(message))
      .filter(Boolean);

    return responses.length === 0 ? null : responses;
  }

  return handleJsonRpcMessage(payload);
}

export function handleJsonRpcMessage(message) {
  if (!isPlainObject(message) || message.jsonrpc !== "2.0") {
    return rpcError(null, -32600, "Invalid JSON-RPC request.");
  }

  if (typeof message.method !== "string") {
    return null;
  }

  const hasId = Object.hasOwn(message, "id");

  if (!hasId) {
    return handleNotification(message);
  }

  try {
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: handleRequest(message.method, message.params ?? {})
    };
  } catch (error) {
    if (error instanceof RpcException) {
      return rpcError(message.id, error.code, error.message, error.data);
    }

    return rpcError(message.id, -32603, "Internal error.");
  }
}

export function handleRequest(method, params) {
  switch (method) {
    case "initialize":
      return initializeResult(params);
    case "ping":
      return {};
    case "tools/list":
      return { tools: TOOLS };
    case "tools/call":
      return callTool(params);
    default:
      throw new RpcException(-32601, `Method not found: ${method}`);
  }
}

export function callTool(params) {
  if (!isPlainObject(params) || typeof params.name !== "string") {
    throw new RpcException(-32602, "tools/call requires params.name.");
  }

  switch (params.name) {
    case "tools_team_now":
      return toolsTeamNowTool();
    default:
      throw new RpcException(-32602, `Unknown tool: ${params.name}`);
  }
}

export function toolsTeamNowTool(random = Math.random) {
  return textToolResult(JSON.stringify(createToolsTeamNowWidget(random)));
}

export function createToolsTeamNowWidget(random = Math.random) {
  const statuses = createTeamStatuses(random);
  const children = [];

  statuses.forEach((status, index) => {
    children.push(buildMemberRow(status));
    if (index < statuses.length - 1) {
      children.push({ type: "Divider" });
    }
  });

  children.push({ type: "Divider" });
  children.push(buildCoffeeButton());
  children.push(buildTeamAskButton());

  return {
    widget: {
      type: "Card",
      children
    },
    copy_text: buildCopyText(statuses),
    name: "tools_team_now"
  };
}

export function buildCoffeeButton() {
  return {
    type: "Button",
    label: COFFEE_BUTTON_LABEL,
    style: "primary",
    block: true,
    onClickAction: {
      payload: {
        target: {
          url: COFFEE_BUTTON_URL
        }
      }
    }
  };
}

export function buildTeamAskButton() {
  return {
    type: "Button",
    label: ASK_BUTTON_LABEL,
    style: "secondary",
    block: true,
    onClickAction: {
      payload: {
        target: {
          type: "sendUserMessage",
          properties: {
            text: ASK_BUTTON_TEXT,
            toolChoice: true,
            newThread: false
          }
        }
      }
    }
  };
}

export function createTeamStatuses(random = Math.random) {
  const emojiPool = [...EMOJIS];

  return TEAM.map((nickname) => {
    const emoji = takeRandom(emojiPool, random);
    const mood = pick(MOODS, random);
    const action = pick(ACTIONS, random);

    return {
      nickname,
      emoji,
      caption: `지금 ${mood.phrase} ${action}.`,
      moodLabel: mood.label,
      moodColor: mood.color
    };
  });
}

export function buildMemberRow(status) {
  return {
    type: "Row",
    align: "center",
    gap: 4,
    children: [
      {
        type: "Box",
        align: "center",
        justify: "center",
        size: 40,
        radius: "full",
        background: { light: "#F1F2F4", dark: "#2B2B30" },
        children: [{ type: "Text", value: status.emoji, size: "lg" }]
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
              { type: "Title", value: status.nickname, size: "md", weight: "semibold" },
              {
                type: "Badge",
                label: status.moodLabel,
                color: status.moodColor,
                variant: "soft",
                pill: true
              }
            ]
          },
          { type: "Caption", value: status.caption, size: "lg" }
        ]
      }
    ]
  };
}

export function buildCopyText(statuses) {
  const lines = statuses.map(
    (status) => `- **${status.nickname}** ${status.caption} \`${status.moodLabel}\``
  );

  return `**Tools Team Now**\n\n${lines.join("\n")}`;
}

function initializeResult(params) {
  if (!isPlainObject(params)) {
    throw new RpcException(-32602, "initialize requires params.");
  }

  return {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {
      tools: {
        listChanged: false
      }
    },
    serverInfo: {
      name: SERVER_NAME,
      version: SERVER_VERSION
    },
    instructions: "ToolsTeamNow exposes one read-only test tool: tools_team_now."
  };
}

function handleNotification(message) {
  switch (message.method) {
    case "notifications/initialized":
    case "notifications/cancelled":
      return null;
    default:
      return null;
  }
}

function textToolResult(text) {
  return {
    content: [
      {
        type: "text",
        text
      }
    ],
    isError: false
  };
}

function takeRandom(pool, random) {
  const index = clampIndex(Math.floor(random() * pool.length), pool.length);
  return pool.splice(index, 1)[0];
}

function pick(values, random) {
  return values[clampIndex(Math.floor(random() * values.length), values.length)];
}

function clampIndex(index, length) {
  if (index < 0) {
    return 0;
  }

  return index >= length ? length - 1 : index;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function rpcError(id, code, message, data) {
  const error = { code, message };
  if (data !== undefined) {
    error.data = data;
  }

  return {
    jsonrpc: "2.0",
    id,
    error
  };
}

class RpcException extends Error {
  constructor(code, message, data) {
    super(message);
    this.code = code;
    this.data = data;
  }
}
