import { colors } from "../theme/colors.js";

export interface TimelineViewport {
  startMs: number;
  endMs: number;
  zoom: number; // pixels per ms
}

export interface TrackFrame {
  anchor: string;
  offset_ms: number;
  hasScreenshot: boolean;
  hasDom: boolean;
}

export interface TrackAssertion {
  type: string;
  selector?: string;
  passed: boolean;
  anchor: string;
  offset_ms: number;
}

export interface TimelineRenderData {
  frames: TrackFrame[];
  assertions: TrackAssertion[];
  selectedFrameIdx: number;
  playheadMs: number;
  viewport: TimelineViewport;
}

const TRACK_HEIGHT = 28;
const TRACK_GAP = 2;
const HEADER_WIDTH = 64;
const RULER_HEIGHT = 24;
const PLAYHEAD_COLOR = "#ef4444";

export function renderTimeline(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dpr: number,
  data: TimelineRenderData,
) {
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const trackAreaX = HEADER_WIDTH;
  const trackAreaW = width - HEADER_WIDTH;

  drawBackground(ctx, width, height);
  drawRuler(ctx, trackAreaX, trackAreaW, data.viewport);
  drawCaptureTrack(ctx, trackAreaX, trackAreaW, RULER_HEIGHT, data);
  drawAssertTrack(ctx, trackAreaX, trackAreaW, RULER_HEIGHT + TRACK_HEIGHT + TRACK_GAP, data);
  drawPlayhead(ctx, trackAreaX, trackAreaW, data);
  drawTrackLabels(ctx, RULER_HEIGHT);

  ctx.restore();
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = colors.bg.secondary;
  ctx.fillRect(0, 0, w, h);
}

function drawRuler(
  ctx: CanvasRenderingContext2D,
  x: number,
  w: number,
  vp: TimelineViewport,
) {
  ctx.fillStyle = colors.bg.tertiary;
  ctx.fillRect(x, 0, w, RULER_HEIGHT);

  // Ticks
  const range = vp.endMs - vp.startMs;
  const tickInterval = getTickInterval(range);

  ctx.fillStyle = colors.text.muted;
  ctx.font = "9px system-ui";
  ctx.textAlign = "center";

  const startTick = Math.floor(vp.startMs / tickInterval) * tickInterval;
  for (let ms = startTick; ms <= vp.endMs; ms += tickInterval) {
    const px = msToScreen(ms, x, w, vp);
    if (px < x || px > x + w) continue;

    // Major tick
    ctx.strokeStyle = colors.border.default;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, RULER_HEIGHT - 8);
    ctx.lineTo(px, RULER_HEIGHT);
    ctx.stroke();

    // Label
    ctx.fillText(formatMs(ms), px, RULER_HEIGHT - 10);
  }

  // Bottom border
  ctx.strokeStyle = colors.border.default;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, RULER_HEIGHT);
  ctx.lineTo(x + w, RULER_HEIGHT);
  ctx.stroke();
}

function drawCaptureTrack(
  ctx: CanvasRenderingContext2D,
  x: number,
  w: number,
  y: number,
  data: TimelineRenderData,
) {
  // Track background
  ctx.fillStyle = colors.bg.primary + "80";
  ctx.fillRect(x, y, w, TRACK_HEIGHT);

  // Frame dots
  for (let i = 0; i < data.frames.length; i++) {
    const frame = data.frames[i];
    const px = msToScreen(frame.offset_ms, x, w, data.viewport);
    if (px < x || px > x + w) continue;

    const isSelected = i === data.selectedFrameIdx;
    const cy = y + TRACK_HEIGHT / 2;
    const r = isSelected ? 6 : 4;

    // Glow for selected
    if (isSelected) {
      ctx.shadowColor = colors.accent.blue;
      ctx.shadowBlur = 8;
    }

    ctx.beginPath();
    ctx.arc(px, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = isSelected ? colors.accent.blue : colors.track.capture;
    ctx.fill();

    if (isSelected) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Anchor label for selected
    if (isSelected) {
      ctx.fillStyle = colors.text.secondary;
      ctx.font = "9px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(frame.anchor, px, y + TRACK_HEIGHT + 10);
    }
  }
}

function drawAssertTrack(
  ctx: CanvasRenderingContext2D,
  x: number,
  w: number,
  y: number,
  data: TimelineRenderData,
) {
  ctx.fillStyle = colors.bg.primary + "40";
  ctx.fillRect(x, y, w, TRACK_HEIGHT);

  if (data.assertions.length === 0) return;

  for (let i = 0; i < data.assertions.length; i++) {
    const a = data.assertions[i];
    const px = msToScreen(a.offset_ms, x, w, data.viewport);
    if (px < x || px > x + w) continue;

    const cy = y + TRACK_HEIGHT / 2;

    // Pass/fail indicator
    ctx.beginPath();
    ctx.arc(px, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = a.passed ? colors.accent.green + "30" : colors.accent.red + "30";
    ctx.fill();
    ctx.strokeStyle = a.passed ? colors.accent.green : colors.accent.red;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Checkmark or X
    ctx.fillStyle = a.passed ? colors.accent.green : colors.accent.red;
    ctx.font = "bold 8px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(a.passed ? "\u2713" : "\u2717", px, cy);
    ctx.textBaseline = "alphabetic";
  }
}

function drawPlayhead(
  ctx: CanvasRenderingContext2D,
  x: number,
  w: number,
  data: TimelineRenderData,
) {
  const px = msToScreen(data.playheadMs, x, w, data.viewport);
  if (px < x || px > x + w) return;

  const totalHeight = RULER_HEIGHT + (TRACK_HEIGHT + TRACK_GAP) * 2 + 16;

  // Triangle at top
  ctx.fillStyle = PLAYHEAD_COLOR;
  ctx.beginPath();
  ctx.moveTo(px - 5, 0);
  ctx.lineTo(px + 5, 0);
  ctx.lineTo(px, 6);
  ctx.closePath();
  ctx.fill();

  // Vertical line
  ctx.strokeStyle = PLAYHEAD_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(px, 6);
  ctx.lineTo(px, totalHeight);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawTrackLabels(ctx: CanvasRenderingContext2D, startY: number) {
  ctx.fillStyle = colors.text.muted;
  ctx.font = "9px system-ui";
  ctx.textAlign = "left";

  const labels = ["Captures", "Asserts"];
  labels.forEach((label, i) => {
    const y = startY + i * (TRACK_HEIGHT + TRACK_GAP) + TRACK_HEIGHT / 2 + 3;
    ctx.fillText(label, 8, y);
  });
}

// --- Coordinate transforms ---

export function msToScreen(
  ms: number,
  trackX: number,
  trackW: number,
  vp: TimelineViewport,
): number {
  const range = vp.endMs - vp.startMs;
  if (range <= 0) return trackX;
  return trackX + ((ms - vp.startMs) / range) * trackW;
}

export function screenToMs(
  screenX: number,
  trackX: number,
  trackW: number,
  vp: TimelineViewport,
): number {
  const range = vp.endMs - vp.startMs;
  return vp.startMs + ((screenX - trackX) / trackW) * range;
}

// --- Helpers ---

function getTickInterval(rangeMs: number): number {
  if (rangeMs <= 100) return 10;
  if (rangeMs <= 500) return 50;
  if (rangeMs <= 1000) return 100;
  if (rangeMs <= 5000) return 500;
  if (rangeMs <= 10000) return 1000;
  return 2000;
}

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

export function hitTestFrame(
  screenX: number,
  screenY: number,
  trackX: number,
  trackW: number,
  rulerHeight: number,
  frames: TrackFrame[],
  viewport: TimelineViewport,
): number {
  const trackY = rulerHeight;
  if (screenY < trackY || screenY > trackY + TRACK_HEIGHT) return -1;

  for (let i = 0; i < frames.length; i++) {
    const px = msToScreen(frames[i].offset_ms, trackX, trackW, viewport);
    const dist = Math.abs(screenX - px);
    if (dist < 10) return i;
  }
  return -1;
}

export const TIMELINE_HEADER_WIDTH = HEADER_WIDTH;
export const TIMELINE_RULER_HEIGHT = RULER_HEIGHT;
export const TIMELINE_TRACK_HEIGHT = TRACK_HEIGHT;
export const TIMELINE_TOTAL_HEIGHT = RULER_HEIGHT + (TRACK_HEIGHT + TRACK_GAP) * 2 + 16;
