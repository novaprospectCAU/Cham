import type { DOMNode, Mismatch, Severity } from "./types.js";

/**
 * Compare DOM tree structures and detect added/removed/changed nodes.
 */
export function generateNodeTreeMismatches(
  anchor: string,
  offsetMs: number,
  expectedTree: DOMNode[],
  actualTree: DOMNode[],
  mismatchIdPrefix: string,
): Mismatch[] {
  const mismatches: Mismatch[] = [];
  let counter = 0;

  function compare(
    expected: DOMNode[],
    actual: DOMNode[],
    basePath: string,
  ): void {
    const maxLen = Math.max(expected.length, actual.length);

    for (let i = 0; i < maxLen; i++) {
      const exp = expected[i];
      const act = actual[i];
      const nodePath = basePath ? `${basePath}[${i}]` : `[${i}]`;

      if (!exp && act) {
        // Node added
        mismatches.push({
          id: `${mismatchIdPrefix}-nodetree-${counter++}`,
          frame_anchor: anchor,
          frame_offset_ms: offsetMs,
          layer: "nodetree",
          component: act.tag,
          path: nodePath,
          expected: null,
          actual: summarizeNode(act),
          severity: "high",
        });
        continue;
      }

      if (exp && !act) {
        // Node removed
        mismatches.push({
          id: `${mismatchIdPrefix}-nodetree-${counter++}`,
          frame_anchor: anchor,
          frame_offset_ms: offsetMs,
          layer: "nodetree",
          component: exp.tag,
          path: nodePath,
          expected: summarizeNode(exp),
          actual: null,
          severity: "high",
        });
        continue;
      }

      // Both exist — compare properties
      if (exp.tag !== act.tag) {
        mismatches.push({
          id: `${mismatchIdPrefix}-nodetree-${counter++}`,
          frame_anchor: anchor,
          frame_offset_ms: offsetMs,
          layer: "nodetree",
          component: exp.tag,
          path: `${nodePath}.tag`,
          expected: exp.tag,
          actual: act.tag,
          severity: "high",
        });
      }

      if (exp.id !== act.id) {
        mismatches.push({
          id: `${mismatchIdPrefix}-nodetree-${counter++}`,
          frame_anchor: anchor,
          frame_offset_ms: offsetMs,
          layer: "nodetree",
          component: exp.tag,
          path: `${nodePath}.id`,
          expected: exp.id,
          actual: act.id,
          severity: "medium",
        });
      }

      if (!classesEqual(exp.classes, act.classes)) {
        mismatches.push({
          id: `${mismatchIdPrefix}-nodetree-${counter++}`,
          frame_anchor: anchor,
          frame_offset_ms: offsetMs,
          layer: "nodetree",
          component: exp.tag,
          path: `${nodePath}.classes`,
          expected: exp.classes,
          actual: act.classes,
          severity: "medium",
        });
      }

      if (normalizeText(exp.textContent) !== normalizeText(act.textContent)) {
        mismatches.push({
          id: `${mismatchIdPrefix}-nodetree-${counter++}`,
          frame_anchor: anchor,
          frame_offset_ms: offsetMs,
          layer: "nodetree",
          component: exp.tag,
          path: `${nodePath}.textContent`,
          expected: exp.textContent,
          actual: act.textContent,
          severity: "medium",
        });
      }

      // Recurse into children
      const expChildren = exp.children || [];
      const actChildren = act.children || [];
      if (expChildren.length > 0 || actChildren.length > 0) {
        compare(expChildren, actChildren, `${nodePath} > ${exp.tag}`);
      }
    }
  }

  compare(expectedTree, actualTree, "");
  return mismatches;
}

function summarizeNode(
  node: DOMNode,
): { tag: string; id?: string; classes?: string[] } {
  return {
    tag: node.tag,
    id: node.id,
    classes: node.classes,
  };
}

function classesEqual(
  a: string[] | undefined,
  b: string[] | undefined,
): boolean {
  const aSet = new Set(a || []);
  const bSet = new Set(b || []);
  if (aSet.size !== bSet.size) return false;
  for (const cls of aSet) {
    if (!bSet.has(cls)) return false;
  }
  return true;
}

function normalizeText(text: string | undefined): string {
  return (text || "").trim();
}
