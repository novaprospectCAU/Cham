export type DiffLayer = "visual" | "layout" | "nodetree" | "style" | "event" | "assertion";
export type Severity = "high" | "medium" | "low";

export interface Mismatch {
  id: string;
  frame_anchor: string;
  frame_offset_ms: number;
  layer: DiffLayer;
  component?: string;
  path?: string;
  expected: unknown;
  actual: unknown;
  severity: Severity;
  screenshot_diff?: string;
}

export interface DiffLog {
  session_id: string;
  timestamp: string;
  scenario_id: string;
  overall: "pass" | "fail";
  summary: { high: number; medium: number; low: number };
  mismatches: Mismatch[];
  coverage: CoverageReport;
  ai_action: string;
}

export interface CoverageReport {
  total_scenarios: number;
  passed: number;
  failed: number;
  not_run: number;
  uncovered_branches: string[];
}

export interface Tolerances {
  layout_px: number;
  timing_ms: number;
  color_delta: number;
  fps_min: number;
}

export const DEFAULT_TOLERANCES: Tolerances = {
  layout_px: 2,
  timing_ms: 50,
  color_delta: 5,
  fps_min: 55,
};

// Re-used from scenario-engine types (kept minimal to avoid cross-dep)
export interface DOMNode {
  tag: string;
  id?: string;
  classes?: string[];
  attributes?: Record<string, string>;
  textContent?: string;
  children?: DOMNode[];
  rect?: { x: number; y: number; width: number; height: number };
}

export type StyleMap = Record<string, Record<string, string>>;

export interface BrowserEvent {
  type: string;
  target_selector: string;
  timestamp_ms: number;
}

export interface PerformanceMetrics {
  fps?: number;
  memory_mb?: number;
  render_time_ms?: number;
}

export interface FrameCapture {
  timestamp_ms: number;
  anchor: string;
  anchor_offset_ms: number;
  screenshot?: string;
  dom_tree?: DOMNode[];
  computed_styles?: StyleMap;
  event_log: BrowserEvent[];
  performance?: PerformanceMetrics;
}

export interface AssertionResult {
  assertion: {
    anchor: string;
    offset_ms: number;
    type: string;
    selector?: string;
    expected: unknown;
  };
  passed: boolean;
  actual?: unknown;
  error?: string;
}

export interface ScenarioResult {
  scenario_id: string;
  scenario_name: string;
  status: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  target_url: string;
  frames: FrameCapture[];
  assertions: AssertionResult[];
  summary: {
    total_assertions: number;
    passed: number;
    failed: number;
  };
}
