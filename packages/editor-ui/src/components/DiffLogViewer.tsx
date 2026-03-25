interface Mismatch {
  id: string;
  frame_anchor: string;
  frame_offset_ms: number;
  layer: string;
  component?: string;
  path?: string;
  expected: unknown;
  actual: unknown;
  severity: "high" | "medium" | "low";
  screenshot_diff?: string;
}

interface DiffLog {
  overall: string;
  summary: { high: number; medium: number; low: number };
  mismatches: Mismatch[];
  ai_action: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#6b7280",
};

const SEVERITY_LABELS: Record<string, string> = {
  high: "HIGH",
  medium: "MED",
  low: "LOW",
};

export function DiffLogViewer({ diff }: { diff: DiffLog | null }) {
  if (!diff) {
    return (
      <div style={{ padding: 16, color: "#888" }}>
        Diff 로그 없음. baseline을 설정하고 시나리오를 재실행하세요.
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#aaa" }}>
        DIFF LOG
      </h3>

      <div style={{
        display: "flex", gap: 12, marginBottom: 12, fontSize: 12,
      }}>
        <span style={{
          padding: "2px 8px", borderRadius: 4,
          backgroundColor: diff.overall === "pass" ? "#166534" : "#7f1d1d",
          color: "#fff",
        }}>
          {diff.overall.toUpperCase()}
        </span>
        {diff.summary.high > 0 && (
          <span style={{ color: SEVERITY_COLORS.high }}>
            {diff.summary.high} high
          </span>
        )}
        {diff.summary.medium > 0 && (
          <span style={{ color: SEVERITY_COLORS.medium }}>
            {diff.summary.medium} medium
          </span>
        )}
        {diff.summary.low > 0 && (
          <span style={{ color: SEVERITY_COLORS.low }}>
            {diff.summary.low} low
          </span>
        )}
      </div>

      {diff.mismatches.length === 0 ? (
        <div style={{ color: "#22c55e", fontSize: 13 }}>
          불일치 없음. 모든 검증 통과.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {diff.mismatches.map((m) => (
            <div
              key={m.id}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                backgroundColor: "#1a1a2a",
                borderLeft: `3px solid ${SEVERITY_COLORS[m.severity]}`,
                fontSize: 12,
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{
                  color: SEVERITY_COLORS[m.severity],
                  fontWeight: 600,
                  minWidth: 36,
                }}>
                  {SEVERITY_LABELS[m.severity]}
                </span>
                <span style={{ color: "#aaa" }}>{m.layer}</span>
                <span style={{ color: "#ddd" }}>{m.component || ""}</span>
              </div>
              {m.path && (
                <div style={{ color: "#666", fontSize: 11, marginTop: 2 }}>
                  {m.path}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {diff.ai_action && (
        <div style={{
          marginTop: 16, padding: 12, borderRadius: 6,
          backgroundColor: "#1a1a2a", border: "1px solid #333",
        }}>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>AI ACTION</div>
          <pre style={{
            fontSize: 12, color: "#ddd", whiteSpace: "pre-wrap", margin: 0,
            fontFamily: "inherit",
          }}>
            {diff.ai_action}
          </pre>
        </div>
      )}
    </div>
  );
}
