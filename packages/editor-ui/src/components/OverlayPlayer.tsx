import { useState, useEffect, useRef, useCallback } from "react";

interface Frame {
  anchor: string;
  anchor_offset_ms: number;
  screenshot?: string;
}

export function OverlayPlayer({
  scenarioId,
  latestFrames,
  baselineFrames,
}: {
  scenarioId: string;
  latestFrames: Frame[];
  baselineFrames: Frame[];
}) {
  const [frameIdx, setFrameIdx] = useState(0);
  const [opacity, setOpacity] = useState(50);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const actualFrames = latestFrames.filter((f) => f.screenshot);
  const baseFrames = baselineFrames.filter((f) => f.screenshot);
  const maxFrames = Math.max(actualFrames.length, baseFrames.length);

  const stopPlayback = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPlaying(false);
  }, []);

  const startPlayback = useCallback(() => {
    if (maxFrames <= 1) return;
    setPlaying(true);
    timerRef.current = setInterval(() => {
      setFrameIdx((prev) => {
        const next = prev + 1;
        if (next >= maxFrames) {
          stopPlayback();
          return 0;
        }
        return next;
      });
    }, 1000);
  }, [maxFrames, stopPlayback]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    setFrameIdx(0);
    stopPlayback();
  }, [scenarioId, stopPlayback]);

  if (maxFrames === 0) {
    return null;
  }

  const actualFrame = actualFrames[frameIdx] || actualFrames[0];
  const baseFrame = baseFrames[frameIdx] || baseFrames[0];

  const actualUrl = actualFrame?.screenshot
    ? `/screenshots/latest/${scenarioId}/${actualFrame.screenshot}`
    : "";
  const baselineUrl = baseFrame?.screenshot
    ? `/screenshots/baselines/${scenarioId}/${baseFrame.screenshot}`
    : "";

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#aaa" }}>
        OVERLAY PLAYER
      </h3>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <button
          onClick={() => (playing ? stopPlayback() : startPlayback())}
          disabled={maxFrames <= 1}
          style={{
            padding: "4px 14px",
            borderRadius: 4,
            border: "1px solid #444",
            backgroundColor: playing ? "#7f1d1d" : "#222",
            color: playing ? "#fca5a5" : "#aaa",
            cursor: maxFrames <= 1 ? "default" : "pointer",
            fontSize: 12,
            fontWeight: 600,
            opacity: maxFrames <= 1 ? 0.4 : 1,
          }}
        >
          {playing ? "\u23F8 Pause" : "\u25B6 Play"}
        </button>

        <span style={{ fontSize: 11, color: "#666" }}>
          Frame {frameIdx + 1} / {maxFrames}
        </span>
      </div>

      {/* Frame selector */}
      {maxFrames > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {Array.from({ length: maxFrames }).map((_, i) => {
            const label =
              actualFrames[i]?.anchor || baseFrames[i]?.anchor || `frame-${i}`;
            const offsetMs =
              actualFrames[i]?.anchor_offset_ms ??
              baseFrames[i]?.anchor_offset_ms ??
              0;
            return (
              <button
                key={i}
                onClick={() => {
                  setFrameIdx(i);
                  stopPlayback();
                }}
                style={{
                  padding: "2px 8px",
                  borderRadius: 4,
                  border: frameIdx === i ? "1px solid #3b82f6" : "1px solid #444",
                  backgroundColor: "#222",
                  color: "#ccc",
                  cursor: "pointer",
                  fontSize: 11,
                }}
              >
                {label} +{offsetMs}ms
              </button>
            );
          })}
        </div>
      )}

      {/* Opacity slider */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: "#888", minWidth: 44 }}>Actual</span>
        <input
          type="range"
          min={0}
          max={100}
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          style={{ flex: 1, accentColor: "#3b82f6" }}
        />
        <span style={{ fontSize: 11, color: "#888", minWidth: 54 }}>Baseline</span>
        <span style={{ fontSize: 11, color: "#555", minWidth: 36, textAlign: "right" }}>
          {opacity}%
        </span>
      </div>

      {/* Overlaid screenshots */}
      <div
        style={{
          position: "relative",
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid #333",
          backgroundColor: "#111",
        }}
      >
        {/* Actual (bottom layer) */}
        {actualUrl && (
          <img
            src={actualUrl}
            alt="actual"
            style={{ width: "100%", display: "block" }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}

        {/* Baseline (top layer with opacity) */}
        {baselineUrl && (
          <img
            src={baselineUrl}
            alt="baseline"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              display: "block",
              opacity: opacity / 100,
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}

        {/* Labels */}
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            display: "flex",
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 3,
              backgroundColor: "rgba(0,0,0,0.7)",
              color: "#7dd3fc",
            }}
          >
            Actual
          </span>
          <span
            style={{
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 3,
              backgroundColor: "rgba(0,0,0,0.7)",
              color: "#fde68a",
            }}
          >
            Baseline ({opacity}%)
          </span>
        </div>
      </div>
    </div>
  );
}
