import { useRef, useEffect, useCallback, useState } from "react";
import { useEditorStore } from "../store/editorStore.js";
import {
  renderTimeline,
  hitTestFrame,
  screenToMs,
  TIMELINE_HEADER_WIDTH,
  TIMELINE_RULER_HEIGHT,
  TIMELINE_TOTAL_HEIGHT,
  type TimelineViewport,
  type TimelineRenderData,
  type TrackFrame,
  type TrackAssertion,
} from "../canvas/timelineRenderer.js";

export function CanvasTimeline() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { result, selectedFrameIdx, setSelectedFrame, setTimelineCursor } =
    useEditorStore();

  const getViewport = useCallback((): TimelineViewport => {
    if (!result?.frames?.length) {
      return { startMs: 0, endMs: 1000, zoom: 1 };
    }
    const maxMs = Math.max(
      ...result.frames.map((f: any) => f.anchor_offset_ms),
      100,
    );
    return { startMs: 0, endMs: maxMs * 1.1, zoom: 1 };
  }, [result]);

  const getRenderData = useCallback((): TimelineRenderData => {
    const frames: TrackFrame[] = (result?.frames || []).map((f: any) => ({
      anchor: f.anchor,
      offset_ms: f.anchor_offset_ms,
      hasScreenshot: !!f.screenshot,
      hasDom: !!f.dom_tree,
    }));

    const assertions: TrackAssertion[] = (result?.assertions || []).map(
      (a: any) => ({
        type: a.assertion.type,
        selector: a.assertion.selector,
        passed: a.passed,
        anchor: a.assertion.anchor,
        offset_ms: a.assertion.offset_ms,
      }),
    );

    return {
      frames,
      assertions,
      selectedFrameIdx,
      playheadMs: result?.frames?.[selectedFrameIdx]?.anchor_offset_ms || 0,
      viewport: getViewport(),
    };
  }, [result, selectedFrameIdx, getViewport]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = TIMELINE_TOTAL_HEIGHT;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    renderTimeline(ctx, w, h, dpr, getRenderData());
  }, [result, selectedFrameIdx, getRenderData]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = TIMELINE_TOTAL_HEIGHT * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${TIMELINE_TOTAL_HEIGHT}px`;

      renderTimeline(ctx, rect.width, TIMELINE_TOTAL_HEIGHT, dpr, getRenderData());
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [getRenderData]);

  // Mouse interaction
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const data = getRenderData();
      const trackW = rect.width - TIMELINE_HEADER_WIDTH;

      // Hit test frames
      const frameIdx = hitTestFrame(
        x, y,
        TIMELINE_HEADER_WIDTH, trackW,
        TIMELINE_RULER_HEIGHT,
        data.frames, data.viewport,
      );

      if (frameIdx >= 0) {
        setSelectedFrame(frameIdx);
        return;
      }

      // Click on ruler or track = seek
      if (x >= TIMELINE_HEADER_WIDTH) {
        setIsDragging(true);
        const ms = screenToMs(x, TIMELINE_HEADER_WIDTH, trackW, data.viewport);
        setTimelineCursor(Math.max(0, Math.round(ms)));

        // Find nearest frame
        let nearestIdx = 0;
        let nearestDist = Infinity;
        for (let i = 0; i < data.frames.length; i++) {
          const dist = Math.abs(data.frames[i].offset_ms - ms);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIdx = i;
          }
        }
        setSelectedFrame(nearestIdx);
      }
    },
    [getRenderData, setSelectedFrame, setTimelineCursor],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const data = getRenderData();
      const trackW = rect.width - TIMELINE_HEADER_WIDTH;

      const ms = screenToMs(x, TIMELINE_HEADER_WIDTH, trackW, data.viewport);
      setTimelineCursor(Math.max(0, Math.round(ms)));
    },
    [isDragging, getRenderData, setTimelineCursor],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    // Future: implement zoom
  }, []);

  if (!result?.frames?.length) return null;

  return (
    <div
      ref={containerRef}
      style={{
        height: TIMELINE_TOTAL_HEIGHT,
        flexShrink: 0,
        cursor: isDragging ? "grabbing" : "default",
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ display: "block" }}
      />
    </div>
  );
}
