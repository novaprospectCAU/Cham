import { colors } from "../theme/index.js";
import { useEditorStore } from "../store/editorStore.js";

export function Timeline() {
  const { result, selectedFrameIdx, setSelectedFrame } = useEditorStore();

  if (!result?.frames?.length) return null;

  const frames = result.frames;
  const assertions = result.assertions || [];
  const maxMs = Math.max(...frames.map((f: any) => f.anchor_offset_ms), 1);

  return (
    <div style={{
      padding: "8px 12px", borderBottom: `1px solid ${colors.border.light}`,
      backgroundColor: colors.bg.secondary, flexShrink: 0,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 9, color: colors.text.muted }}>
        <span>0ms</span>
        <span>{Math.round(maxMs / 2)}ms</span>
        <span>{maxMs}ms</span>
      </div>

      {/* Captures Track */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
        <span style={{ fontSize: 9, color: colors.text.muted, minWidth: 56 }}>Captures</span>
        <div style={{
          flex: 1, height: 20, backgroundColor: colors.bg.tertiary, borderRadius: 3,
          position: "relative",
        }}>
          {frames.map((f: any, i: number) => {
            const pct = maxMs > 0 ? (f.anchor_offset_ms / maxMs) * 100 : 0;
            const isSelected = i === selectedFrameIdx;
            return (
              <div
                key={i}
                onClick={() => setSelectedFrame(i)}
                title={`${f.anchor} +${f.anchor_offset_ms}ms`}
                style={{
                  position: "absolute", left: `${pct}%`, top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: isSelected ? 10 : 8, height: isSelected ? 10 : 8,
                  borderRadius: "50%",
                  backgroundColor: isSelected ? colors.accent.blue : colors.track.capture,
                  border: isSelected ? `2px solid ${colors.text.primary}` : "none",
                  cursor: "pointer", zIndex: isSelected ? 2 : 1,
                }}
              />
            );
          })}
        </div>
      </div>

      {assertions.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 9, color: colors.text.muted, minWidth: 56 }}>Asserts</span>
          <div style={{
            flex: 1, height: 20, backgroundColor: colors.bg.tertiary, borderRadius: 3,
            position: "relative",
          }}>
            {assertions.map((a: any, i: number) => {
              const pct = (i / Math.max(assertions.length - 1, 1)) * 100;
              return (
                <div key={i} title={`${a.assertion.type}: ${a.passed ? "pass" : "fail"}`}
                  style={{ position: "absolute", left: `${pct}%`, top: "50%", transform: "translate(-50%, -50%)", fontSize: 10 }}>
                  {a.passed ? "\u2705" : "\u274C"}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
        {(Array.from(new Set(frames.map((f: any) => String(f.anchor)))) as string[]).map((anchor) => (
          <span key={anchor} style={{
            fontSize: 9, padding: "1px 6px", borderRadius: 3,
            backgroundColor: colors.bg.tertiary, color: colors.text.muted,
            border: `1px solid ${colors.border.light}`,
          }}>
            {anchor}
          </span>
        ))}
      </div>
    </div>
  );
}
