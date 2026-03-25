import type { AssertionResult, Mismatch } from "./types.js";

/**
 * Detect assertion regressions: assertions that passed in baseline
 * but fail in the actual result.
 */
export function generateAssertionMismatches(
  expectedAssertions: AssertionResult[],
  actualAssertions: AssertionResult[],
  mismatchIdPrefix: string,
): Mismatch[] {
  const mismatches: Mismatch[] = [];
  let counter = 0;

  for (let i = 0; i < expectedAssertions.length; i++) {
    const exp = expectedAssertions[i];
    const act = actualAssertions[i];

    if (!act) {
      // Assertion missing in actual
      mismatches.push({
        id: `${mismatchIdPrefix}-assert-${counter++}`,
        frame_anchor: exp.assertion.anchor,
        frame_offset_ms: exp.assertion.offset_ms,
        layer: "assertion",
        component: exp.assertion.selector || exp.assertion.type,
        path: `assertions[${i}]`,
        expected: { passed: exp.passed, actual: exp.actual },
        actual: null,
        severity: "high",
      });
      continue;
    }

    // Regression: was passing, now failing
    if (exp.passed && !act.passed) {
      mismatches.push({
        id: `${mismatchIdPrefix}-assert-${counter++}`,
        frame_anchor: act.assertion.anchor,
        frame_offset_ms: act.assertion.offset_ms,
        layer: "assertion",
        component: act.assertion.selector || act.assertion.type,
        path: `assertions[${i}]`,
        expected: {
          passed: true,
          type: exp.assertion.type,
          expected_value: exp.assertion.expected,
          actual_value: exp.actual,
        },
        actual: {
          passed: false,
          type: act.assertion.type,
          expected_value: act.assertion.expected,
          actual_value: act.actual,
          error: act.error,
        },
        severity: "high",
      });
    }
  }

  return mismatches;
}
