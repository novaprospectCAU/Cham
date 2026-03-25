import type { Mismatch, DiffLog, CoverageReport, Severity } from "./types.js";

/**
 * Build a DiffLog from a list of mismatches.
 */
export function buildDiffLog(
  scenarioId: string,
  sessionId: string,
  mismatches: Mismatch[],
  coverage: CoverageReport,
): DiffLog {
  const summary = { high: 0, medium: 0, low: 0 };
  for (const m of mismatches) {
    summary[m.severity]++;
  }

  return {
    session_id: sessionId,
    timestamp: new Date().toISOString(),
    scenario_id: scenarioId,
    overall: mismatches.length === 0 ? "pass" : "fail",
    summary,
    mismatches,
    coverage,
    ai_action: generateAiAction(mismatches),
  };
}

/**
 * Generate AI action instructions from mismatches.
 */
function generateAiAction(mismatches: Mismatch[]): string {
  if (mismatches.length === 0) return "불일치 없음. 모든 검증 통과.";

  const highMismatches = mismatches.filter((m) => m.severity === "high");
  const mediumMismatches = mismatches.filter((m) => m.severity === "medium");

  const parts: string[] = [];

  if (highMismatches.length > 0) {
    const ids = highMismatches.map((m) => m.id).join(", ");
    parts.push(`[긴급] ${ids} 수정 필요`);

    // Group by layer
    const byLayer = groupByLayer(highMismatches);
    for (const [layer, items] of byLayer) {
      switch (layer) {
        case "visual":
          parts.push(`  - 스크린샷 불일치: UI 레이아웃 또는 스타일 변경 확인`);
          break;
        case "layout":
          parts.push(
            `  - 레이아웃 불일치: ${items.map((m) => m.component).join(", ")} 위치/크기 확인`,
          );
          break;
        case "nodetree":
          parts.push(
            `  - DOM 구조 변경: ${items.map((m) => m.path).join(", ")}`,
          );
          break;
        case "assertion":
          parts.push(
            `  - assertion 회귀: ${items.map((m) => m.component).join(", ")}`,
          );
          break;
      }
    }
  }

  if (mediumMismatches.length > 0) {
    parts.push(`[주의] ${mediumMismatches.length}건 중간 심각도 불일치`);
  }

  parts.push("수정 후 재실행 요청");
  return parts.join("\n");
}

function groupByLayer(
  mismatches: Mismatch[],
): Map<string, Mismatch[]> {
  const map = new Map<string, Mismatch[]>();
  for (const m of mismatches) {
    const list = map.get(m.layer) || [];
    list.push(m);
    map.set(m.layer, list);
  }
  return map;
}

/**
 * Filter mismatches by minimum severity.
 */
export function filterBySeverity(
  mismatches: Mismatch[],
  minSeverity: Severity,
): Mismatch[] {
  const order: Record<Severity, number> = { high: 3, medium: 2, low: 1 };
  const threshold = order[minSeverity];
  return mismatches.filter((m) => order[m.severity] >= threshold);
}
