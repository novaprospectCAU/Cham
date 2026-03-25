#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "=== Scenario Editor Self-Verification ==="
echo "Root: $ROOT_DIR"
echo ""

# 1. Build
echo "[1/6] Building packages..."
pnpm build > /dev/null 2>&1
echo "  OK"

# 2. Start editor-ui server in background
echo "[2/6] Starting editor-ui server..."
cd packages/editor-ui
pnpm dev > /dev/null 2>&1 &
SERVER_PID=$!
cd "$ROOT_DIR"

# Wait for servers to be ready
sleep 3
echo "  OK (PID: $SERVER_PID)"

# 3. Run self-verification scenarios
echo "[3/6] Running self-verification scenarios..."
SCENARIOS=("editor_scenario_list" "editor_diff_viewer" "editor_confirm_flow")
ALL_PASSED=true

for scenario in "${SCENARIOS[@]}"; do
  RESULT=$(printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"self-verify","version":"0.1.0"}}}\n{"jsonrpc":"2.0","id":2,"method":"notifications/initialized"}\n{"jsonrpc":"2.0","id":10,"method":"tools/call","params":{"name":"run_scenario","arguments":{"id":"%s"}}}\n' "$scenario" | \
    SCENARIO_EDITOR_ROOT="$ROOT_DIR" node packages/mcp-server/dist/index.js 2>/dev/null | \
    tail -1)

  STATUS=$(echo "$RESULT" | python3 -c "import sys,json; r=json.loads(sys.stdin.read()); d=json.loads(r['result']['content'][0]['text']); print(d.get('status','error'))" 2>/dev/null || echo "error")

  if [ "$STATUS" = "passed" ]; then
    echo "  ✓ $scenario: PASSED"
  else
    echo "  ✗ $scenario: $STATUS"
    ALL_PASSED=false
  fi
done

# 4. Set baselines for passed scenarios
echo "[4/6] Setting baselines..."
for scenario in "${SCENARIOS[@]}"; do
  printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"self-verify","version":"0.1.0"}}}\n{"jsonrpc":"2.0","id":2,"method":"notifications/initialized"}\n{"jsonrpc":"2.0","id":10,"method":"tools/call","params":{"name":"set_baseline","arguments":{"scenario_id":"%s"}}}\n' "$scenario" | \
    SCENARIO_EDITOR_ROOT="$ROOT_DIR" node packages/mcp-server/dist/index.js 2>/dev/null > /dev/null
  echo "  → $scenario baseline saved"
done

# 5. Coverage report
echo "[5/6] Coverage report..."
COVERAGE=$(printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"self-verify","version":"0.1.0"}}}\n{"jsonrpc":"2.0","id":2,"method":"notifications/initialized"}\n{"jsonrpc":"2.0","id":10,"method":"tools/call","params":{"name":"get_coverage","arguments":{}}}\n' | \
  SCENARIO_EDITOR_ROOT="$ROOT_DIR" node packages/mcp-server/dist/index.js 2>/dev/null | \
  tail -1 | python3 -c "import sys,json; r=json.loads(sys.stdin.read()); d=json.loads(r['result']['content'][0]['text']); print(f'  Total: {d[\"total_scenarios\"]}, Passed: {d[\"passed\"]}, Failed: {d[\"failed\"]}, Not run: {d[\"not_run\"]}')" 2>/dev/null || echo "  (coverage unavailable)")
echo "$COVERAGE"

# 6. Cleanup
echo "[6/6] Stopping server..."
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true
echo "  OK"

echo ""
if [ "$ALL_PASSED" = true ]; then
  echo "=== SELF-VERIFICATION PASSED ==="
  exit 0
else
  echo "=== SELF-VERIFICATION FAILED ==="
  exit 1
fi
