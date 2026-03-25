import express from "express";
import cors from "cors";
import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";

const ROOT_DIR = process.env.SCENARIO_EDITOR_ROOT || path.resolve(process.cwd(), "../..");
const RESULTS_DIR = path.join(ROOT_DIR, "results");
const SCENARIOS_DIR = path.join(ROOT_DIR, "scenarios");

const app = express();
app.use(cors());
app.use(express.json());

// Static screenshot serving
app.use("/screenshots/latest", express.static(path.join(RESULTS_DIR, "latest")));
app.use("/screenshots/baselines", express.static(path.join(RESULTS_DIR, "baselines")));
app.use("/screenshots/diffs", express.static(path.join(RESULTS_DIR, "diffs")));

// GET /api/scenarios
app.get("/api/scenarios", (_req, res) => {
  if (!fs.existsSync(SCENARIOS_DIR)) {
    res.json({ scenarios: [] });
    return;
  }

  const files = fs.readdirSync(SCENARIOS_DIR).filter((f) => f.endsWith(".scenario.yaml"));
  const scenarios = files.map((file) => {
    const id = file.replace(".scenario.yaml", "");
    const content = fs.readFileSync(path.join(SCENARIOS_DIR, file), "utf-8");
    const raw = yaml.load(content) as Record<string, unknown>;

    let lastStatus: string | null = null;
    const resultPath = path.join(RESULTS_DIR, "latest", id, "result.json");
    if (fs.existsSync(resultPath)) {
      try {
        const result = JSON.parse(fs.readFileSync(resultPath, "utf-8"));
        lastStatus = result.status;
      } catch { /* ignore */ }
    }

    const hasBaseline = fs.existsSync(path.join(RESULTS_DIR, "baselines", id, "result.json"));
    const hasDiff = fs.existsSync(path.join(RESULTS_DIR, "diffs", id, "diff_log.json"));

    return {
      id,
      name: raw.name || id,
      description: raw.description || "",
      target_url: raw.target_url || "",
      last_status: lastStatus,
      has_baseline: hasBaseline,
      has_diff: hasDiff,
    };
  });

  res.json({ scenarios });
});

// GET /api/scenarios/:id/result
app.get("/api/scenarios/:id/result", (req, res) => {
  const filePath = path.join(RESULTS_DIR, "latest", req.params.id, "result.json");
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "NO_RESULT" });
    return;
  }
  res.json(JSON.parse(fs.readFileSync(filePath, "utf-8")));
});

// GET /api/scenarios/:id/baseline
app.get("/api/scenarios/:id/baseline", (req, res) => {
  const filePath = path.join(RESULTS_DIR, "baselines", req.params.id, "result.json");
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "NO_BASELINE" });
    return;
  }
  res.json(JSON.parse(fs.readFileSync(filePath, "utf-8")));
});

// GET /api/scenarios/:id/diff
app.get("/api/scenarios/:id/diff", (req, res) => {
  const filePath = path.join(RESULTS_DIR, "diffs", req.params.id, "diff_log.json");
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "NO_DIFF" });
    return;
  }
  res.json(JSON.parse(fs.readFileSync(filePath, "utf-8")));
});

// GET /api/coverage
app.get("/api/coverage", (_req, res) => {
  const scenarioFiles = fs.existsSync(SCENARIOS_DIR)
    ? fs.readdirSync(SCENARIOS_DIR).filter((f) => f.endsWith(".scenario.yaml"))
    : [];

  let passed = 0, failed = 0, notRun = 0;
  for (const file of scenarioFiles) {
    const id = file.replace(".scenario.yaml", "");
    const resultPath = path.join(RESULTS_DIR, "latest", id, "result.json");
    if (!fs.existsSync(resultPath)) { notRun++; continue; }
    try {
      const result = JSON.parse(fs.readFileSync(resultPath, "utf-8"));
      if (result.status === "passed") passed++;
      else failed++;
    } catch { notRun++; }
  }

  res.json({ total_scenarios: scenarioFiles.length, passed, failed, not_run: notRun });
});

// POST /api/scenarios/:id/confirm
app.post("/api/scenarios/:id/confirm", (req, res) => {
  const id = req.params.id;
  const latestDir = path.join(RESULTS_DIR, "latest", id);
  const baselineDir = path.join(RESULTS_DIR, "baselines", id);

  if (!fs.existsSync(path.join(latestDir, "result.json"))) {
    res.status(404).json({ error: "NO_RESULT" });
    return;
  }

  fs.mkdirSync(baselineDir, { recursive: true });
  copyDirSync(latestDir, baselineDir);
  res.json({ success: true, scenario_id: id });
});

// POST /api/scenarios/:id/reject
app.post("/api/scenarios/:id/reject", (req, res) => {
  const id = req.params.id;
  const comment = (req.body as { comment?: string })?.comment || "";
  const rejectDir = path.join(RESULTS_DIR, "rejections", id);
  fs.mkdirSync(rejectDir, { recursive: true });
  fs.writeFileSync(
    path.join(rejectDir, `${new Date().toISOString().replace(/[:.]/g, "-")}.json`),
    JSON.stringify({ scenario_id: id, comment, timestamp: new Date().toISOString() }, null, 2),
  );
  res.json({ success: true, scenario_id: id });
});

function copyDirSync(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(s, d);
    else fs.copyFileSync(s, d);
  }
}

const PORT = parseInt(process.env.API_PORT || "3456", 10);
app.listen(PORT, () => {
  console.log(`Scenario Editor API server running on http://localhost:${PORT}`);
  console.log(`Root dir: ${ROOT_DIR}`);
});
