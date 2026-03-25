import { colors } from "../theme/index.js";
import { useEditorStore } from "../store/editorStore.js";

const SEVERITY_LABELS: Record<string, string> = { high: "HIGH", medium: "MED", low: "LOW" };

export function DiffLogViewer() {
  const { diff } = useEditorStore();

  if (!diff || diff.error) {
    return (
      <div style={{ padding: 16, color: colors.text.muted, fontSize: 12 }}>
        Diff 로그 없음. baseline을 설정하고 시나리오를 재실행하세요.
      </div>
    );
  }

  return (
    <div style={{ padding: 12 }}>
      {/* Summary */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <span style={{
          padding: "2px 8px", borderRadius: 3, fontSize: 10, fontWeight: 700,
          backgroundColor: diff.overall === "pass" ? colors.accent.green + "20" : colors.accent.red + "20",
          color: diff.overall === "pass" ? colors.accent.green : colors.accent.red,
        }}>
          {diff.overall.toUpperCase()}
        </span>
        {diff.summary.high > 0 && <span style={{ fontSize: 10, color: colors.severity.high }}>{diff.summary.high} high</span>}
        {diff.summary.medium > 0 && <span style={{ fontSize: 10, color: colors.severity.medium }}>{diff.summary.medium} med</span>}
        {diff.summary.low > 0 && <span style={{ fontSize: 10, color: colors.severity.low }}>{diff.summary.low} low</span>}
      </div>

      {/* Mismatches */}
      {diff.mismatches.length === 0 ? (
        <div style={{ color: colors.accent.green, fontSize: 11 }}>All checks passed</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {diff.mismatches.map((m: any) => (
            <div
              key={m.id}
              style={{
                padding: "6px 10px", borderRadius: 4,
                backgroundColor: colors.bg.tertiary,
                borderLeft: `3px solid ${(colors.severity as Record<string, string>)[m.severity] || colors.text.muted}`,
                fontSize: 11,
              }}
            >
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ color: (colors.severity as Record<string, string>)[m.severity], fontWeight: 700, fontSize: 9, minWidth: 30 }}>
                  {SEVERITY_LABELS[m.severity]}
                </span>
                <span style={{ color: colors.text.muted }}>{m.layer}</span>
                {m.component && <span style={{ color: colors.text.secondary }}>{m.component}</span>}
              </div>
              {m.path && <div style={{ color: colors.text.muted, fontSize: 10, marginTop: 2 }}>{m.path}</div>}
            </div>
          ))}
        </div>
      )}

      {/* AI Action */}
      {diff.ai_action && (
        <div style={{
          marginTop: 12, padding: 10, borderRadius: 4,
          backgroundColor: colors.bg.tertiary, border: `1px solid ${colors.border.light}`,
        }}>
          <div style={{ fontSize: 9, color: colors.text.muted, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
            AI Action
          </div>
          <pre style={{
            fontSize: 11, color: colors.text.secondary, whiteSpace: "pre-wrap",
            margin: 0, fontFamily: "inherit", lineHeight: 1.5,
          }}>
            {diff.ai_action}
          </pre>
        </div>
      )}
    </div>
  );
}
