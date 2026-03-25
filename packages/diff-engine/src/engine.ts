import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";
import type {
  DiffLog,
  CoverageReport,
  Mismatch,
  ScenarioResult,
  Tolerances,
  Severity,
  FrameCapture,
} from "./types.js";
import { DEFAULT_TOLERANCES } from "./types.js";
import { generateVisualMismatches } from "./visual.js";
import { generateLayoutMismatches } from "./layout.js";
import { generateNodeTreeMismatches } from "./nodetree.js";
import { generateAssertionMismatches } from "./assertions.js";
import { buildDiffLog, filterBySeverity } from "./reporter.js";

export interface DiffEngineOptions {
  rootDir: string;
}

export class DiffEngine {
  private readonly rootDir: string;
  private readonly resultsDir: string;
  private readonly baselinesDir: string;
  private readonly diffsDir: string;
  private readonly latestDir: string;
  private readonly scenariosDir: string;
  private readonly specsDir: string;

  constructor(options: DiffEngineOptions) {
    this.rootDir = options.rootDir;
    this.resultsDir = path.join(options.rootDir, "results");
    this.baselinesDir = path.join(this.resultsDir, "baselines");
    this.diffsDir = path.join(this.resultsDir, "diffs");
    this.latestDir = path.join(this.resultsDir, "latest");
    this.scenariosDir = path.join(options.rootDir, "scenarios");
    this.specsDir = path.join(options.rootDir, "specs", "current");
  }

  /**
   * Set the current latest result as the baseline for a scenario.
   */
  setBaseline(scenarioId: string): { success: boolean; error?: string } {
    const latestDir = path.join(this.latestDir, scenarioId);
    if (!fs.existsSync(path.join(latestDir, "result.json"))) {
      return {
        success: false,
        error: JSON.stringify({
          error: "NO_LATEST_RESULT",
          scenario_id: scenarioId,
        }),
      };
    }

    const baselineDir = path.join(this.baselinesDir, scenarioId);
    fs.mkdirSync(baselineDir, { recursive: true });
    this.copyDirSync(latestDir, baselineDir);

    return { success: true };
  }

  /**
   * Compare baseline vs latest for a scenario.
   */
  diffScenario(scenarioId: string): DiffLog {
    const baseline = this.loadResult(
      path.join(this.baselinesDir, scenarioId, "result.json"),
    );
    const latest = this.loadResult(
      path.join(this.latestDir, scenarioId, "result.json"),
    );

    if (!baseline) {
      return this.errorDiffLog(scenarioId, "NO_BASELINE");
    }
    if (!latest) {
      return this.errorDiffLog(scenarioId, "NO_LATEST_RESULT");
    }

    const tolerances = this.loadTolerances();
    const diffLog = this.compareResults(scenarioId, baseline, latest, tolerances);

    // Save diff log
    this.saveDiffLog(scenarioId, diffLog);

    return diffLog;
  }

  /**
   * Compare two scenario results across all layers.
   */
  compareResults(
    scenarioId: string,
    expected: ScenarioResult,
    actual: ScenarioResult,
    tolerances: Tolerances,
  ): DiffLog {
    const sessionId = `diff-${Date.now()}`;
    const allMismatches: Mismatch[] = [];

    // Match frames by anchor + offset_ms
    const expectedFrames = this.indexFrames(expected.frames);
    const actualFrames = this.indexFrames(actual.frames);

    const allKeys = new Set([
      ...expectedFrames.keys(),
      ...actualFrames.keys(),
    ]);

    let frameCounter = 0;
    for (const key of allKeys) {
      const expFrame = expectedFrames.get(key);
      const actFrame = actualFrames.get(key);
      const prefix = `m${frameCounter++}`;

      if (!expFrame || !actFrame) continue;

      const [anchor, offsetStr] = key.split("@");
      const offsetMs = parseInt(offsetStr, 10);

      // Layer 1: Visual diff
      if (expFrame.screenshot && actFrame.screenshot) {
        const expScreenshot = path.join(
          this.baselinesDir,
          scenarioId,
          expFrame.screenshot,
        );
        const actScreenshot = path.join(
          this.latestDir,
          scenarioId,
          actFrame.screenshot,
        );
        const diffOutput = path.join(
          this.diffsDir,
          scenarioId,
          "diff_images",
          `${prefix}-visual.png`,
        );

        allMismatches.push(
          ...generateVisualMismatches(
            anchor,
            offsetMs,
            expScreenshot,
            actScreenshot,
            diffOutput,
            prefix,
          ),
        );
      }

      // Layer 2: Layout diff
      if (expFrame.dom_tree && actFrame.dom_tree) {
        allMismatches.push(
          ...generateLayoutMismatches(
            anchor,
            offsetMs,
            expFrame.dom_tree,
            actFrame.dom_tree,
            tolerances,
            prefix,
          ),
        );
      }

      // Layer 3: NodeTree diff
      if (expFrame.dom_tree && actFrame.dom_tree) {
        allMismatches.push(
          ...generateNodeTreeMismatches(
            anchor,
            offsetMs,
            expFrame.dom_tree,
            actFrame.dom_tree,
            prefix,
          ),
        );
      }
    }

    // Layer 4: Assertion regressions
    allMismatches.push(
      ...generateAssertionMismatches(
        expected.assertions,
        actual.assertions,
        "a",
      ),
    );

    const coverage = this.getCoverage();
    return buildDiffLog(scenarioId, sessionId, allMismatches, coverage);
  }

  /**
   * Get the latest diff log for a scenario.
   */
  getLatestDiffLog(scenarioId: string): DiffLog | null {
    const logPath = path.join(
      this.diffsDir,
      scenarioId,
      "diff_log.json",
    );
    if (!fs.existsSync(logPath)) return null;
    return JSON.parse(fs.readFileSync(logPath, "utf-8")) as DiffLog;
  }

  /**
   * Get diff logs, optionally filtered by scenario and severity.
   */
  getDiffLog(scenarioId?: string, severity?: Severity): DiffLog[] {
    const logs: DiffLog[] = [];

    if (scenarioId) {
      const log = this.getLatestDiffLog(scenarioId);
      if (log) logs.push(log);
    } else {
      // Get all diff logs
      if (fs.existsSync(this.diffsDir)) {
        const dirs = fs
          .readdirSync(this.diffsDir, { withFileTypes: true })
          .filter((d) => d.isDirectory());
        for (const dir of dirs) {
          const log = this.getLatestDiffLog(dir.name);
          if (log) logs.push(log);
        }
      }
    }

    if (severity) {
      return logs.map((log) => ({
        ...log,
        mismatches: filterBySeverity(log.mismatches, severity),
      }));
    }

    return logs;
  }

  /**
   * Get coverage report across all scenarios.
   */
  getCoverage(): CoverageReport {
    const scenarioFiles = fs.existsSync(this.scenariosDir)
      ? fs
          .readdirSync(this.scenariosDir)
          .filter((f) => f.endsWith(".scenario.yaml"))
      : [];

    let passed = 0;
    let failed = 0;
    let notRun = 0;

    for (const file of scenarioFiles) {
      const id = file.replace(".scenario.yaml", "");
      const resultPath = path.join(this.latestDir, id, "result.json");

      if (!fs.existsSync(resultPath)) {
        notRun++;
        continue;
      }

      try {
        const result = JSON.parse(
          fs.readFileSync(resultPath, "utf-8"),
        ) as ScenarioResult;
        if (result.status === "passed") passed++;
        else failed++;
      } catch {
        notRun++;
      }
    }

    return {
      total_scenarios: scenarioFiles.length,
      passed,
      failed,
      not_run: notRun,
      uncovered_branches: this.findUncoveredBranches(),
    };
  }

  // --- Private helpers ---

  private loadResult(filePath: string): ScenarioResult | null {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as ScenarioResult;
  }

  private loadTolerances(): Tolerances {
    const tolPath = path.join(this.specsDir, "tolerances.yaml");
    if (!fs.existsSync(tolPath)) return DEFAULT_TOLERANCES;

    try {
      const raw = yaml.load(fs.readFileSync(tolPath, "utf-8")) as {
        tolerances?: Partial<Tolerances>;
      };
      return { ...DEFAULT_TOLERANCES, ...raw.tolerances };
    } catch {
      return DEFAULT_TOLERANCES;
    }
  }

  private indexFrames(
    frames: FrameCapture[],
  ): Map<string, FrameCapture> {
    const map = new Map<string, FrameCapture>();
    for (const frame of frames) {
      const key = `${frame.anchor}@${frame.anchor_offset_ms}`;
      map.set(key, frame);
    }
    return map;
  }

  private saveDiffLog(scenarioId: string, diffLog: DiffLog): void {
    const diffDir = path.join(this.diffsDir, scenarioId);
    fs.mkdirSync(diffDir, { recursive: true });
    fs.writeFileSync(
      path.join(diffDir, "diff_log.json"),
      JSON.stringify(diffLog, null, 2),
    );
  }

  private findUncoveredBranches(): string[] {
    // Check scenario assertions for common uncovered cases
    const branches: string[] = [];
    const scenarioFiles = fs.existsSync(this.scenariosDir)
      ? fs
          .readdirSync(this.scenariosDir)
          .filter((f) => f.endsWith(".scenario.yaml"))
      : [];

    for (const file of scenarioFiles) {
      const id = file.replace(".scenario.yaml", "");
      const baselinePath = path.join(
        this.baselinesDir,
        id,
        "result.json",
      );
      if (!fs.existsSync(baselinePath)) {
        branches.push(`${id}: baseline 미설정`);
      }
    }

    return branches;
  }

  private errorDiffLog(scenarioId: string, errorCode: string): DiffLog {
    return {
      session_id: `error-${Date.now()}`,
      timestamp: new Date().toISOString(),
      scenario_id: scenarioId,
      overall: "fail",
      summary: { high: 0, medium: 0, low: 0 },
      mismatches: [],
      coverage: this.getCoverage(),
      ai_action: `오류: ${errorCode}. baseline을 먼저 설정하세요.`,
    };
  }

  private copyDirSync(src: string, dest: string): void {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        this.copyDirSync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}
