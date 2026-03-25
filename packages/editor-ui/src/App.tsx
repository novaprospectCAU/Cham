import { useState, useEffect, useCallback } from "react";
import { ScenarioList } from "./components/ScenarioList.js";
import { DiffLogViewer } from "./components/DiffLogViewer.js";
import { ScreenshotCompare } from "./components/ScreenshotCompare.js";
import { OverlayPlayer } from "./components/OverlayPlayer.js";
import { Timeline } from "./components/Timeline.js";
import { Inspector } from "./components/Inspector.js";
import { AssertionList } from "./components/AssertionList.js";
import { CoverageBar } from "./components/CoverageBar.js";
import { ConfirmPanel } from "./components/ConfirmPanel.js";
import * as api from "./api.js";

export function App() {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [baseline, setBaseline] = useState<any>(null);
  const [diff, setDiff] = useState<any>(null);
  const [coverage, setCoverage] = useState<any>(null);

  const loadScenarios = useCallback(async () => {
    const data = await api.fetchScenarios();
    setScenarios(data.scenarios || []);
    const cov = await api.fetchCoverage();
    setCoverage(cov);
  }, []);

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  const selectScenario = useCallback(async (id: string) => {
    setSelectedId(id);
    const [r, b, d] = await Promise.all([
      api.fetchResult(id),
      api.fetchBaseline(id),
      api.fetchDiff(id),
    ]);
    setResult(r);
    setBaseline(b);
    setDiff(d);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedId) return;
    await api.confirmScenario(selectedId);
    await loadScenarios();
    await selectScenario(selectedId);
  }, [selectedId, loadScenarios, selectScenario]);

  const handleReject = useCallback(async (comment: string) => {
    if (!selectedId) return;
    await api.rejectScenario(selectedId, comment);
  }, [selectedId]);

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      backgroundColor: "#0f0f1a", color: "#e0e0e0", fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px", borderBottom: "1px solid #333",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Scenario Editor</h1>
        <span style={{ fontSize: 11, color: "#666" }}>v0.3.0</span>
      </div>

      {/* Main */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left: Scenario List */}
        <ScenarioList
          scenarios={scenarios}
          selectedId={selectedId}
          onSelect={selectScenario}
        />

        {/* Right: Detail */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {!selectedId ? (
            <div style={{ padding: 40, textAlign: "center", color: "#555" }}>
              <p style={{ fontSize: 14 }}>시나리오를 선택하세요</p>
            </div>
          ) : !result ? (
            <div style={{ padding: 40, textAlign: "center", color: "#555" }}>
              <p style={{ fontSize: 14 }}>실행 결과 없음</p>
            </div>
          ) : (
            <>
              {/* Status Header */}
              <div style={{
                padding: "12px 16px", borderBottom: "1px solid #222",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <span style={{
                  padding: "2px 10px", borderRadius: 4, fontSize: 12, fontWeight: 600,
                  backgroundColor: result.status === "passed" ? "#166534" : "#7f1d1d",
                  color: "#fff",
                }}>
                  {result.status?.toUpperCase()}
                </span>
                <span style={{ fontSize: 13 }}>{result.scenario_name}</span>
                <span style={{ fontSize: 11, color: "#666" }}>
                  {result.duration_ms}ms | {result.target_url}
                </span>
              </div>

              <Timeline
                frames={result.frames || []}
                assertions={result.assertions || []}
              />

              <ScreenshotCompare
                scenarioId={selectedId}
                latestFrames={result.frames || []}
                baselineFrames={baseline?.frames || null}
                hasDiff={!!diff && !diff.error}
              />

              {baseline?.frames && baseline.frames.length > 0 && (
                <OverlayPlayer
                  scenarioId={selectedId}
                  latestFrames={result.frames || []}
                  baselineFrames={baseline.frames}
                />
              )}

              <DiffLogViewer diff={diff?.error ? null : diff} />

              <AssertionList assertions={result.assertions || []} />

              <Inspector
                domTree={
                  result.frames?.[0]?.dom_tree || []
                }
              />
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #333" }}>
        <CoverageBar coverage={coverage} />
        {selectedId && result && (
          <div style={{ borderTop: "1px solid #222" }}>
            <ConfirmPanel
              scenarioId={selectedId}
              onConfirm={handleConfirm}
              onReject={handleReject}
            />
          </div>
        )}
      </div>
    </div>
  );
}
