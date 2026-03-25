import type { BrowserEvent, Mismatch, Severity, Tolerances } from "./types.js";

/**
 * Compare event sequences between expected and actual captures.
 */
export function generateEventMismatches(
  anchor: string,
  offsetMs: number,
  expectedEvents: BrowserEvent[],
  actualEvents: BrowserEvent[],
  tolerances: Tolerances,
  mismatchIdPrefix: string,
): Mismatch[] {
  const mismatches: Mismatch[] = [];
  let counter = 0;

  // Compare event count
  if (expectedEvents.length !== actualEvents.length) {
    mismatches.push({
      id: `${mismatchIdPrefix}-event-${counter++}`,
      frame_anchor: anchor,
      frame_offset_ms: offsetMs,
      layer: "event",
      path: "event_count",
      expected: expectedEvents.length,
      actual: actualEvents.length,
      severity: expectedEvents.length === 0 || actualEvents.length === 0 ? "high" : "medium",
    });
  }

  // Compare events in sequence
  const maxLen = Math.min(expectedEvents.length, actualEvents.length);
  for (let i = 0; i < maxLen; i++) {
    const exp = expectedEvents[i];
    const act = actualEvents[i];

    // Event type mismatch
    if (exp.type !== act.type) {
      mismatches.push({
        id: `${mismatchIdPrefix}-event-${counter++}`,
        frame_anchor: anchor,
        frame_offset_ms: offsetMs,
        layer: "event",
        component: `event[${i}]`,
        path: `events[${i}].type`,
        expected: exp.type,
        actual: act.type,
        severity: "high",
      });
      continue;
    }

    // Target mismatch
    if (exp.target_selector !== act.target_selector) {
      mismatches.push({
        id: `${mismatchIdPrefix}-event-${counter++}`,
        frame_anchor: anchor,
        frame_offset_ms: offsetMs,
        layer: "event",
        component: `event[${i}].${exp.type}`,
        path: `events[${i}].target`,
        expected: exp.target_selector,
        actual: act.target_selector,
        severity: "medium",
      });
    }

    // Timing mismatch (relative to first event)
    if (i > 0 && expectedEvents.length > 1 && actualEvents.length > 1) {
      const expDelta = exp.timestamp_ms - expectedEvents[0].timestamp_ms;
      const actDelta = act.timestamp_ms - actualEvents[0].timestamp_ms;
      const timingDiff = Math.abs(expDelta - actDelta);

      if (timingDiff > tolerances.timing_ms) {
        mismatches.push({
          id: `${mismatchIdPrefix}-event-${counter++}`,
          frame_anchor: anchor,
          frame_offset_ms: offsetMs,
          layer: "event",
          component: `event[${i}].${exp.type}`,
          path: `events[${i}].timing`,
          expected: { relative_ms: expDelta },
          actual: { relative_ms: actDelta, diff_ms: timingDiff },
          severity: getTimingSeverity(timingDiff, tolerances.timing_ms),
        });
      }
    }
  }

  return mismatches;
}

function getTimingSeverity(diff: number, tolerance: number): Severity {
  if (diff > tolerance * 5) return "high";
  if (diff > tolerance) return "medium";
  return "low";
}
