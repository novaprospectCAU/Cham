import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";
import { chromium } from "playwright";
import type { Browser, Page } from "playwright";
import { ScenarioDefinitionSchema } from "./schemas.js";
import { executeAnchorCaptures, type AnchorContext } from "./anchor.js";
import { setupEventCollection } from "./capture.js";
import type {
  ScenarioDefinition,
  ScenarioEntry,
  ScenarioResult,
  ScenarioStatus,
  FrameCapture,
  AssertionResult,
  ScenarioAssertion,
} from "./types.js";

export interface ScenarioEngineOptions {
  rootDir: string;
  headless?: boolean;
}

export class ScenarioEngine {
  private readonly scenariosDir: string;
  private readonly resultsDir: string;
  private readonly resultsLatestDir: string;
  private readonly resultsHistoryDir: string;
  private readonly headless: boolean;

  constructor(options: ScenarioEngineOptions) {
    this.scenariosDir = path.join(options.rootDir, "scenarios");
    this.resultsDir = path.join(options.rootDir, "results");
    this.resultsLatestDir = path.join(this.resultsDir, "latest");
    this.resultsHistoryDir = path.join(this.resultsDir, "history");
    this.headless = options.headless ?? true;
  }

  /**
   * List all *.scenario.yaml files.
   */
  listScenarios(): ScenarioEntry[] {
    if (!fs.existsSync(this.scenariosDir)) return [];

    const files = fs
      .readdirSync(this.scenariosDir)
      .filter((f) => f.endsWith(".scenario.yaml"));

    return files.map((file) => {
      const id = file.replace(".scenario.yaml", "");
      const filePath = path.join(this.scenariosDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const raw = yaml.load(content) as Record<string, unknown>;

      // Check for latest result status
      let lastResultStatus: ScenarioStatus | undefined;
      const resultPath = path.join(
        this.resultsLatestDir,
        id,
        "result.json",
      );
      if (fs.existsSync(resultPath)) {
        try {
          const result = JSON.parse(
            fs.readFileSync(resultPath, "utf-8"),
          ) as ScenarioResult;
          lastResultStatus = result.status;
        } catch {
          // ignore parse errors
        }
      }

      return {
        id,
        name: (raw.name as string) || id,
        description: (raw.description as string) || "",
        target_url: (raw.target_url as string) || "",
        file_path: filePath,
        last_result_status: lastResultStatus,
      };
    });
  }

  /**
   * Load and validate a scenario definition.
   */
  loadScenario(id: string): ScenarioDefinition {
    const filePath = path.join(this.scenariosDir, `${id}.scenario.yaml`);
    if (!fs.existsSync(filePath)) {
      throw new Error(
        JSON.stringify({
          error: "SCENARIO_NOT_FOUND",
          scenario_id: id,
          path: filePath,
        }),
      );
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const raw = yaml.load(content);
    const parsed = ScenarioDefinitionSchema.safeParse(raw);

    if (!parsed.success) {
      throw new Error(
        JSON.stringify({
          error: "SCENARIO_VALIDATION_FAILED",
          scenario_id: id,
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        }),
      );
    }

    return parsed.data as ScenarioDefinition;
  }

  /**
   * Execute a scenario end-to-end.
   */
  async runScenario(id: string): Promise<ScenarioResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    let scenario: ScenarioDefinition;
    try {
      scenario = this.loadScenario(id);
    } catch (err) {
      return this.errorResult(id, startedAt, startTime, err);
    }

    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({ headless: this.headless });
      const page = await browser.newPage();

      // Set up event collection
      let getCollectedEvents: Awaited<ReturnType<typeof setupEventCollection>> | null = null;

      const allFrames: FrameCapture[] = [];

      // Build anchor lookup
      const anchorMap = new Map(
        scenario.anchors.map((a) => [a.name, a]),
      );

      // Execute steps
      for (const step of scenario.steps) {
        switch (step.action) {
          case "navigate":
            await page.goto(step.url!, { waitUntil: "domcontentloaded" });
            // Set up event collection after first navigation
            if (!getCollectedEvents) {
              getCollectedEvents = await setupEventCollection(page);
            }
            break;
          case "click":
            await page.click(step.selector!);
            break;
          case "type":
            await page.fill(step.selector!, step.value!);
            break;
          case "wait":
            await page.waitForTimeout(step.ms!);
            break;
          case "scroll":
            await page.evaluate(
              ([x, y]) => window.scrollBy(x, y),
              [step.scroll_x || 0, step.scroll_y || 0],
            );
            break;
        }

        // If this step is an anchor, execute captures
        if (step.anchor && anchorMap.has(step.anchor)) {
          const anchorDef = anchorMap.get(step.anchor)!;
          const ctx: AnchorContext = {
            name: step.anchor,
            startTime: Date.now(),
            definition: anchorDef,
          };
          const frames = await executeAnchorCaptures(page, ctx);
          allFrames.push(...frames);
        }
      }

      // Attach collected browser events to all frames
      if (getCollectedEvents) {
        const events = await getCollectedEvents();
        for (const frame of allFrames) {
          frame.event_log = events.filter(
            (e) => e.timestamp_ms <= frame.timestamp_ms,
          );
        }
      }

      // Evaluate assertions
      const assertionResults = await this.evaluateAssertions(
        page,
        scenario.assertions,
        allFrames,
      );

      const failedCount = assertionResults.filter((a) => !a.passed).length;
      const status: ScenarioStatus =
        failedCount > 0 ? "failed" : "passed";

      const result: ScenarioResult = {
        scenario_id: id,
        scenario_name: scenario.name,
        status,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        target_url: scenario.target_url,
        frames: allFrames,
        assertions: assertionResults,
        summary: {
          total_assertions: assertionResults.length,
          passed: assertionResults.length - failedCount,
          failed: failedCount,
        },
      };

      // Save results
      await this.saveResult(id, result, allFrames);

      return result;
    } catch (err) {
      return this.errorResult(id, startedAt, startTime, err);
    } finally {
      if (browser) await browser.close();
    }
  }

  /**
   * Get the latest result for a scenario.
   */
  getLatestResult(id: string): ScenarioResult | null {
    const resultPath = path.join(
      this.resultsLatestDir,
      id,
      "result.json",
    );
    if (!fs.existsSync(resultPath)) return null;

    return JSON.parse(fs.readFileSync(resultPath, "utf-8")) as ScenarioResult;
  }

  // --- Private helpers ---

  private async evaluateAssertions(
    page: Page,
    assertions: ScenarioAssertion[],
    _frames: FrameCapture[],
  ): Promise<AssertionResult[]> {
    const results: AssertionResult[] = [];

    for (const assertion of assertions) {
      try {
        let passed = false;
        let actual: unknown;

        switch (assertion.type) {
          case "selector_visible": {
            const el = page.locator(assertion.selector!);
            const count = await el.count();
            actual = count > 0;
            if (count > 0) {
              actual = await el.first().isVisible();
            }
            passed = actual === assertion.expected;
            break;
          }
          case "selector_text": {
            const el = page.locator(assertion.selector!);
            const count = await el.count();
            if (count > 0) {
              actual = await el.first().textContent();
              passed = actual === assertion.expected;
            } else {
              actual = null;
              passed = false;
            }
            break;
          }
          case "url_match": {
            actual = page.url();
            passed = actual === assertion.expected;
            break;
          }
        }

        results.push({ assertion, passed, actual });
      } catch (err) {
        results.push({
          assertion,
          passed: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return results;
  }

  private async saveResult(
    id: string,
    result: ScenarioResult,
    frames: FrameCapture[],
  ): Promise<void> {
    // Prepare latest directory
    const latestDir = path.join(this.resultsLatestDir, id);
    const screenshotsDir = path.join(latestDir, "screenshots");
    fs.mkdirSync(screenshotsDir, { recursive: true });

    // Write screenshots and update frame paths
    for (const frame of frames) {
      const buf = (
        frame as FrameCapture & { _screenshotBuffer?: Buffer }
      )._screenshotBuffer;
      if (buf) {
        const filename = `${frame.anchor}_${frame.anchor_offset_ms}ms.png`;
        const filePath = path.join(screenshotsDir, filename);
        fs.writeFileSync(filePath, buf);
        frame.screenshot = `screenshots/${filename}`;
        delete (frame as FrameCapture & { _screenshotBuffer?: Buffer })
          ._screenshotBuffer;
      }
    }

    // Write result JSON
    fs.writeFileSync(
      path.join(latestDir, "result.json"),
      JSON.stringify(result, null, 2),
    );

    // Copy to history
    const historyDir = path.join(
      this.resultsHistoryDir,
      id,
      new Date().toISOString().replace(/[:.]/g, "-"),
    );
    fs.mkdirSync(historyDir, { recursive: true });
    this.copyDirSync(latestDir, historyDir);
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

  private errorResult(
    id: string,
    startedAt: string,
    startTime: number,
    err: unknown,
  ): ScenarioResult {
    return {
      scenario_id: id,
      scenario_name: id,
      status: "error",
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      target_url: "",
      frames: [],
      assertions: [],
      error: err instanceof Error ? err.message : String(err),
      summary: { total_assertions: 0, passed: 0, failed: 0 },
    };
  }
}
