import type { Page } from "playwright";
import type { DOMNode, FrameCapture, CaptureType } from "./types.js";

/**
 * Capture a frame at the current page state.
 */
export async function captureFrame(
  page: Page,
  anchor: string,
  anchorOffsetMs: number,
  captureTypes: CaptureType[],
  anchorStartTime: number,
): Promise<FrameCapture> {
  const frame: FrameCapture = {
    timestamp_ms: Date.now(),
    anchor,
    anchor_offset_ms: anchorOffsetMs,
    event_log: [],
  };

  if (captureTypes.includes("dom")) {
    frame.dom_tree = await captureDom(page);
  }

  if (captureTypes.includes("screenshot")) {
    // Return raw buffer; caller writes to disk and sets the path
    (frame as FrameCapture & { _screenshotBuffer?: Buffer })._screenshotBuffer =
      await captureScreenshot(page);
  }

  return frame;
}

/**
 * Capture the DOM tree by running serialization inside the browser.
 */
export async function captureDom(page: Page): Promise<DOMNode[]> {
  const tree = await page.evaluate(() => {
    const MAX_DEPTH = 15;
    const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG"]);
    const MAX_TEXT_LEN = 200;

    function serialize(el: Element, depth: number): unknown | null {
      if (depth > MAX_DEPTH) return null;
      if (SKIP_TAGS.has(el.tagName)) return null;

      const rect = el.getBoundingClientRect();
      const attrs: Record<string, string> = {};
      for (const attr of el.attributes) {
        if (
          attr.name.startsWith("data-") ||
          ["role", "type", "name", "href", "placeholder", "aria-label"].includes(
            attr.name,
          )
        ) {
          attrs[attr.name] = attr.value;
        }
      }

      const children: unknown[] = [];
      for (const child of el.children) {
        const serialized = serialize(child, depth + 1);
        if (serialized) children.push(serialized);
      }

      let textContent: string | undefined;
      if (children.length === 0 && el.textContent) {
        const trimmed = el.textContent.trim();
        if (trimmed.length > 0) {
          textContent =
            trimmed.length > MAX_TEXT_LEN
              ? trimmed.slice(0, MAX_TEXT_LEN) + "..."
              : trimmed;
        }
      }

      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || undefined,
        classes:
          el.className && typeof el.className === "string"
            ? el.className.split(/\s+/).filter(Boolean)
            : undefined,
        attributes: Object.keys(attrs).length > 0 ? attrs : undefined,
        textContent,
        children: children.length > 0 ? children : undefined,
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
      };
    }

    const body = document.body;
    if (!body) return [];

    const result: unknown[] = [];
    for (const child of body.children) {
      const serialized = serialize(child, 0);
      if (serialized) result.push(serialized);
    }
    return result;
  });

  return tree as DOMNode[];
}

/**
 * Take a viewport screenshot and return as Buffer.
 */
export async function captureScreenshot(page: Page): Promise<Buffer> {
  return (await page.screenshot({ fullPage: false })) as Buffer;
}
