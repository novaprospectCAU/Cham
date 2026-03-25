import * as fs from "node:fs";
import * as path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import type { Mismatch, Severity } from "./types.js";

export interface VisualDiffResult {
  mismatchRatio: number;
  diffPixels: number;
  totalPixels: number;
  diffImagePath?: string;
}

/**
 * Compare two PNG screenshots using pixelmatch.
 */
export function compareScreenshots(
  expectedPath: string,
  actualPath: string,
  diffOutputPath: string,
  colorThreshold: number = 0.1,
): VisualDiffResult {
  if (!fs.existsSync(expectedPath) || !fs.existsSync(actualPath)) {
    return { mismatchRatio: 1, diffPixels: -1, totalPixels: -1 };
  }

  const expectedPng = PNG.sync.read(fs.readFileSync(expectedPath));
  const actualPng = PNG.sync.read(fs.readFileSync(actualPath));

  // Handle size mismatch: use the larger dimensions
  const width = Math.max(expectedPng.width, actualPng.width);
  const height = Math.max(expectedPng.height, actualPng.height);

  // Resize images to match if needed
  const expected = resizeImage(expectedPng, width, height);
  const actual = resizeImage(actualPng, width, height);

  const diff = new PNG({ width, height });
  const totalPixels = width * height;

  const diffPixels = pixelmatch(
    expected.data,
    actual.data,
    diff.data,
    width,
    height,
    { threshold: colorThreshold },
  );

  // Write diff image
  fs.mkdirSync(path.dirname(diffOutputPath), { recursive: true });
  fs.writeFileSync(diffOutputPath, PNG.sync.write(diff));

  return {
    mismatchRatio: totalPixels > 0 ? diffPixels / totalPixels : 0,
    diffPixels,
    totalPixels,
    diffImagePath: diffOutputPath,
  };
}

/**
 * Generate visual mismatches from a screenshot comparison.
 */
export function generateVisualMismatches(
  anchor: string,
  offsetMs: number,
  expectedScreenshotPath: string,
  actualScreenshotPath: string,
  diffOutputPath: string,
  mismatchIdPrefix: string,
): Mismatch[] {
  const result = compareScreenshots(
    expectedScreenshotPath,
    actualScreenshotPath,
    diffOutputPath,
  );

  if (result.mismatchRatio === 0) return [];

  const severity = getVisualSeverity(result.mismatchRatio);

  return [
    {
      id: `${mismatchIdPrefix}-visual`,
      frame_anchor: anchor,
      frame_offset_ms: offsetMs,
      layer: "visual",
      expected: { screenshot: expectedScreenshotPath },
      actual: { screenshot: actualScreenshotPath },
      severity,
      screenshot_diff: result.diffImagePath,
    },
  ];
}

function getVisualSeverity(ratio: number): Severity {
  if (ratio > 0.05) return "high";
  if (ratio > 0.01) return "medium";
  return "low";
}

function resizeImage(png: PNG, width: number, height: number): PNG {
  if (png.width === width && png.height === height) return png;

  const resized = new PNG({ width, height });
  // Fill with transparent
  resized.data.fill(0);

  // Copy existing pixels
  for (let y = 0; y < png.height && y < height; y++) {
    for (let x = 0; x < png.width && x < width; x++) {
      const srcIdx = (y * png.width + x) * 4;
      const dstIdx = (y * width + x) * 4;
      resized.data[dstIdx] = png.data[srcIdx];
      resized.data[dstIdx + 1] = png.data[srcIdx + 1];
      resized.data[dstIdx + 2] = png.data[srcIdx + 2];
      resized.data[dstIdx + 3] = png.data[srcIdx + 3];
    }
  }

  return resized;
}
