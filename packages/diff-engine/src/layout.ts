import type { DOMNode, Mismatch, Severity, Tolerances } from "./types.js";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Compare layout rects between expected and actual DOM trees.
 */
export function generateLayoutMismatches(
  anchor: string,
  offsetMs: number,
  expectedTree: DOMNode[],
  actualTree: DOMNode[],
  tolerances: Tolerances,
  mismatchIdPrefix: string,
): Mismatch[] {
  const mismatches: Mismatch[] = [];
  let counter = 0;

  const expectedNodes = flattenNodes(expectedTree, "");
  const actualNodes = flattenNodes(actualTree, "");

  // Build lookup by node key (tag + id + classes)
  const actualMap = new Map<string, { node: DOMNode; path: string }>();
  for (const { node, path } of actualNodes) {
    const key = nodeKey(node);
    if (!actualMap.has(key)) {
      actualMap.set(key, { node, path });
    }
  }

  for (const { node: expectedNode, path: expectedPath } of expectedNodes) {
    const key = nodeKey(expectedNode);
    const actualEntry = actualMap.get(key);

    if (!actualEntry || !expectedNode.rect || !actualEntry.node.rect) continue;

    const diffs = compareRects(expectedNode.rect, actualEntry.node.rect);
    if (diffs.length === 0) continue;

    const maxDiff = Math.max(...diffs.map((d) => d.diff));
    if (maxDiff <= tolerances.layout_px) continue;

    const severity = getLayoutSeverity(maxDiff, tolerances.layout_px);

    mismatches.push({
      id: `${mismatchIdPrefix}-layout-${counter++}`,
      frame_anchor: anchor,
      frame_offset_ms: offsetMs,
      layer: "layout",
      component: expectedNode.tag + (expectedNode.id ? `#${expectedNode.id}` : ""),
      path: expectedPath,
      expected: expectedNode.rect,
      actual: actualEntry.node.rect,
      severity,
    });
  }

  return mismatches;
}

function compareRects(
  expected: Rect,
  actual: Rect,
): Array<{ prop: string; diff: number }> {
  const diffs: Array<{ prop: string; diff: number }> = [];

  for (const prop of ["x", "y", "width", "height"] as const) {
    const diff = Math.abs(expected[prop] - actual[prop]);
    if (diff > 0) {
      diffs.push({ prop, diff });
    }
  }

  return diffs;
}

function getLayoutSeverity(maxDiff: number, tolerance: number): Severity {
  if (maxDiff > tolerance * 5) return "high";
  if (maxDiff > tolerance) return "medium";
  return "low";
}

function nodeKey(node: DOMNode): string {
  const parts = [node.tag];
  if (node.id) parts.push(`#${node.id}`);
  if (node.classes && node.classes.length > 0) {
    parts.push(`.${node.classes.join(".")}`);
  }
  return parts.join("");
}

interface FlatNode {
  node: DOMNode;
  path: string;
}

function flattenNodes(nodes: DOMNode[], basePath: string): FlatNode[] {
  const result: FlatNode[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const nodePath = basePath
      ? `${basePath} > ${node.tag}[${i}]`
      : `${node.tag}[${i}]`;

    result.push({ node, path: nodePath });

    if (node.children) {
      result.push(...flattenNodes(node.children, nodePath));
    }
  }

  return result;
}
