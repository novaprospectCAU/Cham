// --- Scenario Definition (parsed from YAML) ---

export type StepAction = "click" | "type" | "navigate" | "wait" | "scroll";
export type CaptureType = "dom" | "screenshot";

export interface ScenarioStep {
  action: StepAction;
  selector?: string;
  value?: string;
  url?: string;
  ms?: number;
  anchor?: string;
  scroll_y?: number;
  scroll_x?: number;
}

export interface AnchorCapture {
  offset_ms: number;
  capture: CaptureType[];
}

export interface AnchorDefinition {
  name: string;
  captures: AnchorCapture[];
}

export type AssertionType = "selector_visible" | "selector_text" | "url_match";

export interface ScenarioAssertion {
  anchor: string;
  offset_ms: number;
  type: AssertionType;
  selector?: string;
  expected: unknown;
}

export interface DockerConfig {
  image: string;
  port: number;
  container_port?: number;
  env?: Record<string, string>;
  volumes?: string[];
  health_check?: string;
  health_timeout?: number;
}

export interface ScenarioDefinition {
  name: string;
  description: string;
  target_url: string;
  docker?: DockerConfig;
  steps: ScenarioStep[];
  anchors: AnchorDefinition[];
  assertions: ScenarioAssertion[];
}

// --- Capture Output ---

export interface DOMNode {
  tag: string;
  id?: string;
  classes?: string[];
  attributes?: Record<string, string>;
  textContent?: string;
  children?: DOMNode[];
  rect?: { x: number; y: number; width: number; height: number };
}

export interface BrowserEvent {
  type: string;
  target_selector: string;
  timestamp_ms: number;
}

export type StyleMap = Record<string, Record<string, string>>;

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

// --- Assertion Result ---

export interface AssertionResult {
  assertion: ScenarioAssertion;
  passed: boolean;
  actual?: unknown;
  error?: string;
}

// --- Scenario Result ---

export type ScenarioStatus =
  | "pending"
  | "running"
  | "passed"
  | "failed"
  | "error";

export interface ScenarioResult {
  scenario_id: string;
  scenario_name: string;
  status: ScenarioStatus;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  target_url: string;
  frames: FrameCapture[];
  assertions: AssertionResult[];
  error?: string;
  summary: {
    total_assertions: number;
    passed: number;
    failed: number;
  };
}

// --- Scenario Index Entry ---

export interface ScenarioEntry {
  id: string;
  name: string;
  description: string;
  target_url: string;
  file_path: string;
  last_result_status?: ScenarioStatus;
}
