import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";
import type { Mismatch, ScenarioResult } from "./types.js";

interface SpecPage {
  components: string[];
  assertions?: Array<{ condition: string }>;
}

interface PagesSpec {
  pages: Record<string, SpecPage>;
}

/**
 * Check scenario results against specs/current/pages.yaml assertions.
 * Parses natural-language conditions and evaluates what it can.
 */
export function checkSpecAssertions(
  specsDir: string,
  result: ScenarioResult,
  mismatchIdPrefix: string,
): Mismatch[] {
  const pagesPath = path.join(specsDir, "pages.yaml");
  if (!fs.existsSync(pagesPath)) return [];

  let pagesSpec: PagesSpec;
  try {
    pagesSpec = yaml.load(fs.readFileSync(pagesPath, "utf-8")) as PagesSpec;
  } catch {
    return [];
  }

  if (!pagesSpec?.pages) return [];

  const mismatches: Mismatch[] = [];
  let counter = 0;

  // Flatten all DOM nodes from all frames
  const allDomNodes = new Set<string>();
  for (const frame of result.frames) {
    if (frame.dom_tree) {
      collectNodeTags(frame.dom_tree, allDomNodes);
    }
  }

  for (const [pageName, page] of Object.entries(pagesSpec.pages)) {
    // Check component presence
    if (page.components) {
      for (const component of page.components) {
        // Try to find the component in DOM by tag, id, or class
        const found = findComponentInDom(component, result);
        if (!found) {
          mismatches.push({
            id: `${mismatchIdPrefix}-spec-${counter++}`,
            frame_anchor: "spec",
            frame_offset_ms: 0,
            layer: "assertion",
            component,
            path: `pages.${pageName}.components.${component}`,
            expected: { component, present: true },
            actual: { present: false },
            severity: "medium",
          });
        }
      }
    }

    // Evaluate spec assertions
    if (page.assertions) {
      for (const assertion of page.assertions) {
        const evalResult = evaluateSpecCondition(assertion.condition, result);
        if (evalResult !== null && !evalResult.passed) {
          mismatches.push({
            id: `${mismatchIdPrefix}-spec-${counter++}`,
            frame_anchor: "spec",
            frame_offset_ms: 0,
            layer: "assertion",
            component: pageName,
            path: `pages.${pageName}.assertions`,
            expected: { condition: assertion.condition, passed: true },
            actual: { passed: false, reason: evalResult.reason },
            severity: "medium",
          });
        }
      }
    }
  }

  return mismatches;
}

function collectNodeTags(
  nodes: any[],
  tags: Set<string>,
): void {
  for (const node of nodes) {
    tags.add(node.tag);
    if (node.id) tags.add(node.id);
    if (node.classes) {
      for (const cls of node.classes) tags.add(cls);
    }
    if (node.children) collectNodeTags(node.children, tags);
  }
}

function findComponentInDom(
  componentName: string,
  result: ScenarioResult,
): boolean {
  // Heuristic: look for the component name as a tag, id, class, or data attribute
  const lower = componentName.toLowerCase();
  const kebab = camelToKebab(componentName);

  for (const frame of result.frames) {
    if (!frame.dom_tree) continue;
    if (searchDomTree(frame.dom_tree, lower, kebab)) return true;
  }
  return false;
}

function searchDomTree(
  nodes: any[],
  lower: string,
  kebab: string,
): boolean {
  for (const node of nodes) {
    if (node.tag === lower || node.tag === kebab) return true;
    if (node.id?.toLowerCase() === lower) return true;
    if (node.classes?.some((c: string) => c.toLowerCase().includes(lower))) return true;
    if (node.attributes) {
      for (const [, val] of Object.entries(node.attributes)) {
        if (typeof val === "string" && val.toLowerCase().includes(lower)) return true;
      }
    }
    if (node.children && searchDomTree(node.children, lower, kebab)) return true;
  }
  return false;
}

function camelToKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

interface ConditionResult {
  passed: boolean;
  reason?: string;
}

function evaluateSpecCondition(
  condition: string,
  result: ScenarioResult,
): ConditionResult | null {
  // Parse simple conditions like "Component.visible == true when ..."
  const visibleMatch = condition.match(
    /(\w+)\.visible\s*==\s*(true|false)/i,
  );
  if (visibleMatch) {
    const component = visibleMatch[1].toLowerCase();
    const expected = visibleMatch[2] === "true";
    const found = findComponentInDom(component, result);
    if (found !== expected) {
      return { passed: false, reason: `${component} visible=${found}, expected=${expected}` };
    }
    return { passed: true };
  }

  // Parse "Component.status == 'value'"
  const statusMatch = condition.match(
    /(\w+)\.status\s*==\s*'(\w+)'/i,
  );
  if (statusMatch) {
    // Can't fully evaluate status without runtime, skip
    return null;
  }

  // Can't parse this condition
  return null;
}
