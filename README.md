# Scenario Editor

AI가 코드를 작성하고 스스로 검증하는 루프를 완성하기 위한 **로컬 실행 기반 시나리오 편집기 + MCP 서버**.

## 해결하는 문제

1. **Human Layer** — AI가 만든 코드를 사람이 매번 눈으로 확인해야 함
2. **사이드이펙트** — AI가 본인 코드의 파생 영향을 검증하지 못함
3. **요구사항 대조 불가** — AI가 실제 화면/동작을 요구사항과 스스로 비교하지 못함

## 동작 방식

```
설계서(YAML) → diff 추출 → AI 작업 지시서
                                 ↓
               Claude CLI → 코드 구현
                                 ↓
               Playwright → 앱 실행 + 캡처
                                 ↓
               diff-engine → 불일치 로그 (7레이어)
                                 ↓
               Claude CLI → 로그 수신 → 코드 수정
                                 ↓
                            반복 (수렴까지)
                                 ↓
                     editor-ui → 사람이 컨펌/거절
```

## 패키지 구조

| 패키지 | 역할 |
|---|---|
| `packages/spec-store` | YAML 설계서 버전 관리 + diff 추출 |
| `packages/scenario-engine` | Playwright 기반 시나리오 실행 + DOM/스크린샷/스타일/이벤트/성능 캡처 + Docker 격리 |
| `packages/diff-engine` | 7레이어 비교 (visual, layout, nodetree, style, event, assertion, spec) |
| `packages/mcp-server` | Claude CLI 접속점 (12개 MCP 툴) |
| `packages/editor-ui` | Figma-style 웹 에디터 (Zustand + Canvas 타임라인 + 3-column 패널) |

## 요구사항

- Node.js >= 20
- pnpm >= 8
- Playwright Chromium (자동 설치)
- Docker (선택 — 격리 환경 사용 시)

## 설치

```bash
git clone https://github.com/novaprospectCAU/Cham.git ~/scenario-editor
cd ~/scenario-editor
pnpm install
pnpm build
pnpm --filter scenario-engine exec playwright install chromium
```

---

## 프로젝트에서 사용하기

### 1. 대상 프로젝트에 폴더 생성

```
my-project/
├── (기존 프로젝트 코드)
├── specs/
│   └── current/
│       ├── pages.yaml
│       ├── api.yaml
│       ├── performance.yaml
│       └── tolerances.yaml
├── scenarios/
│   └── *.scenario.yaml
└── results/              # 자동 생성
```

### 2. Claude CLI에 MCP 등록

`my-project/.claude/settings.local.json`:

```json
{
  "mcpServers": {
    "scenario-editor": {
      "command": "node",
      "args": ["/path/to/scenario-editor/packages/mcp-server/dist/index.js"],
      "cwd": "/path/to/my-project"
    }
  }
}
```

`cwd`를 대상 프로젝트로 설정하는 것이 핵심. MCP 서버가 `my-project/specs/`, `my-project/scenarios/`, `my-project/results/`를 읽고 씁니다.

### 3. 설계서 작성 (Spec First)

```yaml
# my-project/specs/current/pages.yaml
pages:
  login:
    components: [EmailField, PasswordField, LoginButton]
    assertions:
      - condition: "LoginButton.disabled == true when fields empty"
```

```yaml
# my-project/specs/current/tolerances.yaml
tolerances:
  layout_px: 2
  timing_ms: 50
  color_delta: 5
  fps_min: 55
```

### 4. 시나리오 작성

```yaml
# my-project/scenarios/login_flow.scenario.yaml
name: 로그인 플로우
description: 로그인 페이지 기본 동작 검증
target_url: http://localhost:3000/login

steps:
  - action: navigate
    url: http://localhost:3000/login
    anchor: "PageLoad"

  - action: type
    selector: "input[name='email']"
    value: "test@example.com"

  - action: click
    selector: "button[type='submit']"
    anchor: "LoginClick"

  - action: wait
    ms: 2000

anchors:
  - name: "PageLoad"
    captures:
      - offset_ms: 0
        capture: [dom, screenshot]

  - name: "LoginClick"
    captures:
      - offset_ms: 0
        capture: [dom, screenshot]
      - offset_ms: 500
        capture: [dom, screenshot]

assertions:
  - anchor: "PageLoad"
    offset_ms: 0
    type: selector_visible
    selector: "input[name='email']"
    expected: true
```

#### 시나리오 YAML 형식

| 필드 | 설명 |
|---|---|
| `steps[].action` | `navigate`, `click`, `type`, `wait`, `scroll` |
| `steps[].selector` | CSS 셀렉터 (click, type용) |
| `steps[].anchor` | 이 step을 캡처 앵커로 지정 |
| `steps[].scroll_y` | 스크롤 Y 픽셀 (scroll용) |
| `anchors[].captures` | 앵커 시점 기준 offset별 캡처 (dom, screenshot) |
| `assertions[].type` | `selector_visible`, `selector_text`, `url_match` |
| `docker` | Docker 격리 설정 (선택) — `image`, `port`, `health_check` |

#### Docker 격리 (선택)

```yaml
# 대상 앱을 Docker로 실행
docker:
  image: "my-app:latest"
  port: 3000
  health_check: "/health"
  health_timeout: 30000
```

### 5. Claude CLI에서 사용

```bash
# 대상 앱 실행 (별도 터미널, Docker 미사용 시)
cd my-project && npm run dev

# Claude CLI 새 세션에서
cd my-project

# 시나리오 실행 → baseline 설정 → 수정 후 재실행 → diff 확인
mcp__scenario-editor__run_scenario({ id: "login_flow" })
mcp__scenario-editor__set_baseline({ scenario_id: "login_flow" })
mcp__scenario-editor__run_scenario({ id: "login_flow" })
mcp__scenario-editor__get_diff_log({ scenario_id: "login_flow" })
mcp__scenario-editor__get_coverage()
```

### 6. 웹 UI에서 결과 확인

```bash
cd ~/scenario-editor/packages/editor-ui
SCENARIO_EDITOR_ROOT=/path/to/my-project pnpm dev
# 브라우저에서 http://localhost:5173 접속
```

#### Editor UI 기능

- **3-column 레이아웃**: 시나리오 목록 / 뷰포트+타임라인 / 탭 패널
- **Canvas 타임라인**: 캡처 트랙 + assertion 트랙 + playhead + 클릭-to-seek
- **Viewport**: Actual/Baseline/Diff/Overlay 4모드 + 줌/팬 + 자동 재생
- **Overlay**: baseline difference blend + 투명도 슬라이더
- **Inspector**: DOM 트리 + 노드 호버→스크린샷 rect 하이라이트 + computed styles
- **Diff Log**: severity 색상 + AI Action 지시서
- **StatusBar**: 커버리지 바 + Confirm/Reject

#### 키보드 단축키

| 키 | 동작 |
|---|---|
| Space | 재생/정지 |
| ← / → | 이전/다음 프레임 |
| Home / End | 첫/마지막 프레임 |
| 1 / 2 / 3 | Diff Log / Inspector / Assertions 탭 |
| Ctrl+↑/↓ | 시나리오 목록 탐색 |
| Ctrl+Enter | 컨펌 |
| Escape | 재생 정지 |

---

## MCP 툴 목록

### 설계서 관리
| 툴 | 설명 |
|---|---|
| `get_current_spec()` | 전체 설계서 읽기 + 스키마 검증 |
| `get_spec_diff(from, to)` | 두 버전 간 diff (변경사항 + AI 지시서) |
| `save_spec_version(version)` | 현재 설계서 스냅샷 저장 |
| `list_spec_versions()` | 저장된 버전 목록 |
| `validate_specs()` | 스키마 유효성 검증 |

### 시나리오 실행
| 툴 | 설명 |
|---|---|
| `get_scenarios()` | 시나리오 목록 + 최근 실행 상태 |
| `run_scenario(id)` | 시나리오 실행 (Playwright, Docker 옵션) |
| `get_scenario_result(id)` | 최신 실행 결과 조회 |

### 불일치 탐지
| 툴 | 설명 |
|---|---|
| `set_baseline(scenario_id)` | 현재 결과를 baseline으로 설정 |
| `get_diff_log(scenario_id, severity?)` | 7레이어 비교 + 불일치 로그 |
| `get_latest_diff_log(scenario_id?)` | 최신 diff 로그 조회 |
| `get_coverage()` | 전체 커버리지 리포트 |

---

## Diff Engine 비교 레이어 (7개)

| 레이어 | 비교 대상 | 허용 오차 |
|---|---|---|
| Visual | pixelmatch 픽셀 비교 | >5% high, >1% medium |
| Layout | DOM rect x/y/width/height | tolerances.layout_px |
| NodeTree | DOM 트리 구조 (추가/제거/변경) | — |
| Style | computed style (color, font 등) | tolerances.color_delta |
| Event | 이벤트 시퀀스 + 타이밍 | tolerances.timing_ms |
| Assertion | baseline 대비 assertion 회귀 | — |
| Spec | specs/current/pages.yaml 자동 검증 | — |

---

## 캡처 항목

시나리오 실행 시 각 앵커 시점에서 수집하는 데이터:

| 항목 | 설명 |
|---|---|
| `screenshot` | viewport PNG 이미지 |
| `dom_tree` | DOM 구조 (tag, id, classes, rect, textContent, attributes) |
| `computed_styles` | 주요 요소의 CSS computed style (13개 속성) |
| `event_log` | 브라우저 이벤트 (click, input, change, submit, focus, blur) |
| `performance` | memory_mb, render_time_ms |

---

## 결과 폴더 구조

```
results/
├── latest/{scenario_id}/        # 최신 실행 결과
│   ├── result.json
│   └── screenshots/*.png
├── baselines/{scenario_id}/     # baseline (정답)
│   ├── result.json
│   └── screenshots/*.png
├── diffs/{scenario_id}/         # diff 로그
│   ├── diff_log.json
│   └── diff_images/*.png
└── history/{scenario_id}/       # 실행 히스토리
```

`.gitignore`에 `results/`를 추가하는 것을 권장합니다.

---

## 자기 검증

scenario-editor 자체를 수정한 경우:

```bash
./scripts/self-verify.sh
```

2-pass 검증: 실행 → baseline 설정 → 재실행 → diff 0 확인

## 라이선스

MIT
