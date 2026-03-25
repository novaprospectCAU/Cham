import { useState } from "react";
import { colors } from "../theme/index.js";
import { useEditorStore } from "../store/editorStore.js";

export function StatusBar() {
  const { coverage, selectedId, result, confirmScenario, rejectScenario } = useEditorStore();
  const [showReject, setShowReject] = useState(false);
  const [comment, setComment] = useState("");

  const pct = coverage && coverage.total_scenarios > 0
    ? Math.round((coverage.passed / coverage.total_scenarios) * 100)
    : 0;

  return (
    <div
      style={{
        height: 36,
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: 12,
        backgroundColor: colors.bg.secondary,
        borderTop: `1px solid ${colors.border.default}`,
        fontSize: 11,
        flexShrink: 0,
      }}
    >
      {coverage && (
        <>
          <span style={{ fontWeight: 600, color: colors.text.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Coverage
          </span>
          <span style={{ color: colors.text.secondary }}>
            {coverage.passed}/{coverage.total_scenarios}
          </span>
          <div style={{ width: 120, height: 4, borderRadius: 2, backgroundColor: colors.bg.tertiary }}>
            <div style={{
              width: `${pct}%`, height: "100%", borderRadius: 2,
              backgroundColor: pct === 100 ? colors.accent.green : pct > 50 ? colors.accent.yellow : colors.accent.red,
            }} />
          </div>
          <span style={{ color: colors.text.muted }}>{pct}%</span>
          {coverage.failed > 0 && <span style={{ color: colors.accent.red }}>{coverage.failed} failed</span>}
          {coverage.not_run > 0 && <span style={{ color: colors.text.muted }}>{coverage.not_run} pending</span>}
        </>
      )}

      <div style={{ flex: 1 }} />

      {selectedId && result && (
        <>
          {!showReject ? (
            <>
              <button
                onClick={() => confirmScenario()}
                style={{
                  padding: "4px 14px", borderRadius: 4, border: "none",
                  backgroundColor: colors.accent.green, color: "#fff",
                  fontWeight: 600, cursor: "pointer", fontSize: 11,
                }}
              >
                Confirm
              </button>
              <button
                onClick={() => setShowReject(true)}
                style={{
                  padding: "4px 14px", borderRadius: 4,
                  border: `1px solid ${colors.border.default}`,
                  backgroundColor: "transparent", color: colors.accent.red,
                  fontWeight: 600, cursor: "pointer", fontSize: 11,
                }}
              >
                Reject
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Rejection reason..."
                style={{
                  padding: "3px 8px", borderRadius: 4,
                  border: `1px solid ${colors.border.default}`,
                  backgroundColor: colors.bg.tertiary, color: colors.text.primary,
                  fontSize: 11, width: 200,
                }}
              />
              <button
                onClick={() => { rejectScenario(comment); setShowReject(false); setComment(""); }}
                style={{
                  padding: "4px 10px", borderRadius: 4, border: "none",
                  backgroundColor: colors.accent.red, color: "#fff", cursor: "pointer", fontSize: 11,
                }}
              >
                Send
              </button>
              <button
                onClick={() => setShowReject(false)}
                style={{
                  padding: "4px 10px", borderRadius: 4,
                  border: `1px solid ${colors.border.default}`,
                  backgroundColor: "transparent", color: colors.text.muted, cursor: "pointer", fontSize: 11,
                }}
              >
                Cancel
              </button>
            </>
          )}
          <span style={{ color: colors.text.muted, fontSize: 10 }}>{selectedId}</span>
        </>
      )}
    </div>
  );
}
