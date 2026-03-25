interface Frame {
  anchor: string;
  anchor_offset_ms: number;
  screenshot?: string;
}

interface AssertionResult {
  assertion: {
    type: string;
    selector?: string;
    expected: unknown;
  };
  passed: boolean;
  actual?: unknown;
}

export function Timeline({
  frames,
  assertions,
  selectedFrameIdx,
  onSelectFrame,
}: {
  frames: Frame[];
  assertions: AssertionResult[];
  selectedFrameIdx?: number;
  onSelectFrame?: (idx: number) => void;
}) {
  if (!frames || frames.length === 0) {
    return null;
  }

  // Compute timeline bounds
  const maxMs = Math.max(
    ...frames.map((f) => f.anchor_offset_ms),
    1,
  );

  // Add padding so edge dots are not clipped
  const timelinePadding = 24;

  const positionPercent = (ms: number) => {
    if (maxMs === 0) return 50;
    return (ms / maxMs) * 100;
  };

  // Group frames by anchor
  const anchors = Array.from(new Set(frames.map((f) => f.anchor)));

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#aaa" }}>
        TIMELINE
      </h3>

      <div
        style={{
          backgroundColor: "#1a1a2a",
          borderRadius: 6,
          border: "1px solid #333",
          padding: "12px 16px",
        }}
      >
        {/* Time axis */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: "#555",
            marginBottom: 4,
            paddingLeft: timelinePadding,
            paddingRight: timelinePadding,
          }}
        >
          <span>0ms</span>
          {maxMs > 0 && <span>{Math.round(maxMs / 2)}ms</span>}
          <span>{maxMs}ms</span>
        </div>

        {/* Capture Track */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>
            Captures
          </div>
          <div
            style={{
              position: "relative",
              height: 28,
              backgroundColor: "#111",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            {/* Track line */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: timelinePadding,
                right: timelinePadding,
                height: 2,
                backgroundColor: "#333",
                transform: "translateY(-50%)",
              }}
            />

            {/* Capture dots */}
            {frames.map((frame, i) => {
              const pct = positionPercent(frame.anchor_offset_ms);
              const isSelected = selectedFrameIdx === i;
              return (
                <div
                  key={i}
                  title={`${frame.anchor} +${frame.anchor_offset_ms}ms`}
                  onClick={() => onSelectFrame?.(i)}
                  style={{
                    position: "absolute",
                    left: `calc(${pct}% * (1 - ${(timelinePadding * 2) / 100}) + ${timelinePadding}px)`,
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: isSelected ? 14 : 10,
                    height: isSelected ? 14 : 10,
                    borderRadius: "50%",
                    backgroundColor: isSelected ? "#3b82f6" : "#60a5fa",
                    border: isSelected ? "2px solid #93c5fd" : "2px solid #1e3a5f",
                    cursor: onSelectFrame ? "pointer" : "default",
                    transition: "all 0.15s",
                    zIndex: isSelected ? 2 : 1,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Assert Track */}
        {assertions.length > 0 && (
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>
              Assertions
            </div>
            <div
              style={{
                position: "relative",
                height: 28,
                backgroundColor: "#111",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              {/* Track line */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: timelinePadding,
                  right: timelinePadding,
                  height: 2,
                  backgroundColor: "#333",
                  transform: "translateY(-50%)",
                }}
              />

              {/* Assertion indicators spread evenly */}
              {assertions.map((a, i) => {
                const pct =
                  assertions.length === 1
                    ? 50
                    : (i / (assertions.length - 1)) * 100;
                return (
                  <div
                    key={i}
                    title={`${a.assertion.type}${a.assertion.selector ? ` (${a.assertion.selector})` : ""} — ${a.passed ? "PASS" : "FAIL"}`}
                    style={{
                      position: "absolute",
                      left: `calc(${pct}% * (1 - ${(timelinePadding * 2) / 100}) + ${timelinePadding}px)`,
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      width: 20,
                      height: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      borderRadius: 4,
                      backgroundColor: a.passed ? "#14532d" : "#7f1d1d",
                      border: a.passed ? "1px solid #22c55e" : "1px solid #ef4444",
                      zIndex: 1,
                    }}
                  >
                    {a.passed ? "\u2713" : "\u2717"}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Anchor legend */}
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          {anchors.map((anchor) => (
            <span
              key={anchor}
              style={{
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 3,
                backgroundColor: "#222",
                border: "1px solid #444",
                color: "#aaa",
              }}
            >
              {anchor}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
