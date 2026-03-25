import { useState, useEffect, useRef, useCallback } from "react";
import { colors } from "../theme/index.js";
import { useEditorStore } from "../store/editorStore.js";

type ViewMode = "actual" | "baseline" | "diff" | "overlay";

export function Viewport() {
  const {
    selectedId, result, baseline, diff,
    overlayOpacity, setOverlayOpacity,
    selectedFrameIdx, setSelectedFrame,
    isPlaying, setIsPlaying,
    hoveredNodeRect,
  } = useEditorStore();

  const [mode, setMode] = useState<ViewMode>("actual");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const frames = result?.frames?.filter((f: any) => f.screenshot) || [];
  const frameCount = frames.length;

  // Auto-play (must be before any early return)
  useEffect(() => {
    if (isPlaying && frameCount > 1) {
      playIntervalRef.current = setInterval(() => {
        const store = useEditorStore.getState();
        const nextIdx = (store.selectedFrameIdx + 1) % frameCount;
        store.setSelectedFrame(nextIdx);
        if (nextIdx === 0) store.setIsPlaying(false);
      }, 1000);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, frameCount]);

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

  // Zoom with wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.25, Math.min(4, z * delta)));
  }, []);

  // Pan with middle-click or Shift+drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.shiftKey) {
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: panStart.current.panX + (e.clientX - panStart.current.x),
      y: panStart.current.panY + (e.clientY - panStart.current.y),
    });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

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
        display: "flex", alignItems: "center", gap: 4, padding: "4px 12px",
        borderBottom: `1px solid ${colors.border.light}`, flexShrink: 0,
        backgroundColor: colors.bg.secondary,
      }}>
        {/* Play/Pause */}
        {frames.length > 1 && (
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              padding: "3px 8px", borderRadius: 3, border: `1px solid ${colors.border.default}`,
              backgroundColor: isPlaying ? colors.accent.blue + "20" : "transparent",
              color: isPlaying ? colors.accent.blue : colors.text.secondary,
              cursor: "pointer", fontSize: 10,
            }}
          >
            {isPlaying ? "\u23F8 Pause" : "\u25B6 Play"}
          </button>
        )}

        {/* View mode tabs */}
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

        {/* Frame selector */}
        {frames.length > 1 && (
          <>
            <div style={{ width: 1, height: 16, backgroundColor: colors.border.default, margin: "0 4px" }} />
            <span style={{ fontSize: 9, color: colors.text.muted }}>
              {selectedFrameIdx + 1}/{frames.length}
            </span>
            {frames.map((_: any, i: number) => (
              <button
                key={i}
                onClick={() => setSelectedFrame(i)}
                style={{
                  width: 20, height: 20, borderRadius: 3, border: "none",
                  backgroundColor: selectedFrameIdx === i ? colors.accent.blue + "30" : "transparent",
                  color: selectedFrameIdx === i ? colors.accent.blue : colors.text.muted,
                  cursor: "pointer", fontSize: 9, fontWeight: selectedFrameIdx === i ? 700 : 400,
                }}
              >
                {i + 1}
              </button>
            ))}
          </>
        )}

        <div style={{ flex: 1 }} />

        {/* Overlay opacity */}
        {mode === "overlay" && (
          <>
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

        {/* Zoom */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => setZoom((z) => Math.max(0.25, z * 0.8))}
            style={{ width: 20, height: 20, borderRadius: 3, border: `1px solid ${colors.border.default}`, backgroundColor: "transparent", color: colors.text.muted, cursor: "pointer", fontSize: 11 }}
          >
            -
          </button>
          <span style={{ fontSize: 9, color: colors.text.muted, minWidth: 32, textAlign: "center" }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(4, z * 1.25))}
            style={{ width: 20, height: 20, borderRadius: 3, border: `1px solid ${colors.border.default}`, backgroundColor: "transparent", color: colors.text.muted, cursor: "pointer", fontSize: 11 }}
          >
            +
          </button>
          {zoom !== 1 && (
            <button
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              style={{ padding: "2px 6px", borderRadius: 3, border: `1px solid ${colors.border.default}`, backgroundColor: "transparent", color: colors.text.muted, cursor: "pointer", fontSize: 9 }}
            >
              Fit
            </button>
          )}
        </div>

        {/* Timecode */}
        {frame && (
          <span style={{ fontSize: 9, color: colors.text.muted, fontFamily: "ui-monospace, monospace" }}>
            {frame.anchor} +{frame.anchor_offset_ms}ms
          </span>
        )}
      </div>

      {/* Image area */}
      <div
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          flex: 1, overflow: "hidden", position: "relative",
          backgroundColor: colors.bg.primary,
          cursor: isPanning ? "grabbing" : "default",
        }}
      >
        <div style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
          transformOrigin: "center",
          transition: isPanning ? "none" : "transform 0.1s ease-out",
        }}>
          {mode === "overlay" && hasBaseline ? (
            <div style={{ position: "relative", display: "inline-block" }}>
              <img
                src={getImageUrl()}
                alt="actual"
                style={{ display: "block", borderRadius: 4 }}
              />
              <img
                src={baselineUrl}
                alt="baseline overlay"
                style={{
                  position: "absolute", top: 0, left: 0,
                  display: "block", borderRadius: 4,
                  opacity: overlayOpacity,
                  mixBlendMode: "difference",
                }}
              />
              {/* Labels */}
              <div style={{
                position: "absolute", top: 8, left: 8, display: "flex", gap: 4,
              }}>
                <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, backgroundColor: colors.accent.blue + "cc", color: "#fff" }}>
                  Actual
                </span>
                <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, backgroundColor: colors.accent.yellow + "cc", color: "#fff" }}>
                  Baseline ({Math.round(overlayOpacity * 100)}%)
                </span>
              </div>
            </div>
          ) : (
            <img
              src={getImageUrl()}
              alt={`${mode} screenshot`}
              style={{ display: "block", borderRadius: 4 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}

          {/* Node rect highlight overlay */}
          {hoveredNodeRect && (
            <div style={{
              position: "absolute",
              left: hoveredNodeRect.x,
              top: hoveredNodeRect.y,
              width: hoveredNodeRect.width,
              height: hoveredNodeRect.height,
              border: `2px solid ${colors.accent.blue}`,
              backgroundColor: colors.accent.blue + "15",
              pointerEvents: "none",
              borderRadius: 2,
              transition: "all 0.1s ease-out",
            }}>
              <span style={{
                position: "absolute", top: -16, left: 0,
                fontSize: 8, color: colors.accent.blue,
                backgroundColor: colors.bg.secondary + "ee",
                padding: "1px 4px", borderRadius: 2,
                whiteSpace: "nowrap",
              }}>
                {hoveredNodeRect.width}\u00d7{hoveredNodeRect.height} @ ({hoveredNodeRect.x}, {hoveredNodeRect.y})
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
