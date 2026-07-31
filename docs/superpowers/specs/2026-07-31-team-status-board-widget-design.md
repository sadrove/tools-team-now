# Tools Team Now — 팀 상태 보드 위젯 설계

- 날짜: 2026-07-31
- 대상: `tools-team-now` MCP 서버 (Kakao Tools)
- 목표: 위젯 구조 풍성화 — 단일 문장 `Card > Text` 를 4명 전원의 "지금" 상태를 보여주는 `ListView` 팀 보드로 개선
- 버전: 0.1.1 → 0.2.0 (위젯 구조 변경)

## 배경

현재 `tools_team_now` 도구는 `씨엘 / 아린 / 루카 / 션` 중 **랜덤 1명**의 한 문장을 `Card > Text` 한 줄로 반환한다. 도구 이름이 "team now" 인데도 팀의 느낌이 없고 위젯이 빈약하다.

Kakao Tools 위젯은 OpenAI ChatKit widgets 스펙과 동일하며, 다음 규칙을 따른다:
- 위젯 전체를 최상위 `widget` 프로퍼티로 감싼다 (카카오 전용 규칙).
- `widget.status` 는 설정하지 않는다 — 카카오가 로고/서비스명 헤더로 자동 추가한다.
- `copy_text` 는 카카오톡 공유용 간단 마크다운 (bold, italic, unordered/ordered list, inline code 만 허용).

## 동작 변화

- 기존: 랜덤 1명 → 문장 1줄
- 변경: **4명 전원**의 상태를 각자 독립 랜덤으로 생성해 `ListView` 로 반환
- 결정성: 기존과 동일하게 `random` 함수를 주입받아 테스트에서 결정적으로 검증 가능하게 유지

## 데이터 모델 (`src/mcp.js`)

- `TEAM`: 멤버 목록 `["씨엘", "아린", "루카", "션"]` (순서 고정 — 보드에 항상 이 순서로 노출)
- `EMOJIS`: 약 20개의 이모지 풀. 예:
  `✨ 🌙 ⚡ 🌿 ☕ 💻 📝 🎧 🧩 🔥 🌈 🍀 🪄 📌 🖊️ 🧠 🫖 🕯️ 🌻 🐢`
  - 매 호출마다 랜덤으로 배정하되, **한 보드 안에서 4명이 서로 다른 이모지**를 갖도록 남은 풀에서 뽑는다(중복 제거).
- `MOODS`: `feeling` → `{ phrase, label, color }` 매핑 (Badge 표기용)

  | phrase (문장용) | label (Badge) | color |
  |---|---|---|
  | 아무 생각 없이 | 무념 | secondary |
  | 조용히 | 고요 | info |
  | 살짝 신나서 | 신남 | success |
  | 멍하니 | 멍 | secondary |
  | 집중한 척하며 | 집중 | discovery |
  | 차분하게 | 차분 | info |
  | 왠지 뿌듯하게 | 뿌듯 | warning |
  | 잠깐 쉬는 마음으로 | 휴식 | success |

- `ACTIONS`: 기존 8개 동작 문구 유지
  (모니터를 바라보고 있다 / 커피잔을 만지작거리고 있다 / 할 일 목록을 정리하고 있다 / 새 아이디어를 떠올리고 있다 / 키보드 위에 손을 올려두고 있다 / 메모장을 열어두고 있다 / 방금 떠오른 문장을 고쳐 쓰고 있다 / 다음 테스트를 기다리고 있다)

### 멤버 상태 생성

각 멤버마다:
- 이모지: 남은 풀에서 랜덤 1개 (보드 내 유니크)
- mood: `MOODS` 에서 랜덤 1개 → `phrase` 는 문장에, `label`/`color` 는 Badge에
- action: `ACTIONS` 에서 랜덤 1개
- caption 문장: `"지금 {phrase} {action}."` (이름/조사 없음 — 이름은 Title로 분리)

## 위젯 구조

루트는 `ListView`, 자식은 멤버별 `ListViewItem` 4개.

```json
{
  "widget": {
    "type": "ListView",
    "limit": 4,
    "children": [
      {
        "type": "ListViewItem",
        "children": [
          {
            "type": "Box", "direction": "row", "align": "center", "justify": "between", "gap": 12,
            "children": [
              {
                "type": "Box", "direction": "row", "align": "center", "gap": 10,
                "children": [
                  { "type": "Text", "value": "✨", "size": "lg" },
                  {
                    "type": "Col", "gap": 2,
                    "children": [
                      { "type": "Title", "value": "씨엘", "size": "sm", "weight": "semibold" },
                      { "type": "Caption", "value": "지금 아무 생각 없이 모니터를 바라보고 있다." }
                    ]
                  }
                ]
              },
              { "type": "Badge", "label": "무념", "color": "secondary", "variant": "soft", "pill": true }
            ]
          }
        ]
      }
    ]
  },
  "copy_text": "...",
  "name": "tools_team_now"
}
```

사용 컴포넌트(모두 ChatKit 코어): `ListView / ListViewItem / Box / Col / Text / Title / Caption / Badge`.
Button/onClickAction 및 `status` 는 사용하지 않는다.

## copy_text (카카오톡 공유)

허용 마크다운(bold, unordered list, inline code)만 사용:

```
**Tools Team Now**

- **씨엘** 지금 아무 생각 없이 모니터를 바라보고 있다. `무념`
- **아린** 지금 조용히 커피잔을 만지작거리고 있다. `고요`
- **루카** 지금 살짝 신나서 새 아이디어를 떠올리고 있다. `신남`
- **션** 지금 집중한 척하며 할 일 목록을 정리하고 있다. `집중`
```

## 컴포넌트 경계 (모듈 함수)

`src/mcp.js` 내부:
- `createTeamStatuses(random)` → 멤버 4명의 상태 객체 배열 `[{ nickname, emoji, caption, moodLabel, moodColor }]` (이모지 유니크 배정 포함)
- `createToolsTeamNowWidget(random)` → 위 배열을 `ListView` 위젯 payload로 조립 (기존 함수명 유지 — worker/node-server가 그대로 사용)
- `buildListViewItem(status)` → `ListViewItem` 노드 조립
- `buildCopyText(statuses)` → `copy_text` 마크다운 문자열
- `toolsTeamNowTool(random)` → 기존과 동일하게 위젯 JSON을 text content로 감싸 반환

JSON-RPC 처리(`handleJsonRpcPayload` 등)와 HTTP 어댑터(`worker.js`, `node-server.js`)는 인터페이스가 그대로이므로 변경하지 않는다.

## OpenAPI (`src/openapi.js` → `openapi.json`)

- 응답 스키마의 `widget.type` const 를 `Card` → `ListView` 로 변경, `children` 스키마를 `ListViewItem` 배열로 완화(구조가 깊으므로 `additionalProperties: true` 로 느슨하게).
- `examples.default.value` 를 새 팀 보드 payload 예시로 교체.
- `info.description` 을 "4명 전원의 현재 상태를 보여주는" 문구로 갱신.
- `info.version` 은 `SERVER_VERSION`(0.2.0)을 따라 자동 반영.
- `npm run openapi:write` 로 `openapi.json` 재생성.

## 문서

- `README.md`: 도구 설명을 "4명 전원의 지금 상태를 ListView 보드로" 로 갱신, Docker 태그 버전 0.2.0 반영.
- `PLAYMCP_BUILDER.md`: 설명 문구 갱신.

## 버전

- `src/mcp.js` `SERVER_VERSION` `0.1.1` → `0.2.0`
- `package.json` `version` `0.1.1` → `0.2.0`
- `openapi.json` 은 재생성으로 자동 반영

## 테스트 (`test/mcp.test.js`)

기존 `Card`/`Text` 결합 assertion 을 새 구조로 교체:
- `tools_team_now` payload: `widget.type === "ListView"`, `children.length === 4`, 각 item `type === "ListViewItem"`, `widget` 에 `status` 없음.
- 멤버 순서: children의 Title value가 `["씨엘","아린","루카","션"]` 순.
- `random = () => 0` 로 결정적 검증: 모든 멤버 caption `"지금 아무 생각 없이 모니터를 바라보고 있다."`, Badge label `"무념"`; 이모지는 풀 앞에서부터 유니크 배정되어 4개가 서로 다름.
- `copy_text` 는 4명 이름을 모두 포함하고 각 mood label 을 포함.
- `initialize` / `tools/list` / notifications / worker 어댑터 테스트는 유지(도구 메타데이터·프로토콜 불변).
- OpenAPI 테스트: `operationId` 유지, 필요 시 `widget.type` const 변경 반영.

## 비목표 (YAGNI)

- 입력 인자(닉네임/기분 지정) 추가 없음
- Button/링크/onClickAction 없음
- 이미지/아이콘 컴포넌트 없음 (호스팅 자산 불필요)
- 실제 시간대/외부 데이터 연동 없음 (순수 랜덤 테스트 서버 유지)

## 리스크

- Kakao 렌더러가 ChatKit 전체 컴포넌트를 지원하는지: 가이드는 `Card/ListView/Text/Button` 만 명시적으로 예시. 본 설계의 `Box/Col/Title/Caption/Badge` 는 ChatKit 코어이며 카카오가 "스펙 동일" 이라 밝혔으나, Preview에서 실제 렌더 확인이 필요. 미지원 시 fallback으로 각 item을 단일 `Text` 로 단순화하는 안을 예비로 둔다.
