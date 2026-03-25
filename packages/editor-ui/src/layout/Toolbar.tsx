import { colors, shadows } from "../theme/index.js";
import { useEditorStore } from "../store/editorStore.js";

export function Toolbar() {
  const { selectedId, result } = useEditorStore();

  return (
    <div
      style={{
        height: 44,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 12,
        backgroundColor: colors.bg.secondary,
        borderBottom: `1px solid ${colors.border.default}`,
        boxShadow: shadows.sm,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 700, color: colors.text.primary }}>
        Scenario Editor
      </span>
      <span style={{ fontSize: 10, color: colors.text.muted, padding: "2px 6px", borderRadius: 4, backgroundColor: colors.bg.tertiary }}>
        v0.4.0
      </span>

      {selectedId && result && (
        <>
          <div style={{ width: 1, height: 20, backgroundColor: colors.border.default }} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 4,
              backgroundColor:
                result.status === "passed" ? colors.status.passed + "20" :
                result.status === "failed" ? colors.status.failed + "20" :
                colors.bg.tertiary,
              color:
                result.status === "passed" ? colors.status.passed :
                result.status === "failed" ? colors.status.failed :
                colors.text.secondary,
            }}
          >
            {result.status?.toUpperCase()}
          </span>
          <span style={{ fontSize: 12, color: colors.text.secondary }}>
            {result.scenario_name}
          </span>
          <span style={{ fontSize: 11, color: colors.text.muted }}>
            {result.duration_ms}ms
          </span>
        </>
      )}

      <div style={{ flex: 1 }} />

      <span style={{ fontSize: 10, color: colors.text.muted }}>
        {selectedId ? result?.target_url : ""}
      </span>
    </div>
  );
}
