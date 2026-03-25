import type { StyleMap, Mismatch, Severity, Tolerances } from "./types.js";

/**
 * Compare computed styles between expected and actual captures.
 */
export function generateStyleMismatches(
  anchor: string,
  offsetMs: number,
  expectedStyles: StyleMap,
  actualStyles: StyleMap,
  tolerances: Tolerances,
  mismatchIdPrefix: string,
): Mismatch[] {
  const mismatches: Mismatch[] = [];
  let counter = 0;

  const allSelectors = new Set([
    ...Object.keys(expectedStyles),
    ...Object.keys(actualStyles),
  ]);

  for (const selector of allSelectors) {
    const expProps = expectedStyles[selector];
    const actProps = actualStyles[selector];

    if (!expProps || !actProps) continue;

    for (const prop of Object.keys(expProps)) {
      const expVal = expProps[prop];
      const actVal = actProps[prop];

      if (expVal === actVal) continue;

      // Check if it's a color property and apply color_delta tolerance
      const isColor = prop.includes("color");
      if (isColor && isWithinColorTolerance(expVal, actVal, tolerances.color_delta)) {
        continue;
      }

      const severity = getStyleSeverity(prop);

      mismatches.push({
        id: `${mismatchIdPrefix}-style-${counter++}`,
        frame_anchor: anchor,
        frame_offset_ms: offsetMs,
        layer: "style",
        component: selector,
        path: `${selector}.${prop}`,
        expected: expVal,
        actual: actVal,
        severity,
      });
    }
  }

  return mismatches;
}

function getStyleSeverity(prop: string): Severity {
  // High severity for visibility-affecting properties
  const highProps = ["display", "opacity", "position"];
  if (highProps.includes(prop)) return "high";

  // Medium for visual properties
  const mediumProps = ["color", "background-color", "font-size", "font-weight"];
  if (mediumProps.includes(prop)) return "medium";

  return "low";
}

/**
 * Check if two color values are within tolerance using simple RGB comparison.
 */
function isWithinColorTolerance(
  expected: string,
  actual: string,
  maxDelta: number,
): boolean {
  const expRgb = parseRgb(expected);
  const actRgb = parseRgb(actual);
  if (!expRgb || !actRgb) return false;

  const delta = Math.sqrt(
    (expRgb.r - actRgb.r) ** 2 +
    (expRgb.g - actRgb.g) ** 2 +
    (expRgb.b - actRgb.b) ** 2,
  );

  return delta <= maxDelta;
}

function parseRgb(
  color: string,
): { r: number; g: number; b: number } | null {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
  };
}
