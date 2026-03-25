import type { Page } from "playwright";
import type { AnchorDefinition, FrameCapture } from "./types.js";
import { captureFrame } from "./capture.js";

export interface AnchorContext {
  name: string;
  startTime: number;
  definition: AnchorDefinition;
}

/**
 * Execute the capture schedule for a given anchor.
 * Waits the appropriate offset_ms at each point and captures.
 */
export async function executeAnchorCaptures(
  page: Page,
  context: AnchorContext,
): Promise<FrameCapture[]> {
  const frames: FrameCapture[] = [];

  // Sort captures by offset ascending
  const sorted = [...context.definition.captures].sort(
    (a, b) => a.offset_ms - b.offset_ms,
  );

  let elapsed = 0;

  for (const cap of sorted) {
    const wait = cap.offset_ms - elapsed;
    if (wait > 0) {
      await page.waitForTimeout(wait);
    }

    const frame = await captureFrame(
      page,
      context.name,
      cap.offset_ms,
      cap.capture,
      context.startTime,
    );

    frames.push(frame);
    elapsed = cap.offset_ms;
  }

  return frames;
}
