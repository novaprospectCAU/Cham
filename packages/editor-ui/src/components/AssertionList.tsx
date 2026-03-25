interface AssertionResult {
  assertion: {
    type: string;
    selector?: string;
    expected: unknown;
  };
  passed: boolean;
  actual?: unknown;
}

export function AssertionList({ assertions }: { assertions: AssertionResult[] }) {
  if (!assertions || assertions.length === 0) {
    return null;
  }

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#aaa" }}>
        ASSERTIONS
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {assertions.map((a, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              padding: "4px 8px",
              borderRadius: 4,
              backgroundColor: "#1a1a2a",
            }}
          >
            <span style={{ fontSize: 14 }}>
              {a.passed ? "\u2705" : "\u274c"}
            </span>
            <span style={{ color: "#aaa" }}>{a.assertion.type}</span>
            {a.assertion.selector && (
              <code style={{ color: "#7dd3fc", fontSize: 11 }}>{a.assertion.selector}</code>
            )}
            <span style={{ color: "#666", marginLeft: "auto", fontSize: 11 }}>
              expected: {JSON.stringify(a.assertion.expected)}
              {a.actual !== undefined && ` | actual: ${JSON.stringify(a.actual)}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
