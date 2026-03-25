export { DiffEngine, type DiffEngineOptions } from "./engine.js";
export {
  generateVisualMismatches,
  compareScreenshots,
} from "./visual.js";
export { generateLayoutMismatches } from "./layout.js";
export { generateNodeTreeMismatches } from "./nodetree.js";
export { generateAssertionMismatches } from "./assertions.js";
export { buildDiffLog, filterBySeverity } from "./reporter.js";
export type {
  DiffLayer,
  Severity,
  Mismatch,
  DiffLog,
  CoverageReport,
  Tolerances,
} from "./types.js";
export { DEFAULT_TOLERANCES } from "./types.js";
