export { ScenarioEngine, type ScenarioEngineOptions } from "./runner.js";
export { ScenarioDefinitionSchema } from "./schemas.js";
export {
  captureFrame,
  captureDom,
  captureScreenshot,
  captureStyles,
  capturePerformance,
  setupEventCollection,
} from "./capture.js";
export {
  executeAnchorCaptures,
  type AnchorContext,
} from "./anchor.js";
export type {
  StepAction,
  CaptureType,
  ScenarioStep,
  AnchorCapture,
  AnchorDefinition,
  AssertionType,
  ScenarioAssertion,
  ScenarioDefinition,
  DOMNode,
  BrowserEvent,
  StyleMap,
  PerformanceMetrics,
  FrameCapture,
  AssertionResult,
  ScenarioStatus,
  ScenarioResult,
  ScenarioEntry,
} from "./types.js";
