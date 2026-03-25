
# Scenario Editor — CLAUDE.md

## 프로젝트 개요

AI가 코드를 작성하고 스스로 검증하는 루프를 완성하기 위한 **로컬 실행 기반 시나리오 편집기 + MCP 서버**다.

### 해결하는 문제

현재 AI 개발의 3가지 병목:
1. **Human Layer** — AI가 만든 코드를 사람이 매번 눈으로 확인해야 함
2. **사이드이펙트** — AI가 본인 코드의 파생 영향을 검증하지 못함
3. **요구사항 대조 불가** — AI가 실제 화면/동작을 요구사항과 스스로 비교하지 못함

### 핵심 아이디어

비디오 편집기처럼 생긴 타임라인 UI로 **유저 시나리오를 명세**하고, 실제 앱 실행 결과와 자동 비교해서 불일치 로그를 생성한다. Claude CLI(MCP)가 이 로그를 받아 스스로 수정 루프를 돈다.

### 목표

> 기획서 작성 / 디자인·애셋 추가 / 최종 컨펌을 제외한 모든 개발·검증 과정을 자동화한다.

---

## 전체 아키텍처

```
로컬 머신
├── Claude CLI (터미널)
│       ↕ MCP 연결 (로컬 소켓)
├── MCP Server          ← Claude CLI의 유일한 접속점
│       ↕
├── Spec Store          ← 설계서 버전 관리 (git diff 방식)
├── Scenario Engine     ← 실제 앱 실행 + 캡처 (Playwright)
├── Diff Engine         ← 기대값 vs 실제값 다층 비교
│       ↕
├── Editor UI           ← 사람이 보는 화면 (Electron + React)
│
└── 검증 대상 앱         ← Docker 격리 환경
```

### 데이터 흐름

```
설계서(YAML) → Spec Store → diff 추출 → AI 작업 지시서
                                              ↓
                            Claude CLI → 코드 구현
                                              ↓
                            Scenario Engine → 실제 앱 실행 + 캡처
                                              ↓
                            Diff Engine → 불일치 로그 JSON
                                              ↓
                            Claude CLI → 로그 수신 → 코드 수정
                                              ↓
                                         반복 (수렴까지)
                                              ↓
                                         사람에게 컨펌 요청
```

---

## 컴포넌트 상세

### 1. MCP Server (`packages/mcp-server`)

Claude CLI가 편집기에 접근하는 유일한 진입점.

**스택:** Node.js + TypeScript + `@anthropic-ai/mcp-sdk`

**노출 툴:**

```typescript
// 시나리오
get_scenarios()                    // 전체 시나리오 목록
run_scenario(id: string)           // 특정 시나리오 실행
get_scenario_result(id: string)    // 실행 결과 조회

// 불일치 로그
get_diff_log(severity?: "high" | "medium" | "low")
get_latest_diff_log()

// 커버리지
get_coverage()                     // 전체 커버리지 리포트
get_uncovered_branches()           // 미커버 분기 목록

// 트랙 관리
add_track(scenario: ScenarioDefinition)
update_track(id: string, scenario: ScenarioDefinition)

// 설계서
get_spec_diff(v1: string, v2: string)  // 버전 간 diff
get_current_spec()
```

---

### 2. Spec Store (`packages/spec-store`)

설계서를 git처럼 버전 관리. diff가 곧 AI 작업 지시서가 된다.

**스택:** TypeScript + 로컬 파일시스템 + YAML

**설계서 구조:**

```yaml
# specs/current/pages.yaml
pages:
  login:
    components: [EmailField, PasswordField, LoginButton]
    flows:
      - trigger: LoginButton.click
        conditions:
          - both_fields_valid: true
        action: show LoadingOverlay
      - trigger: LoginButton.click
        conditions:
          - both_fields_valid: false
        action: shake LoginButton
    assertions:
      - condition: "LoginButton.disabled == true when fields empty"
      - condition: "LoadingOverlay.visible within 1 frame after click"

# specs/current/contracts.yaml
contracts:
  auth_module → user_module:
    provides: { user_id: uuid, token: jwt }
    expects: { user_profile: { name, email, role } }

# specs/current/performance.yaml
performance:
  min_fps: 60
  max_memory_mb: 200
  max_render_time_ms: 16

# specs/current/api.yaml
api:
  POST /login:
    input: { email: string, password: string }
    expected:
      status: 200
      response: { token: jwt, user_id: uuid }
      response_time_ms: "< 200"
      db_state: { sessions: "+1 row" }
  POST /login (fail):
    input: { email: string, password: "wrong" }
    expected:
      status: 401
      response: { error: "INVALID_CREDENTIALS" }
```

**diff 출력 예시:**

```json
{
  "from": "v1",
  "to": "v2",
  "changes": [
    { "type": "add", "path": "pages.login.components", "value": "SocialLogin" },
    { "type": "add", "path": "pages.login.flows", "value": { "trigger": "SocialLogin.click", "action": "redirect OAuth" } }
  ],
  "affected_modules": ["auth_module"],
  "ai_instructions": "SocialLogin 컴포넌트 추가, OAuth 리다이렉트 플로우 구현"
}
```

---

### 3. Scenario Engine (`packages/scenario-engine`)

Playwright로 실제 앱을 헤드리스 실행하고 각 이벤트 시점에 스냅샷을 찍는다.

**스택:** TypeScript + Playwright

**핵심 개념 — Event Anchor:**

기대 시나리오와 실제 실행의 타이밍이 다를 수 있으므로, 프레임 번호가 아닌 **이벤트를 기준점(anchor)으로 정렬**한다.

```typescript
// anchor 예시
{
  anchor: "LoginButton.click",   // 이 이벤트를 t=0으로 설정
  captures: [
    { offset_ms: 0,   capture: ["dom", "layout", "style", "screenshot"] },
    { offset_ms: 100, capture: ["dom", "layout", "style", "screenshot"] },
    { offset_ms: 500, capture: ["dom", "layout", "style", "screenshot"] },
  ]
}
```

**캡처 항목:**

```typescript
interface FrameCapture {
  timestamp_ms: number
  anchor_offset_ms: number
  screenshot: Buffer          // 픽셀 이미지
  dom_tree: DOMNode[]         // 컴포넌트 노드 트리
  layout: LayoutRect[]        // 각 노드의 위치/크기
  computed_styles: StyleMap   // computed style
  event_log: BrowserEvent[]   // 발생한 이벤트 목록
  performance: {
    fps: number
    memory_mb: number
    render_time_ms: number
  }
}
```

**가상화 리스트 지원:**

```typescript
// 스크롤 위치를 트리거로 캡처
{
  trigger: { type: "scroll", position: "50%" },
  expected: {
    visible_items: 10,
    first_visible_id: 46,
    dom_node_count: { max: 50 }   // 가상화 검증
  }
}
```

---

### 4. Diff Engine (`packages/diff-engine`)

기대값과 실제값을 6개 레이어에서 비교하고 구조화된 로그를 생성한다.

**스택:** TypeScript + `pixelmatch`

**비교 레이어:**

```
1. Visual    — 픽셀 diff (pixelmatch)
2. Layout    — rect, position, spacing 수치 비교
3. NodeTree  — 컴포넌트 트리 구조 diff
4. Style     — computed style 비교 (색, 폰트, 그림자)
5. Event     — 이벤트 발생 순서/시점 비교
6. Assert    — 설계서 assertion 실행 결과
```

**불일치 로그 JSON 구조:**

```json
{
  "session_id": "build-42",
  "timestamp": "2025-03-25T00:00:00Z",
  "overall": "fail",
  "summary": { "high": 2, "medium": 1, "low": 0 },
  "mismatches": [
    {
      "id": "mismatch-001",
      "frame_ms": 1240,
      "anchor": "LoginButton.click",
      "anchor_offset_ms": 240,
      "layer": "layout",
      "component": "LoginButton",
      "path": "pages.login.LoginButton",
      "expected": { "x": 160, "width": 320 },
      "actual":   { "x": 140, "width": 280 },
      "severity": "high",
      "screenshot_diff": "diffs/mismatch-001.png"
    },
    {
      "id": "mismatch-002",
      "frame_ms": 2100,
      "anchor": "LoginButton.click",
      "anchor_offset_ms": 1100,
      "layer": "event_timing",
      "component": "LoadingOverlay",
      "expected": { "visible_within_ms": 100 },
      "actual":   { "visible_after_ms": 340 },
      "severity": "high"
    }
  ],
  "coverage": {
    "total_scenarios": 8,
    "passed": 5,
    "failed": 3,
    "uncovered_branches": ["OAuth timeout", "Empty state", "Network error"]
  },
  "performance": {
    "min_fps_recorded": 42,
    "max_memory_mb": 380,
    "violations": [
      { "metric": "fps", "expected": 60, "actual": 42, "severity": "medium" }
    ]
  },
  "ai_action": "mismatch-001, mismatch-002 수정 후 재실행 요청"
}
```

**허용 오차 설정:**

```yaml
# specs/current/tolerances.yaml
tolerances:
  layout_px: 2          # 위치 2px 이내 허용
  timing_ms: 50         # 타이밍 50ms 이내 허용
  color_delta: 5        # 색상 delta E 5 이내 허용
  fps_min: 55           # 60fps 목표, 55 이상 허용
```

---

### 5. Editor UI (`packages/editor-ui`)

사람이 시나리오를 보고 컨펌하는 화면. AI는 이 화면을 사용하지 않는다.

**스택:** Electron + React + TypeScript

**화면 구성:**

```
┌─────────────────────────────────────────────────────┐
│  [Timeline Panel]                                   │
│  ├── UI Track          ████░░░░████░░░░             │
│  ├── Event Track       ──●──────────●──             │
│  ├── Network Track     ░░░░████░░░░░░░░             │
│  ├── State Track       ────────────────             │
│  └── Assert Track      ✅  ✅  ❌  ✅              │
├─────────────────┬───────────────────────────────────┤
│  [Overlay Player│  [Inspector Panel]                │
│                 │  ├── Node Tree                    │
│  기대 50% 투명  │  ├── Layout (rect)                │
│  실제 50% 투명  │  ├── Computed Style               │
│  겹쳐서 재생   │  └── Event Log                    │
│                 │                                   │
│  ▶ 재생  ⏸ 정지│  [Diff Log Panel]                 │
│  앵커: click   │  ❌ HIGH   mismatch-001           │
│                 │  ❌ HIGH   mismatch-002           │
│                 │  ⚠️ MED    mismatch-003           │
├─────────────────┴───────────────────────────────────┤
│  [Coverage]  5/8 scenarios  ██████░░░░  62%        │
│  [Actions]   ✅ 컨펌   ✗ 거절   💬 코멘트 추가     │
└─────────────────────────────────────────────────────┘
```

**AI와 사람의 역할 분리:**

| 기능 | 사람 | AI (MCP) |
|---|---|---|
| Overlay Player | ✅ 사용 | ❌ 불필요 |
| 불일치 로그 JSON | 참고용 | ✅ 필수 |
| Node Tree Diff | 참고용 | ✅ 필수 |
| 컨펌/거절 | ✅ 전용 | ❌ 불가 |
| 트랙 추가 | ✅ 가능 | ✅ MCP 툴로 가능 |

---

## 폴더 구조

```
scenario-editor/
├── CLAUDE.md                    # 이 파일
├── package.json                 # monorepo root (turborepo)
├── turbo.json
│
├── packages/
│   ├── mcp-server/              # Claude CLI 접속점
│   │   ├── src/
│   │   │   ├── index.ts         # MCP 서버 진입점
│   │   │   ├── tools/
│   │   │   │   ├── scenarios.ts
│   │   │   │   ├── diff.ts
│   │   │   │   ├── coverage.ts
│   │   │   │   └── spec.ts
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   ├── spec-store/              # 설계서 버전 관리
│   │   ├── src/
│   │   │   ├── store.ts
│   │   │   ├── differ.ts
│   │   │   └── validator.ts     # 설계서 스키마 검증
│   │   └── package.json
│   │
│   ├── scenario-engine/         # 실제 앱 실행 + 캡처
│   │   ├── src/
│   │   │   ├── runner.ts        # Playwright 실행
│   │   │   ├── capture.ts       # 프레임 캡처
│   │   │   ├── anchor.ts        # 이벤트 기준 정렬
│   │   │   └── docker.ts        # 격리 환경 관리
│   │   └── package.json
│   │
│   ├── diff-engine/             # 불일치 탐지
│   │   ├── src/
│   │   │   ├── visual.ts        # 픽셀 diff
│   │   │   ├── layout.ts        # rect 비교
│   │   │   ├── nodetree.ts      # DOM 트리 diff
│   │   │   ├── style.ts         # computed style 비교
│   │   │   ├── events.ts        # 이벤트 시퀀스 비교
│   │   │   ├── assertions.ts    # 설계서 assertion 실행
│   │   │   └── reporter.ts      # 불일치 로그 JSON 생성
│   │   └── package.json
│   │
│   └── editor-ui/               # Electron UI
│       ├── src/
│       │   ├── main/            # Electron main process
│       │   │   └── index.ts
│       │   └── renderer/        # React UI
│       │       ├── App.tsx
│       │       ├── components/
│       │       │   ├── Timeline/
│       │       │   ├── OverlayPlayer/
│       │       │   ├── Inspector/
│       │       │   └── DiffLog/
│       │       └── index.tsx
│       └── package.json
│
├── specs/                       # 실제 설계서 파일
│   ├── current/
│   │   ├── pages.yaml
│   │   ├── flows.yaml
│   │   ├── contracts.yaml
│   │   ├── api.yaml
│   │   ├── performance.yaml
│   │   └── tolerances.yaml
│   └── history/                 # 이전 버전 보관
│
├── scenarios/                   # 시나리오 정의
│   └── *.scenario.yaml
│
└── results/                     # 실행 결과 + 불일치 로그
    ├── latest/
    └── history/
```

---

## 개발 원칙

### 1. Spec First
모든 구현보다 설계서(specs/)가 먼저 존재해야 한다. 설계서 없이 코드 먼저 작성하지 않는다.

### 2. 단방향 의존성
```
설계서 → Spec Store → Scenario Engine → Diff Engine → MCP Server
                                                           ↑
                                                       Claude CLI
```
역방향 의존성 금지.

### 3. 불일치 로그는 항상 구조화
AI가 읽는 모든 출력은 JSON이어야 한다. 자연어 오류 메시지 금지.

### 4. 모듈 격리
각 패키지는 독립적으로 테스트 가능해야 한다. 다른 패키지에 직접 의존하지 않고 인터페이스(contracts)를 통해서만 통신한다.

### 5. 자기 검증
편집기 자체 기능 추가/수정 시 편집기 자신의 설계서(`specs/`)를 업데이트하고 편집기로 검증한다.

### 6. 변경 범위 격리
설계서 diff에서 나온 변경 범위(affected_modules)만 수정한다. 전체 재구현 금지.

---

## 개발 순서

### Phase 1: 뼈대 (현재 목표)

**목표:** Claude CLI에서 설계서를 읽고 쓸 수 있는 상태

```
1. monorepo 세팅 (turborepo)
2. spec-store 패키지
   - YAML 파일 읽기/쓰기
   - 버전 간 diff 추출
   - 설계서 스키마 검증 (zod)
3. mcp-server 패키지
   - MCP 서버 기본 구조
   - get_current_spec() 툴
   - get_spec_diff() 툴
4. 검증: Claude CLI에서 specs/ 폴더 내용 읽기 가능 확인
```

**Phase 1 완료 기준:**
```bash
# Claude CLI에서 이게 동작하면 Phase 1 완료
mcp__scenario-editor__get_current_spec()
mcp__scenario-editor__get_spec_diff("v1", "v2")
```

### Phase 2: 실행

```
1. scenario-engine 패키지
   - Playwright 기반 앱 실행
   - 이벤트 anchor 정렬
   - 기본 스냅샷 캡처 (screenshot + DOM)
2. mcp-server에 추가
   - run_scenario() 툴
   - get_scenario_result() 툴
```

### Phase 3: 검증

```
1. diff-engine 패키지
   - layout diff
   - nodetree diff
   - event timing diff
   - assertion 실행
   - 불일치 로그 JSON 생성
2. mcp-server에 추가
   - get_diff_log() 툴
   - get_coverage() 툴
```

### Phase 4: UI

```
1. editor-ui 패키지
   - Electron 기본 구조
   - 타임라인 컴포넌트
   - Overlay Player
   - Inspector 패널
   - Diff Log 뷰어
   - 컨펌 요청 알림
```

### Phase 5: 자기 검증

```
1. 편집기 자신의 specs/ 작성
2. 편집기 stable 버전으로 편집기 new 버전 검증
3. 자기 검증 루프 완성
```

---

## Claude CLI 작업 흐름 예시

```
# Claude가 코드 수정 후 검증하는 패턴
1. run_scenario("login_flow")
2. get_diff_log(severity="high") 로 불일치 확인
3. 해당 컴포넌트 코드 수정
4. run_scenario("login_flow") 재실행
5. mismatches == 0 확인
6. get_coverage() 로 미커버 분기 확인
7. add_track() 으로 새 시나리오 추가
8. 전체 통과 → 사람에게 컨펌 요청
```

---

## 환경 설정

```bash
# 요구사항
Node.js >= 20
pnpm >= 8
Docker (격리 환경용)
Playwright (자동 설치됨)

# 설치
pnpm install

# MCP 서버 실행
pnpm --filter mcp-server dev

# Claude CLI에 MCP 등록 (claude_desktop_config.json)
{
  "mcpServers": {
    "scenario-editor": {
      "command": "node",
      "args": ["packages/mcp-server/dist/index.js"],
      "cwd": "/path/to/scenario-editor"
    }
  }
}
```

---

## 현재 작업 지시 (Phase 3 시작)

> Phase 1 완료: spec-store + mcp-server 뼈대 (5개 MCP 툴)
> Phase 2 완료: scenario-engine + 3개 MCP 툴 (총 8개)

다음 순서로 Phase 3을 구현한다:

### 결정사항
- **비교 레이어:** Phase 2 캡처 데이터(DOM tree + rect + screenshot)에 맞춰 4개 레이어 구현
  - Visual (pixelmatch 픽셀 비교)
  - Layout (rect 위치/크기 비교)
  - NodeTree (DOM 트리 구조 비교)
  - Assertions (assertion 회귀 감지)
- Style/Event 레이어는 캡처 확장 후 추가

### Baseline 개념
- `results/baselines/{scenario_id}/` — "정답" 결과
- `set_baseline(id)` → 현재 latest 결과를 baseline으로 복사
- `diffScenario(id)` → baseline vs latest 비교
- baseline 없으면 비교 불가 → 구조화된 에러 반환

### 구현 순서

1. `specs/current/` 업데이트 (Spec First)
2. `packages/diff-engine/` 구현
   - `types.ts` — Mismatch, DiffLog, CoverageReport
   - `visual.ts` — pixelmatch 픽셀 비교
   - `layout.ts` — rect 위치/크기 비교 (tolerances 적용)
   - `nodetree.ts` — DOM 트리 구조 diff
   - `assertions.ts` — assertion 회귀 감지
   - `reporter.ts` — 불일치 로그 JSON + ai_action 생성
   - `engine.ts` — DiffEngine 클래스
3. `packages/mcp-server/` 업데이트
   - `tools/diff.ts` — 4개 MCP 툴 (set_baseline, get_diff_log, get_latest_diff_log, get_coverage)
   - `index.ts` — DiffEngine 인스턴스 + 툴 등록
4. 빌드 + 테스트

### Phase 3 완료 기준
```bash
mcp__scenario-editor__set_baseline({ scenario_id: "simple_navigation" })
mcp__scenario-editor__run_scenario({ id: "simple_navigation" })
mcp__scenario-editor__get_diff_log({ scenario_id: "simple_navigation" })
mcp__scenario-editor__get_coverage()
```