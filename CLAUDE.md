
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
├── Editor UI           ← 사람이 보는 화면 (React + Vite)
│
└── 검증 대상 앱         ← 로컬 또는 Docker 격리 환경
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
                                         Editor UI → 사람에게 컨펌 요청
```

---

## 컴포넌트 상세

### 1. MCP Server (`packages/mcp-server`)

Claude CLI가 편집기에 접근하는 유일한 진입점.

**스택:** Node.js + TypeScript + `@modelcontextprotocol/sdk`

**노출 툴 (12개):**

```typescript
// 설계서 (5개)
get_current_spec()                           // 전체 설계서 읽기 + 검증 결과
get_spec_diff({ from: string, to: string })  // 버전 간 diff + AI 작업 지시서
save_spec_version({ version: string })       // 현재 설계서 스냅샷 저장
list_spec_versions()                         // 저장된 버전 목록
validate_specs()                             // 스키마 검증

// 시나리오 (3개)
get_scenarios()                              // 전체 시나리오 목록
run_scenario({ id: string })                 // 특정 시나리오 실행 (Playwright)
get_scenario_result({ id: string })          // 실행 결과 조회

// 불일치 (4개)
set_baseline({ scenario_id: string })        // 현재 결과를 baseline으로 저장
get_diff_log({ scenario_id: string })        // baseline vs 최신 결과 diff
get_latest_diff_log()                        // 가장 최근 실행의 diff
get_coverage()                               // 전체 커버리지 리포트
```

---

### 2. Spec Store (`packages/spec-store`)

설계서를 git처럼 버전 관리. diff가 곧 AI 작업 지시서가 된다.

**스택:** TypeScript + YAML (`js-yaml`) + Zod

**설계서 파일:**

| 파일 | 용도 | Zod 검증 |
|---|---|---|
| `pages.yaml` | 페이지별 컴포넌트, 플로우, assertion | ✅ |
| `api.yaml` | API 엔드포인트 명세 | ✅ |
| `tolerances.yaml` | 허용 오차 (layout_px, timing_ms, color_delta) | ✅ |
| `*.yaml` (커스텀) | 자유 형식 — 검증 건너뛰고 그대로 읽힘 | — |

**diff 출력:**

```json
{
  "from": "v1", "to": "v2",
  "changes": [
    { "type": "add", "path": "pages.login.components", "value": "SocialLogin" }
  ],
  "affected_modules": ["auth_module"],
  "ai_instructions": "SocialLogin 컴포넌트 추가, OAuth 리다이렉트 플로우 구현"
}
```

---

### 3. Scenario Engine (`packages/scenario-engine`)

Playwright로 실제 앱을 헤드리스 실행하고 각 이벤트 시점에 스냅샷을 찍는다.

**스택:** TypeScript + Playwright

**지원 액션:**

| 액션 | 설명 |
|---|---|
| `navigate` | URL 이동 |
| `click` | 요소 클릭 |
| `type` | 텍스트 입력 |
| `wait` | 지정 시간 대기 |
| `scroll` | 스크롤 (가상화 리스트 검증용) |

**핵심 개념 — Event Anchor:**

프레임 번호가 아닌 **이벤트를 기준점(anchor)으로 정렬**한다.

```yaml
anchors:
  - name: "LoginClick"
    captures:
      - offset_ms: 0
        capture: [dom, screenshot]
      - offset_ms: 500
        capture: [dom, screenshot]
```

**캡처 항목:**

```typescript
interface FrameCapture {
  timestamp_ms: number
  anchor_offset_ms: number
  screenshot: Buffer              // 픽셀 이미지 (PNG)
  dom_tree: DOMNode[]             // 컴포넌트 노드 트리 + rect + text
  computed_styles: StyleMap       // getComputedStyle() 결과
  event_log: BrowserEvent[]       // 브라우저 이벤트 로그
  performance: {
    fps: number
    memory_mb: number
    render_time_ms: number
  }
}
```

**Docker 격리:**

```typescript
// docker.ts — 대상 앱을 컨테이너에서 실행
const container = await startContainer({
  image: "my-app:latest",
  port: 3000,
  healthCheck: "http://localhost:3000/health"
});
```

---

### 4. Diff Engine (`packages/diff-engine`)

기대값과 실제값을 7개 레이어에서 비교하고 구조화된 로그를 생성한다.

**스택:** TypeScript + `pixelmatch`

**비교 레이어 (7개):**

| # | 레이어 | 파일 | 설명 |
|---|---|---|---|
| 1 | **Visual** | `visual.ts` | pixelmatch 픽셀 diff |
| 2 | **Layout** | `layout.ts` | DOM rect 위치/크기 비교 (`layout_px` 허용 오차) |
| 3 | **NodeTree** | `nodetree.ts` | DOM 트리 구조 diff (추가/제거/변경) |
| 4 | **Style** | `style.ts` | computed style 비교 (`color_delta` 허용 오차) |
| 5 | **Event** | `events.ts` | 이벤트 시퀀스/타이밍 비교 (`timing_ms` 허용 오차) |
| 6 | **Assertion** | `assertions.ts` | assertion 회귀 감지 (baseline 대비) |
| 7 | **Spec** | `specChecker.ts` | specs/current/pages.yaml 기반 컴포넌트/조건 자동 검증 |

**비교 방식:**
- **Baseline 비교**: 이전 실행 결과(baseline) vs 최신 실행 → 회귀 감지
- **설계서 비교**: specs/current/pages.yaml의 assertion → 자동 검증

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
      "layer": "layout",
      "component": "LoginButton",
      "expected": { "x": 160, "width": 320 },
      "actual":   { "x": 140, "width": 280 },
      "severity": "high"
    }
  ],
  "performance": {
    "violations": [
      { "metric": "fps", "expected": 60, "actual": 42, "severity": "medium" }
    ]
  },
  "ai_action": "mismatch-001 수정 후 재실행 요청"
}
```

**허용 오차 설정 (`specs/current/tolerances.yaml`):**

```yaml
tolerances:
  layout_px: 4
  timing_ms: 100
  color_delta: 5
  fps_min: 55
```

---

### 5. Editor UI (`packages/editor-ui`)

사람이 시나리오를 보고 컨펌하는 화면. AI는 이 화면을 사용하지 않는다.

**스택:** React + Vite + TypeScript + Zustand + Express API

**화면 구성 (3-column 레이아웃):**

```
┌─────────────────────────────────────────────────────────────────┐
│  [Canvas Timeline]  ▸ 눈금자 + playhead + 앵커 마커            │
│  ├── Capture Track    ●────●────●────●──                        │
│  └── Assert Track     ✅────✅────❌────✅──                     │
├──────────┬──────────────────────┬───────────────────────────────┤
│ Scenario │    [Viewport]        │  [Right Panel]                │
│ List     │                      │                               │
│          │  4가지 모드:          │  Tab 1: Diff Log              │
│ ▶ task_  │  · Actual            │  Tab 2: Inspector             │
│   crud   │  · Baseline          │    ├── DOM Tree               │
│ ▶ empty_ │  · Diff (pixelmatch) │    ├── Layout (rect)          │
│   state  │  · Overlay (blend)   │    ├── Computed Style         │
│ ▶ task_  │                      │    └── rect 하이라이트         │
│   filter │  줌/팬 + 타임코드    │  Tab 3: Assertions            │
│          │  자동 재생            │                               │
├──────────┴──────────────────────┴───────────────────────────────┤
│  [Coverage]  3/6 scenarios  ██████░░░░  50%                    │
│  [Actions]   ✅ Confirm   ✗ Reject   💬 Comment                │
└─────────────────────────────────────────────────────────────────┘
```

**키보드 단축키:**

| 키 | 동작 |
|---|---|
| Space | 재생/정지 |
| ← / → | 이전/다음 프레임 |
| Home / End | 첫/마지막 프레임 |
| 1 / 2 / 3 | Diff Log / Inspector / Assertions 탭 |
| Ctrl+↑/↓ | 시나리오 목록 탐색 |
| Ctrl+Enter | 컨펌 |
| Escape | 재생 정지 |

**AI와 사람의 역할 분리:**

| 기능 | 사람 | AI (MCP) |
|---|---|---|
| Viewport (Overlay/Diff 비교) | ✅ 사용 | ❌ 불필요 |
| 불일치 로그 JSON | 참고용 | ✅ 필수 |
| Inspector (DOM/Style) | 참고용 | ✅ 필수 |
| 컨펌/거절 | ✅ 전용 | ❌ 불가 |

---

## 폴더 구조

```
Cham/
├── CLAUDE.md                    # 이 파일
├── README.md                    # 사용법 가이드
├── package.json                 # monorepo root (turborepo)
├── turbo.json
├── pnpm-workspace.yaml
│
├── packages/
│   ├── mcp-server/              # Claude CLI 접속점
│   │   └── src/
│   │       ├── index.ts         # MCP 서버 진입점 (12개 툴 등록)
│   │       └── tools/
│   │           ├── scenarios.ts # get_scenarios, run_scenario, get_scenario_result
│   │           ├── diff.ts      # set_baseline, get_diff_log, get_latest_diff_log
│   │           └── spec.ts      # get_current_spec, get_spec_diff, save/list/validate
│   │
│   ├── spec-store/              # 설계서 버전 관리
│   │   └── src/
│   │       ├── store.ts         # YAML 읽기/쓰기, 스냅샷 저장
│   │       ├── differ.ts        # deep diff + AI 작업 지시서 생성
│   │       └── validator.ts     # Zod 스키마 검증
│   │
│   ├── scenario-engine/         # 실제 앱 실행 + 캡처
│   │   └── src/
│   │       ├── runner.ts        # Playwright 실행 (navigate/click/type/wait/scroll)
│   │       ├── capture.ts       # DOM + 스크린샷 + 스타일 + 이벤트 + 성능 캡처
│   │       ├── anchor.ts        # 이벤트 기준 정렬
│   │       ├── docker.ts        # Docker 격리 환경 관리
│   │       └── schemas.ts       # 시나리오 YAML 스키마
│   │
│   ├── diff-engine/             # 불일치 탐지 (7레이어)
│   │   └── src/
│   │       ├── engine.ts        # 오케스트레이터 (전 레이어 실행)
│   │       ├── visual.ts        # 픽셀 diff (pixelmatch)
│   │       ├── layout.ts        # rect 비교
│   │       ├── nodetree.ts      # DOM 트리 diff
│   │       ├── style.ts         # computed style 비교
│   │       ├── events.ts        # 이벤트 시퀀스 비교
│   │       ├── assertions.ts    # assertion 회귀 감지
│   │       ├── specChecker.ts   # 설계서 기반 자동 검증
│   │       └── reporter.ts      # 불일치 로그 JSON 생성
│   │
│   └── editor-ui/               # React 웹 UI
│       └── src/
│           ├── App.tsx           # 메인 앱 (3-column 레이아웃)
│           ├── store/
│           │   └── editorStore.ts # Zustand 스토어
│           └── components/
│               ├── ScenarioList.tsx    # 시나리오 목록
│               ├── CanvasTimeline.tsx  # Canvas2D 타임라인
│               ├── Viewport.tsx        # 스크린샷 뷰어 (4모드 + 줌/팬)
│               ├── Inspector.tsx       # DOM 트리 + rect 하이라이트
│               ├── DiffLogViewer.tsx   # 불일치 로그 뷰어
│               ├── AssertionList.tsx   # assertion 결과
│               └── TabPanel.tsx        # 우측 패널 탭
│
├── app/                         # 예제 앱 (할일 관리)
│   └── src/
│       ├── server/index.ts      # Express API (인메모리 스토어)
│       ├── pages/               # React 5페이지 (Login, Dashboard, TaskList, TaskDetail, TaskCreate)
│       └── components/NavBar.tsx
│
├── specs/                       # 설계서 파일
│   ├── current/                 # 현재 설계서
│   │   ├── pages.yaml
│   │   ├── api.yaml
│   │   └── tolerances.yaml
│   └── history/                 # 버전 스냅샷
│
├── scenarios/                   # 시나리오 정의
│   ├── task_crud_flow.scenario.yaml      # 할일 CRUD 전체 플로우
│   ├── empty_state_flow.scenario.yaml    # 빈 상태 검증
│   ├── task_filter_flow.scenario.yaml    # 필터 전환 검증
│   ├── editor_scenario_list.scenario.yaml # 편집기 자기 검증
│   ├── editor_diff_viewer.scenario.yaml   # 편집기 자기 검증
│   └── editor_confirm_flow.scenario.yaml  # 편집기 자기 검증
│
├── results/                     # 실행 결과 (자동 생성, .gitignore)
│   ├── latest/
│   ├── baselines/
│   └── diffs/
│
└── scripts/
    └── self-verify.sh           # 편집기 자기 검증 (2-pass)
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

## 사용법

### 1. 설치

```bash
git clone https://github.com/novaprospectCAU/Cham.git
cd Cham
pnpm install
pnpm build
npx playwright install chromium
```

### 2. MCP 등록

프로젝트 `.claude/settings.local.json`:
```json
{
  "mcpServers": {
    "scenario-editor": {
      "command": "node",
      "args": ["/path/to/Cham/packages/mcp-server/dist/index.js"],
      "cwd": "/path/to/your-project"
    }
  }
}
```

`cwd`를 **대상 프로젝트**로 설정하면 해당 프로젝트의 `specs/`, `scenarios/`, `results/`를 읽고 씁니다.

### 3. 기획서 작성

```yaml
# your-project/specs/current/pages.yaml
pages:
  login:
    components: [EmailField, PasswordField, LoginButton]
    assertions:
      - condition: "LoginButton.visible == true"
```

### 4. 시나리오 작성

```yaml
# your-project/scenarios/login_flow.scenario.yaml
name: 로그인 플로우
target_url: http://localhost:3000/login
steps:
  - action: navigate
    url: http://localhost:3000/login
    anchor: "PageLoad"
  - action: click
    selector: "[data-testid='login-button']"
    anchor: "LoginClick"
anchors:
  - name: "LoginClick"
    captures:
      - offset_ms: 0
        capture: [dom, screenshot]
assertions:
  - anchor: "LoginClick"
    type: selector_visible
    selector: "[data-testid='login-button']"
    expected: true
```

### 5. Claude CLI에서 사용

```bash
# 대상 앱 실행 (별도 터미널)
cd your-project && npm run dev

# Claude CLI에서
mcp__scenario-editor__run_scenario({ id: "login_flow" })
mcp__scenario-editor__set_baseline({ scenario_id: "login_flow" })
# 코드 수정 후
mcp__scenario-editor__run_scenario({ id: "login_flow" })
mcp__scenario-editor__get_diff_log({ scenario_id: "login_flow" })
```

### 6. Editor UI에서 결과 확인

```bash
cd Cham/packages/editor-ui && pnpm dev
# → http://localhost:5180
```

---

## Claude CLI 작업 흐름

```
# Claude가 코드 수정 후 검증하는 패턴
1. get_current_spec()                          → 기획서 읽기
2. 코드 구현
3. run_scenario("task_crud_flow")              → 실행 + 캡처
4. set_baseline({ scenario_id: "task_crud_flow" }) → baseline 저장
5. 코드 수정
6. run_scenario("task_crud_flow")              → 재실행
7. get_diff_log({ scenario_id: "task_crud_flow" }) → 불일치 확인
8. mismatches > 0 → 코드 수정 → 6번으로
9. mismatches == 0 → get_coverage()            → 커버리지 확인
10. 전체 통과 → 사람에게 컨펌 요청
```

---

## 자기 검증 워크플로우

### 자동 (권장)
```bash
./scripts/self-verify.sh
```
2-pass 검증: 실행 → baseline 설정 → 재실행 → diff 0 확인

### 자기 검증 시나리오
| 시나리오 | 검증 내용 |
|---|---|
| `editor_scenario_list` | UI 로드, 시나리오 목록 렌더링, 선택 동작 |
| `editor_diff_viewer` | 스크린샷/Diff Log/Assertions 표시 |
| `editor_confirm_flow` | Confirm/Reject 버튼 표시 |

---

## 완료 상태

### 백엔드 (Phase 1-3, 5-7, 9)
| Phase | 내용 | 상태 |
|---|---|---|
| 1 | spec-store + mcp-server 뼈대 (5개 MCP 툴) | ✅ Done |
| 2 | scenario-engine — Playwright 실행 + DOM/스크린샷 캡처 | ✅ Done |
| 3 | diff-engine — 4레이어 불일치 탐지 + baseline 비교 | ✅ Done |
| 5 | 자기 검증 루프 — 2-pass self-verify.sh | ✅ Done |
| 6 | 캡처 확장 — computed style, event log, performance 메트릭, scroll 액션 | ✅ Done |
| 7 | diff-engine 7레이어 완성 — style, event, spec 레이어 + 성능 위반 감지 | ✅ Done |
| 9 | Docker 격리 + 설계서 기반 비교 (specs/current/ assertion 자동 검증) | ✅ Done |

### 프론트엔드 (Phase 4, 8, A-E)
| Phase | 내용 | 상태 |
|---|---|---|
| 4 | editor-ui MVP — React + Vite + Express API | ✅ Done |
| 8 | UI 고도화 v1 — OverlayPlayer, Inspector, Timeline 컴포넌트 | ✅ Done |
| A | 아키텍처 리빌드 — Zustand 스토어 + 테마 시스템 + 3-column 패널 레이아웃 | ✅ Done |
| B | Canvas 타임라인 — Canvas2D 렌더링, 눈금자, playhead, hitTest | ✅ Done |
| C | Viewport 고도화 — 자동 재생, Overlay difference blend, 줌/팬, 타임코드 | ✅ Done |
| D | Inspector 고도화 — DOM 노드 호버→rect 하이라이트, 상세 속성 패널 | ✅ Done |
| E | 키보드 단축키 12개 (Space, 화살표, Home/End, 1/2/3, Ctrl+Enter 등) | ✅ Done |

### 예제 앱
| 항목 | 내용 | 상태 |
|---|---|---|
| 할일 앱 | Express API + React 5페이지 (Login, Dashboard, TaskList, TaskDetail, TaskCreate) | ✅ Done |
| 기획서 | pages.yaml (5페이지), api.yaml (7 API), tolerances.yaml | ✅ Done |
| 시나리오 | task_crud_flow, empty_state_flow, task_filter_flow | ✅ Done |

### MCP 툴 (12개)
| 카테고리 | 툴 |
|---|---|
| 설계서 (5) | `get_current_spec`, `get_spec_diff`, `save_spec_version`, `list_spec_versions`, `validate_specs` |
| 시나리오 (3) | `get_scenarios`, `run_scenario`, `get_scenario_result` |
| 불일치 (4) | `set_baseline`, `get_diff_log`, `get_latest_diff_log`, `get_coverage` |

### Diff Engine 비교 레이어 (7개)
1. **Visual** — pixelmatch 픽셀 비교
2. **Layout** — DOM rect 위치/크기 비교 (`layout_px` 허용 오차)
3. **NodeTree** — DOM 트리 구조 diff (추가/제거/변경)
4. **Style** — computed style 비교 (`color_delta` 허용 오차)
5. **Event** — 이벤트 시퀀스/타이밍 비교 (`timing_ms` 허용 오차)
6. **Assertion** — assertion 회귀 감지 (baseline 대비)
7. **Spec** — specs/current/pages.yaml 기반 컴포넌트/조건 자동 검증

---

## 환경 설정

```bash
# 요구사항
Node.js >= 20
pnpm >= 8
Docker (격리 환경용, 선택)
Playwright (pnpm install 시 자동 설치)

# 설치
pnpm install
pnpm build

# Playwright 브라우저
npx playwright install chromium

# MCP 서버 빌드
pnpm --filter mcp-server build

# Editor UI 개발 서버
pnpm --filter editor-ui dev

# 예제 앱 실행
pnpm --filter todo-app dev
```

---

## 향후 확장 가능 영역

| 항목 | 설명 |
|---|---|
| 단위 테스트 | 각 패키지 vitest 테스트 |
| CI/CD | GitHub Actions (빌드 + self-verify) |
| Electron 래핑 | editor-ui를 데스크톱 앱으로 |
| 시나리오 자동 생성 | 기획서에서 시나리오 YAML을 AI가 자동 생성 |
| i18n | 한/영 전환 |
