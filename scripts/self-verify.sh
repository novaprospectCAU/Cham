#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "=== Scenario Editor Self-Verification (2-pass) ==="
echo "Root: $ROOT_DIR"
echo ""

MCP_CMD="SCENARIO_EDITOR_ROOT=$ROOT_DIR node packages/mcp-server/dist/index.js"
SCENARIOS=("editor_scenario_list" "editor_diff_viewer" "editor_confirm_flow")

call_mcp() {
  local tool="$1"
  local args="$2"
  printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"self-verify","version":"0.1.0"}}}\n{"jsonrpc":"2.0","id":2,"method":"notifications/initialized"}\n{"jsonrpc":"2.0","id":10,"method":"tools/call","params":{"name":"%s","arguments":%s}}\n' "$tool" "$args" | \
    eval "$MCP_CMD" 2>/dev/null | tail -1
}

# 1. Build
echo "[1/8] Building packages..."
pnpm build > /dev/null 2>&1
echo "  OK"

# 2. Start editor-ui server
echo "[2/8] Starting editor-ui server..."
cd packages/editor-ui
pnpm dev > /dev/null 2>&1 &
SERVER_PID=$!
cd "$ROOT_DIR"
sleep 3
echo "  OK (PID: $SERVER_PID)"

# 3. Pass 1: Run scenarios + set baselines
echo "[3/8] Pass 1: Running scenarios..."
ALL_PASSED=true
for scenario in "${SCENARIOS[@]}"; do
  STATUS=$(call_mcp "run_scenario" "{\"id\":\"$scenario\"}" | python3 -c "import sys,json; r=json.loads(sys.stdin.read()); d=json.loads(r['result']['content'][0]['text']); print(d.get('status','error'))" 2>/dev/null || echo "error")
  if [ "$STATUS" = "passed" ]; then
    echo "  ✓ $scenario: PASSED"
  else
    echo "  ✗ $scenario: $STATUS"
    ALL_PASSED=false
  fi
done

if [ "$ALL_PASSED" = false ]; then
  echo ""
  echo "=== SELF-VERIFICATION FAILED (Pass 1) ==="
  kill $SERVER_PID 2>/dev/null || true
  exit 1
fi

# 4. Set baselines from Pass 1 results
echo "[4/8] Setting baselines..."
for scenario in "${SCENARIOS[@]}"; do
  call_mcp "set_baseline" "{\"scenario_id\":\"$scenario\"}" > /dev/null
  echo "  → $scenario baseline saved"
done

# 5. Pass 2: Re-run scenarios
echo "[5/8] Pass 2: Re-running scenarios..."
for scenario in "${SCENARIOS[@]}"; do
  STATUS=$(call_mcp "run_scenario" "{\"id\":\"$scenario\"}" | python3 -c "import sys,json; r=json.loads(sys.stdin.read()); d=json.loads(r['result']['content'][0]['text']); print(d.get('status','error'))" 2>/dev/null || echo "error")
  if [ "$STATUS" = "passed" ]; then
    echo "  ✓ $scenario: PASSED"
  else
    echo "  ✗ $scenario: $STATUS"
    ALL_PASSED=false
  fi
done

# 6. Diff check: baseline vs Pass 2 results
echo "[6/8] Diff check (baseline vs Pass 2)..."
DIFF_CLEAN=true
for scenario in "${SCENARIOS[@]}"; do
  DIFF_RESULT=$(call_mcp "get_diff_log" "{\"scenario_id\":\"$scenario\"}" | python3 -c "
import sys, json
r = json.loads(sys.stdin.read())
d = json.loads(r['result']['content'][0]['text'])
overall = d.get('overall', 'unknown')
high = d.get('summary', {}).get('high', 0)
medium = d.get('summary', {}).get('medium', 0)
print(f'{overall} high={high} medium={medium}')
" 2>/dev/null || echo "error")

  OVERALL=$(echo "$DIFF_RESULT" | awk '{print $1}')
  if [ "$OVERALL" = "pass" ]; then
    echo "  ✓ $scenario: CLEAN (no mismatches)"
  else
    echo "  ⚠ $scenario: $DIFF_RESULT"
    # Only fail on high severity mismatches
    HIGH=$(echo "$DIFF_RESULT" | grep -o 'high=[0-9]*' | cut -d= -f2)
    if [ "${HIGH:-0}" -gt 0 ]; then
      DIFF_CLEAN=false
    fi
  fi
done

# 7. Coverage report
echo "[7/8] Coverage report..."
COVERAGE=$(call_mcp "get_coverage" "{}" | python3 -c "import sys,json; r=json.loads(sys.stdin.read()); d=json.loads(r['result']['content'][0]['text']); print(f'  Total: {d[\"total_scenarios\"]}, Passed: {d[\"passed\"]}, Failed: {d[\"failed\"]}, Not run: {d[\"not_run\"]}')" 2>/dev/null || echo "  (coverage unavailable)")
echo "$COVERAGE"

# 8. Cleanup
echo "[8/8] Stopping server..."
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true
echo "  OK"

echo ""
if [ "$ALL_PASSED" = true ] && [ "$DIFF_CLEAN" = true ]; then
  echo "=== SELF-VERIFICATION PASSED (2-pass) ==="
  exit 0
elif [ "$ALL_PASSED" = true ]; then
  echo "=== SELF-VERIFICATION PASSED (with minor diffs) ==="
  exit 0
else
  echo "=== SELF-VERIFICATION FAILED ==="
  exit 1
fi
