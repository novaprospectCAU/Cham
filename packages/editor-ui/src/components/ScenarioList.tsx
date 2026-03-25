interface Scenario {
  id: string;
  name: string;
  description: string;
  target_url: string;
  last_status: string | null;
  has_baseline: boolean;
  has_diff: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  passed: "#22c55e",
  failed: "#ef4444",
  error: "#f59e0b",
};

export function ScenarioList({
  scenarios,
  selectedId,
  onSelect,
}: {
  scenarios: Scenario[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{ borderRight: "1px solid #333", padding: 16, minWidth: 220 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#aaa" }}>
        SCENARIOS
      </h2>
      {scenarios.map((s) => (
        <div
          key={s.id}
          onClick={() => onSelect(s.id)}
          style={{
            padding: "8px 12px",
            marginBottom: 4,
            borderRadius: 6,
            cursor: "pointer",
            backgroundColor: selectedId === s.id ? "#2a2a3a" : "transparent",
            border: selectedId === s.id ? "1px solid #555" : "1px solid transparent",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: STATUS_COLORS[s.last_status || ""] || "#666",
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</span>
          </div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 2, marginLeft: 16 }}>
            {s.target_url}
          </div>
        </div>
      ))}
    </div>
  );
}
