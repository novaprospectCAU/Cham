import { useCallback, useRef } from "react";
import { colors } from "../theme/index.js";

export function ResizeHandle({
  onResize,
  direction = "vertical",
}: {
  onResize: (delta: number) => void;
  direction?: "vertical" | "horizontal";
}) {
  const startRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startRef.current = direction === "vertical" ? e.clientX : e.clientY;

      const handleMouseMove = (ev: MouseEvent) => {
        const current = direction === "vertical" ? ev.clientX : ev.clientY;
        const delta = current - startRef.current;
        startRef.current = current;
        onResize(delta);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = direction === "vertical" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    },
    [onResize, direction],
  );

  const isVertical = direction === "vertical";

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        width: isVertical ? 4 : "100%",
        height: isVertical ? "100%" : 4,
        cursor: isVertical ? "col-resize" : "row-resize",
        backgroundColor: "transparent",
        position: "relative",
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      <div
        style={{
          position: "absolute",
          [isVertical ? "left" : "top"]: 1,
          [isVertical ? "width" : "height"]: 2,
          [isVertical ? "height" : "width"]: "100%",
          backgroundColor: colors.border.default,
          transition: "background-color 0.15s",
        }}
      />
    </div>
  );
}
