import { useState } from "react";

interface Frame {
  anchor: string;
  anchor_offset_ms: number;
  screenshot?: string;
}

type ViewMode = "baseline" | "actual" | "diff";

export function ScreenshotCompare({
  scenarioId,
  latestFrames,
  baselineFrames,
  hasDiff,
}: {
  scenarioId: string;
  latestFrames: Frame[];
  baselineFrames: Frame[] | null;
  hasDiff: boolean;
}) {
  const [mode, setMode] = useState<ViewMode>("actual");
  const [frameIdx, setFrameIdx] = useState(0);

  const frames = latestFrames.filter((f) => f.screenshot);
  if (frames.length === 0) {
    return <div style={{ padding: 16, color: "#888" }}>스크린샷 없음</div>;
  }

  const currentFrame = frames[frameIdx] || frames[0];

  const getImageUrl = () => {
    if (!currentFrame.screenshot) return "";
    switch (mode) {
      case "actual":
        return `/screenshots/latest/${scenarioId}/${currentFrame.screenshot}`;
      case "baseline":
        return `/screenshots/baselines/${scenarioId}/${currentFrame.screenshot}`;
      case "diff": {
        const diffFile = `diff_images/m${frameIdx}-visual.png`;
        return `/screenshots/diffs/${scenarioId}/${diffFile}`;
      }
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#aaa" }}>
        SCREENSHOT
      </h3>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {(["actual", "baseline", "diff"] as ViewMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            disabled={(m === "baseline" && !baselineFrames) || (m === "diff" && !hasDiff)}
            style={{
              padding: "4px 12px",
              borderRadius: 4,
              border: "1px solid #444",
              backgroundColor: mode === m ? "#3b82f6" : "#222",
              color: mode === m ? "#fff" : "#aaa",
              cursor: "pointer",
              fontSize: 12,
              opacity: (m === "baseline" && !baselineFrames) || (m === "diff" && !hasDiff) ? 0.4 : 1,
            }}
          >
            {m === "actual" ? "Actual" : m === "baseline" ? "Baseline" : "Diff"}
          </button>
        ))}
      </div>

      {frames.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          {frames.map((f, i) => (
            <button
              key={i}
              onClick={() => setFrameIdx(i)}
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
              {f.anchor} +{f.anchor_offset_ms}ms
            </button>
          ))}
        </div>
      )}

      <div style={{
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid #333",
        backgroundColor: "#111",
      }}>
        <img
          src={getImageUrl()}
          alt={`${mode} screenshot`}
          style={{ width: "100%", display: "block" }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
    </div>
  );
}
