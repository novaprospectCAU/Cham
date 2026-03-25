import { type ReactNode, useCallback } from "react";
import { colors } from "../theme/index.js";
import { ResizeHandle } from "./ResizeHandle.js";
import { useEditorStore } from "../store/editorStore.js";

export function PanelLayout({
  left,
  center,
  right,
}: {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}) {
  const { panelWidths, setPanelWidth } = useEditorStore();

  const handleLeftResize = useCallback(
    (delta: number) => setPanelWidth("left", Math.max(180, Math.min(400, panelWidths.left + delta))),
    [panelWidths.left, setPanelWidth],
  );

  const handleRightResize = useCallback(
    (delta: number) => setPanelWidth("right", Math.max(240, Math.min(500, panelWidths.right - delta))),
    [panelWidths.right, setPanelWidth],
  );

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {/* Left Panel */}
      <div
        style={{
          width: panelWidths.left,
          flexShrink: 0,
          backgroundColor: colors.bg.panel,
          borderRight: `1px solid ${colors.border.light}`,
          overflow: "auto",
        }}
      >
        {left}
      </div>

      <ResizeHandle onResize={handleLeftResize} />

      {/* Center */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {center}
      </div>

      <ResizeHandle onResize={handleRightResize} />

      {/* Right Panel */}
      <div
        style={{
          width: panelWidths.right,
          flexShrink: 0,
          backgroundColor: colors.bg.panel,
          borderLeft: `1px solid ${colors.border.light}`,
          overflow: "auto",
        }}
      >
        {right}
      </div>
    </div>
  );
}
