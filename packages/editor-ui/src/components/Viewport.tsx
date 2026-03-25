import { useState } from "react";
import { colors } from "../theme/index.js";
import { useEditorStore } from "../store/editorStore.js";

type ViewMode = "actual" | "baseline" | "diff" | "overlay";

export function Viewport() {
  const { selectedId, result, baseline, diff, overlayOpacity, setOverlayOpacity, selectedFrameIdx } = useEditorStore();
  const [mode, setMode] = useState<ViewMode>("actual");

  if (!selectedId || !result) {
    return (
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        color: colors.text.muted, fontSize: 13,
      }}>
        시나리오를 선택하세요
      </div>
    );
  }

  const frames = result.frames?.filter((f: any) => f.screenshot) || [];
  const frame = frames[selectedFrameIdx] || frames[0];
  const hasDiff = diff && !diff.error;
  const hasBaseline = baseline?.frames?.length > 0;

  const getImageUrl = () => {
    if (!frame?.screenshot) return "";
    switch (mode) {
      case "actual": return `/screenshots/latest/${selectedId}/${frame.screenshot}`;
      case "baseline": return `/screenshots/baselines/${selectedId}/${frame.screenshot}`;
      case "diff": return `/screenshots/diffs/${selectedId}/diff_images/m${selectedFrameIdx}-visual.png`;
      case "overlay": return `/screenshots/latest/${selectedId}/${frame.screenshot}`;
    }
  };

  const baselineUrl = frame?.screenshot
    ? `/screenshots/baselines/${selectedId}/${frame.screenshot}`
    : "";

  const tabs: { id: ViewMode; label: string; disabled: boolean }[] = [
    { id: "actual", label: "Actual", disabled: false },
    { id: "baseline", label: "Baseline", disabled: !hasBaseline },
    { id: "diff", label: "Diff", disabled: !hasDiff },
    { id: "overlay", label: "Overlay", disabled: !hasBaseline },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4, padding: "6px 12px",
        borderBottom: `1px solid ${colors.border.light}`, flexShrink: 0,
      }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => !t.disabled && setMode(t.id)}
            style={{
              padding: "3px 10px", borderRadius: 3, border: "none",
              backgroundColor: mode === t.id ? colors.accent.blue : "transparent",
              color: mode === t.id ? "#fff" : t.disabled ? colors.text.muted + "60" : colors.text.secondary,
              cursor: t.disabled ? "default" : "pointer",
              fontSize: 10, fontWeight: mode === t.id ? 600 : 400,
              opacity: t.disabled ? 0.4 : 1,
            }}
          >
            {t.label}
          </button>
        ))}

        {frames.length > 1 && (
          <>
            <div style={{ width: 1, height: 16, backgroundColor: colors.border.default, margin: "0 4px" }} />
            {frames.map((_: any, i: number) => (
              <button
                key={i}
                onClick={() => useEditorStore.getState().setSelectedFrame(i)}
                style={{
                  padding: "2px 6px", borderRadius: 3, border: "none",
                  backgroundColor: selectedFrameIdx === i ? colors.bg.active : "transparent",
                  color: colors.text.muted, cursor: "pointer", fontSize: 9,
                }}
              >
                F{i + 1}
              </button>
            ))}
          </>
        )}

        {mode === "overlay" && (
          <>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 9, color: colors.text.muted }}>Opacity</span>
            <input
              type="range" min="0" max="1" step="0.01"
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
              style={{ width: 80, accentColor: colors.accent.blue }}
            />
            <span style={{ fontSize: 9, color: colors.text.muted, minWidth: 28 }}>
              {Math.round(overlayOpacity * 100)}%
            </span>
          </>
        )}
      </div>

      {/* Image */}
      <div style={{
        flex: 1, overflow: "auto", display: "flex", alignItems: "flex-start",
        justifyContent: "center", padding: 16, backgroundColor: colors.bg.primary,
      }}>
        {mode === "overlay" && hasBaseline ? (
          <div style={{ position: "relative", display: "inline-block" }}>
            <img
              src={getImageUrl()}
              alt="actual"
              style={{ display: "block", maxWidth: "100%", borderRadius: 4 }}
            />
            <img
              src={baselineUrl}
              alt="baseline overlay"
              style={{
                position: "absolute", top: 0, left: 0,
                display: "block", maxWidth: "100%", borderRadius: 4,
                opacity: overlayOpacity,
              }}
            />
          </div>
        ) : (
          <img
            src={getImageUrl()}
            alt={`${mode} screenshot`}
            style={{ display: "block", maxWidth: "100%", borderRadius: 4 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
      </div>
    </div>
  );
}
