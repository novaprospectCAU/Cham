import type { Page } from "playwright";
import type {
  DOMNode,
  FrameCapture,
  CaptureType,
  StyleMap,
  PerformanceMetrics,
} from "./types.js";

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
    frame.computed_styles = await captureStyles(page);
  }

  if (captureTypes.includes("screenshot")) {
    (frame as FrameCapture & { _screenshotBuffer?: Buffer })._screenshotBuffer =
      await captureScreenshot(page);
  }

  frame.performance = await capturePerformance(page);

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
 * Capture computed styles for key elements (those with id or significant classes).
 */
export async function captureStyles(page: Page): Promise<StyleMap> {
  const styles = await page.evaluate(() => {
    const STYLE_PROPS = [
      "color",
      "background-color",
      "font-family",
      "font-size",
      "font-weight",
      "line-height",
      "padding",
      "margin",
      "border",
      "box-shadow",
      "opacity",
      "display",
      "position",
    ];
    const result: Record<string, Record<string, string>> = {};

    const elements = document.querySelectorAll("[id], [class], button, a, input, h1, h2, h3, p");
    const seen = new Set<string>();

    for (const el of elements) {
      const selector =
        el.id
          ? `#${el.id}`
          : el.className && typeof el.className === "string"
            ? `${el.tagName.toLowerCase()}.${el.className.split(/\s+/).filter(Boolean).join(".")}`
            : el.tagName.toLowerCase();

      if (seen.has(selector)) continue;
      seen.add(selector);

      const computed = window.getComputedStyle(el);
      const props: Record<string, string> = {};
      for (const prop of STYLE_PROPS) {
        props[prop] = computed.getPropertyValue(prop);
      }
      result[selector] = props;

      if (seen.size >= 50) break;
    }

    return result;
  });

  return styles as StyleMap;
}

/**
 * Take a viewport screenshot and return as Buffer.
 */
export async function captureScreenshot(page: Page): Promise<Buffer> {
  return (await page.screenshot({ fullPage: false })) as Buffer;
}

/**
 * Capture performance metrics via CDP.
 */
export async function capturePerformance(
  page: Page,
): Promise<PerformanceMetrics> {
  try {
    const metrics = await page.evaluate(() => {
      const perf: { memory_mb?: number; render_time_ms?: number } = {};

      // Memory (Chrome only)
      const perfMemory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
      if (perfMemory) {
        perf.memory_mb = Math.round((perfMemory.usedJSHeapSize / 1024 / 1024) * 100) / 100;
      }

      // Last frame render time
      const entries = performance.getEntriesByType("paint");
      if (entries.length > 0) {
        const lastPaint = entries[entries.length - 1];
        perf.render_time_ms = Math.round(lastPaint.startTime * 100) / 100;
      }

      return perf;
    });

    return metrics;
  } catch {
    return {};
  }
}

/**
 * Set up browser event listeners to collect events into a shared array.
 * Call this once after page creation, before running steps.
 */
export async function setupEventCollection(
  page: Page,
): Promise<() => Promise<Array<{ type: string; target_selector: string; timestamp_ms: number }>>> {
  await page.evaluate(() => {
    const events: Array<{ type: string; target: string; time: number }> = [];
    (window as unknown as { __captured_events: typeof events }).__captured_events = events;

    for (const eventType of ["click", "input", "change", "submit", "focus", "blur"]) {
      document.addEventListener(
        eventType,
        (e) => {
          const target = e.target as Element;
          const selector = target.id
            ? `#${target.id}`
            : target.className && typeof target.className === "string"
              ? `${target.tagName.toLowerCase()}.${target.className.split(/\s+/).filter(Boolean).join(".")}`
              : target.tagName.toLowerCase();
          events.push({ type: eventType, target: selector, time: Date.now() });
        },
        true,
      );
    }
  });

  return async () => {
    const raw = await page.evaluate(() => {
      return (window as unknown as { __captured_events: Array<{ type: string; target: string; time: number }> }).__captured_events || [];
    });
    return raw.map((e) => ({
      type: e.type,
      target_selector: e.target,
      timestamp_ms: e.time,
    }));
  };
}
