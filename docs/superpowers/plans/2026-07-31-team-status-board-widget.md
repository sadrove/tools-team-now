# Team Status Board Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `tools_team_now` 도구가 4명 전원의 "지금" 상태를 `ListView` 팀 보드 위젯으로 반환하도록 바꾼다.

**Architecture:** `src/mcp.js` 의 위젯 생성 로직을 데이터 모델(TEAM/EMOJIS/MOODS/ACTIONS) + 순수 빌더 함수로 재작성한다. HTTP 어댑터(`worker.js`, `node-server.js`)와 JSON-RPC 처리는 인터페이스 불변이라 건드리지 않는다. OpenAPI 스키마/예시와 테스트, 문서, 버전만 새 구조에 맞춘다.

**Tech Stack:** Node.js ≥20 (ESM), 내장 `node:test`, Cloudflare Workers 어댑터. 외부 의존성 추가 없음.

## Global Constraints

- MCP 프로토콜 버전 `2025-03-26` 유지 (`PROTOCOL_VERSION`).
- 위젯 전체는 최상위 `widget` 프로퍼티로 감싼다. `widget.status` 는 절대 설정하지 않는다.
- `copy_text` 는 bold / unordered list / inline code 만 사용하는 간단 마크다운.
- 도구는 `tools_team_now` 1개만 유지. `name`, `description`, `inputSchema`, `annotations`(title/readOnlyHint/destructiveHint/openWorldHint/idempotentHint 전부) 유지.
- 서버 버전 `0.1.1` → `0.2.0` (`src/mcp.js` `SERVER_VERSION`, `package.json` `version`, 재생성되는 `openapi.json`).
- `createToolsTeamNowWidget(random)`, `toolsTeamNowTool(random)` 함수 시그니처(그리고 `random` 주입 결정성)를 유지해 어댑터가 그대로 동작하게 한다.
- 멤버 순서 고정: `씨엘 → 아린 → 루카 → 션`.
- 이모지는 20개 풀에서 랜덤, 한 보드 안에서는 4개가 서로 다름.

---

### Task 1: Core widget logic — 팀 보드 데이터 모델 & 빌더 (TDD)

**Files:**
- Modify: `src/mcp.js` (data model + builders 전면 교체; JSON-RPC 처리부는 유지)
- Test: `test/mcp.test.js` (위젯 관련 assertion 교체)

**Interfaces:**
- Consumes: 없음 (기존 `handleJsonRpcPayload`, `handleRequest`, `callTool`, `rpcError`, `RpcException`, `isPlainObject`, `textToolResult` 는 그대로 재사용)
- Produces:
  - `TEAM: string[]` = `["씨엘","아린","루카","션"]`
  - `EMOJIS: string[]` (길이 20)
  - `MOODS: {phrase, label, color}[]` (길이 8)
  - `createTeamStatuses(random=Math.random) → {nickname, emoji, caption, moodLabel, moodColor}[]` (길이 4, 보드 내 이모지 유니크)
  - `buildListViewItem(status) → ListViewItem 노드`
  - `buildCopyText(statuses) → string`
  - `createToolsTeamNowWidget(random=Math.random) → {widget:{type:"ListView",limit,children}, copy_text, name}`
  - `toolsTeamNowTool(random=Math.random) → {content:[{type:"text",text}], isError:false}` (시그니처 유지)
  - `SERVER_VERSION = "0.2.0"`
  - 제거: `FEELINGS`, `createNowSentence`, `topicParticle`

- [ ] **Step 1: 테스트부터 작성 (실패하도록)** — `test/mcp.test.js` 상단 import에서 `createNowSentence` 를 빼고 `createTeamStatuses`, `buildCopyText` 를 추가. 기존 `Card`/`Text` 결합 테스트 3개(“returns a Kakao widget payload as text content”, “uses a natural topic particle”, “includes 션 as a team member”, “REST API widget payload matches …”)를 아래 새 테스트로 교체:

```js
import {
  PROTOCOL_VERSION,
  TOOLS,
  createTeamStatuses,
  createToolsTeamNowWidget,
  buildCopyText,
  handleJsonRpcPayload,
  toolsTeamNowTool
} from "../src/mcp.js";

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
```
  또한 기존 “worker adapter serves REST API and OpenAPI endpoints” 테스트의 `assert.equal(apiPayload.widget.type, "Card")` 를 `"ListView"` 로 바꾼다.

- [ ] **Step 2: 실패 확인** — Run: `npm test`. Expected: FAIL (`createTeamStatuses`/`buildCopyText` is not exported, widget.type 이 여전히 Card).

- [ ] **Step 3: `src/mcp.js` 재작성** — 상단 상수/데이터 모델과 빌더 교체. `handleJsonRpcPayload` 이하 JSON-RPC 처리부와 헬퍼(`isPlainObject`, `rpcError`, `RpcException`, `textToolResult`)는 유지. `callTool`/`handleRequest`/`initializeResult` 유지. `TOOLS` 의 description 만 팀 보드 문구로 갱신.

```js
export const PROTOCOL_VERSION = "2025-03-26";
export const SERVER_NAME = "ToolsTeamNow";
export const SERVER_VERSION = "0.2.0";

export const TEAM = ["씨엘", "아린", "루카", "션"];

export const EMOJIS = [
  "✨", "🌙", "⚡", "🌿", "☕", "💻", "📝", "🎧", "🧩", "🔥",
  "🌈", "🍀", "🪄", "📌", "🖊️", "🧠", "🫖", "🕯️", "🌻", "🐢"
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
      "Returns a Kakao Tools widget from ToolsTeamNow(툴즈팀나우) showing what all four teammates — 씨엘, 아린, 루카, and 션 — are doing right now as a team status board.",
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
```

  위젯 빌더 (기존 `createToolsTeamNowWidget`/`toolsTeamNowTool` 자리에 교체):

```js
export function toolsTeamNowTool(random = Math.random) {
  return textToolResult(JSON.stringify(createToolsTeamNowWidget(random)));
}

export function createToolsTeamNowWidget(random = Math.random) {
  const statuses = createTeamStatuses(random);

  return {
    widget: {
      type: "ListView",
      limit: TEAM.length,
      children: statuses.map(buildListViewItem)
    },
    copy_text: buildCopyText(statuses),
    name: "tools_team_now"
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

export function buildListViewItem(status) {
  return {
    type: "ListViewItem",
    children: [
      {
        type: "Box",
        direction: "row",
        align: "center",
        justify: "between",
        gap: 12,
        children: [
          {
            type: "Box",
            direction: "row",
            align: "center",
            gap: 10,
            children: [
              { type: "Text", value: status.emoji, size: "lg" },
              {
                type: "Col",
                gap: 2,
                children: [
                  { type: "Title", value: status.nickname, size: "sm", weight: "semibold" },
                  { type: "Caption", value: status.caption }
                ]
              }
            ]
          },
          {
            type: "Badge",
            label: status.moodLabel,
            color: status.moodColor,
            variant: "soft",
            pill: true
          }
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
```

  헬퍼 교체 (기존 `pick` 유지 가능하나 클램프 공유; `topicParticle` 제거, `takeRandom` 추가):

```js
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
```

- [ ] **Step 4: 통과 확인** — Run: `npm test`. Expected: PASS (모든 테스트).

- [ ] **Step 5: 커밋**

```bash
git add src/mcp.js test/mcp.test.js
git commit -m "feat: render tools_team_now as a 4-member ListView status board"
```

---

### Task 2: OpenAPI 스키마·예시 갱신 & 재생성

**Files:**
- Modify: `src/openapi.js` (schema `Card`→`ListView`, example 교체, description 갱신)
- Modify: `openapi.json` (스크립트로 재생성)
- Test: `test/mcp.test.js` (OpenAPI 테스트는 operationId 검증 유지 — 수정 불필요일 수 있음, 확인)

**Interfaces:**
- Consumes: `SERVER_NAME`, `SERVER_VERSION`(=0.2.0) from `src/mcp.js`
- Produces: `createOpenApiDocument(baseUrl)` — `paths["/tools-team-now"].get.operationId === "tools_team_now"` 유지, 응답 스키마 `widget.type` const `"ListView"`

- [ ] **Step 1: `src/openapi.js` 수정** — `info.description` 을 팀 보드 문구로, 응답 스키마의 widget 부분과 example 을 교체.

  `info.description`:
```js
description:
  "ToolsTeamNow(툴즈팀나우)는 씨엘, 아린, 루카, 션 네 명이 지금 무엇을 하고 있는지 Kakao Tools ListView 위젯 payload로 보여주는 테스트용 API입니다."
```

  `schema.properties.widget` 교체:
```js
widget: {
  type: "object",
  required: ["type", "children"],
  properties: {
    type: { type: "string", const: "ListView" },
    children: {
      type: "array",
      items: {
        type: "object",
        required: ["type", "children"],
        properties: {
          type: { type: "string", const: "ListViewItem" },
          children: { type: "array" }
        },
        additionalProperties: true
      }
    }
  },
  additionalProperties: true
},
```

  `examples.default.value` 교체:
```js
examples: {
  default: {
    value: {
      widget: {
        type: "ListView",
        limit: 4,
        children: [
          {
            type: "ListViewItem",
            children: [
              {
                type: "Box",
                direction: "row",
                align: "center",
                justify: "between",
                gap: 12,
                children: [
                  {
                    type: "Box",
                    direction: "row",
                    align: "center",
                    gap: 10,
                    children: [
                      { type: "Text", value: "✨", size: "lg" },
                      {
                        type: "Col",
                        gap: 2,
                        children: [
                          { type: "Title", value: "씨엘", size: "sm", weight: "semibold" },
                          { type: "Caption", value: "지금 아무 생각 없이 모니터를 바라보고 있다." }
                        ]
                      }
                    ]
                  },
                  { type: "Badge", label: "무념", color: "secondary", variant: "soft", pill: true }
                ]
              }
            ]
          }
        ]
      },
      copy_text:
        "**Tools Team Now**\n\n- **씨엘** 지금 아무 생각 없이 모니터를 바라보고 있다. `무념`",
      name: "tools_team_now"
    }
  }
}
```

- [ ] **Step 2: OpenAPI 테스트 실행** — Run: `npm test`. Expected: PASS (operationId/servers 검증은 그대로 유효).

- [ ] **Step 3: `openapi.json` 재생성**

Run: `npm run openapi:write`
Expected: `openapi.json` 이 새 스키마/예시 + `version: "0.2.0"` + server `https://tools-team-now.toolsteamnow.workers.dev` 로 갱신.

- [ ] **Step 4: 재생성 결과 확인** — Run: `node -e "const d=require('./openapi.json'); console.log(d.info.version, d.paths['/tools-team-now'].get.responses['200'].content['application/json'].schema.properties.widget.properties.type.const)"`
Expected: `0.2.0 ListView`

- [ ] **Step 5: 커밋**

```bash
git add src/openapi.js openapi.json
git commit -m "feat: describe ListView board payload in OpenAPI spec"
```

---

### Task 3: 문서 & 버전 메타데이터

**Files:**
- Modify: `package.json` (version 0.2.0)
- Modify: `README.md` (도구 설명 + Docker 태그)
- Modify: `PLAYMCP_BUILDER.md` (설명 문구)

**Interfaces:**
- Consumes: 없음
- Produces: 없음 (문서/메타데이터만)

- [ ] **Step 1: `package.json` version 변경** — `"version": "0.1.1"` → `"version": "0.2.0"`.

- [ ] **Step 2: `README.md` 갱신**
  - 도구 설명 문장(3~7행)을 "4명(`씨엘/아린/루카/션`) 전원의 지금 상태를 `ListView` 팀 보드로 반환" 취지로 수정.
  - "Guide Alignment" 의 위젯 설명 줄을 ListView/Badge 구조 반영으로 수정.
  - Docker 섹션의 `tools-team-now:0.1.1` → `tools-team-now:0.2.0` (2곳).

- [ ] **Step 3: `PLAYMCP_BUILDER.md` 갱신** — 설명 줄(9행)의 "한 명이 지금 무엇을 하고 있는지" → "네 명(씨엘·아린·루카·션)이 지금 무엇을 하고 있는지 팀 보드로" 로 수정.

- [ ] **Step 4: 전체 테스트 재확인** — Run: `npm test`. Expected: PASS (문서 변경은 테스트 무관, 회귀 없음 확인).

- [ ] **Step 5: 커밋**

```bash
git add package.json README.md PLAYMCP_BUILDER.md
git commit -m "docs: bump to 0.2.0 and describe team status board"
```

---

## Self-Review

**Spec coverage:**
- 동작 변화(4명 ListView) → Task 1 ✅
- 데이터 모델(TEAM/EMOJIS 20/MOODS 8/ACTIONS) → Task 1 ✅
- 이모지 보드 내 유니크 → Task 1 `takeRandom` + 테스트 ✅
- 위젯 구조(ListView/ListViewItem/Box/Col/Text/Title/Caption/Badge, status 미설정) → Task 1 `buildListViewItem` + 테스트 ✅
- copy_text 마크다운 → Task 1 `buildCopyText` + 테스트 ✅
- 결정성(random 주입) → Task 1 `() => 0` 테스트 ✅
- 어댑터 불변 → worker/node-server 미변경 (기존 worker 테스트 유지) ✅
- OpenAPI 스키마/예시/description/version → Task 2 ✅
- 문서 & 버전 0.2.0 → Task 3 (+ mcp.js SERVER_VERSION Task 1) ✅

**Placeholder scan:** 모든 코드 스텝에 실제 코드 포함. "적절히 처리" 류 문구 없음. ✅

**Type consistency:** `createTeamStatuses` 반환 필드(`nickname/emoji/caption/moodLabel/moodColor`)를 `buildListViewItem`/`buildCopyText` 가 동일하게 소비. `createToolsTeamNowWidget`/`toolsTeamNowTool` 시그니처 유지로 어댑터 호환. Title 접근 경로(item.children[0].children[0].children[1]) 는 테스트에서 badge/구조로만 검증하여 과결합 회피. ✅
