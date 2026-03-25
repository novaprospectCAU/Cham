import { colors } from "../theme/index.js";
import { useEditorStore } from "../store/editorStore.js";

export function ScenarioList() {
  const { scenarios, selectedId, selectScenario } = useEditorStore();

  return (
    <div style={{ padding: "12px 0" }}>
      <div style={{ padding: "0 12px 8px", fontSize: 10, fontWeight: 600, color: colors.text.muted, textTransform: "uppercase", letterSpacing: 1 }}>
        Scenarios
      </div>

      {scenarios.map((s) => {
        const isSelected = selectedId === s.id;
        const statusColor = s.last_status ? (colors.status as Record<string, string>)[s.last_status] || colors.text.muted : colors.text.muted;

        return (
          <div
            key={s.id}
            onClick={() => selectScenario(s.id)}
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              backgroundColor: isSelected ? colors.bg.active : "transparent",
              borderLeft: isSelected ? `2px solid ${colors.accent.blue}` : "2px solid transparent",
              transition: "all 0.1s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                backgroundColor: statusColor, flexShrink: 0,
              }} />
              <span style={{
                fontSize: 12, fontWeight: isSelected ? 600 : 400,
                color: isSelected ? colors.text.primary : colors.text.secondary,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {s.name}
              </span>
            </div>
            <div style={{
              fontSize: 10, color: colors.text.muted, marginTop: 2, paddingLeft: 14,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {s.target_url}
            </div>
          </div>
        );
      })}
    </div>
  );
}
