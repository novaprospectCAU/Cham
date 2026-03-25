interface Coverage {
  total_scenarios: number;
  passed: number;
  failed: number;
  not_run: number;
}

export function CoverageBar({ coverage }: { coverage: Coverage | null }) {
  if (!coverage || coverage.total_scenarios === 0) return null;

  const pct = Math.round((coverage.passed / coverage.total_scenarios) * 100);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "8px 16px",
      fontSize: 12, color: "#aaa",
    }}>
      <span style={{ fontWeight: 600 }}>COVERAGE</span>
      <span>{coverage.passed}/{coverage.total_scenarios} scenarios</span>
      <div style={{
        flex: 1, height: 6, borderRadius: 3, backgroundColor: "#333",
        maxWidth: 200,
      }}>
        <div style={{
          width: `${pct}%`,
          height: "100%",
          borderRadius: 3,
          backgroundColor: pct === 100 ? "#22c55e" : pct > 50 ? "#f59e0b" : "#ef4444",
        }} />
      </div>
      <span>{pct}%</span>
      {coverage.failed > 0 && (
        <span style={{ color: "#ef4444" }}>{coverage.failed} failed</span>
      )}
      {coverage.not_run > 0 && (
        <span style={{ color: "#666" }}>{coverage.not_run} not run</span>
      )}
    </div>
  );
}
