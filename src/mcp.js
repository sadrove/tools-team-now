export const PROTOCOL_VERSION = "2025-03-26";
export const SERVER_NAME = "ToolsTeamNow";
export const SERVER_VERSION = "0.1.0";

export const NICKNAMES = ["씨엘", "루카", "아린", "베니"];

const FEELINGS = [
  "아무 생각 없이",
  "조용히",
  "살짝 신나서",
  "멍하니",
  "집중한 척하며",
  "차분하게",
  "왠지 뿌듯하게",
  "잠깐 쉬는 마음으로"
];

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
      "Returns a Kakao Tools widget from ToolsTeamNow(툴즈팀나우) that says what 씨엘, 루카, 아린, or 베니 is doing right now.",
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
  const sentence = createNowSentence(random);

  return {
    widget: {
      type: "Card",
      children: [
        {
          type: "Text",
          value: sentence
        }
      ]
    },
    copy_text: `**ToolsTeamNow**\n\n${sentence}`,
    name: "tools_team_now"
  };
}

export function createNowSentence(random = Math.random) {
  const nickname = pick(NICKNAMES, random);
  const feeling = pick(FEELINGS, random);
  const action = pick(ACTIONS, random);

  return `${nickname}${topicParticle(nickname)} 지금 ${feeling} ${action}.`;
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

function topicParticle(text) {
  const lastCodePoint = Array.from(text).at(-1)?.codePointAt(0);
  if (!lastCodePoint || lastCodePoint < 0xac00 || lastCodePoint > 0xd7a3) {
    return "은";
  }

  return (lastCodePoint - 0xac00) % 28 === 0 ? "는" : "은";
}

function pick(values, random) {
  const index = Math.floor(random() * values.length);
  return values[index >= values.length ? values.length - 1 : index];
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
