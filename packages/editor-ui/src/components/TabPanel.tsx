import { type ReactNode } from "react";
import { colors } from "../theme/index.js";
import { useEditorStore } from "../store/editorStore.js";

type TabId = "difflog" | "inspector" | "assertions";

const TABS: { id: TabId; label: string }[] = [
  { id: "difflog", label: "Diff Log" },
  { id: "inspector", label: "Inspector" },
  { id: "assertions", label: "Assertions" },
];

export function TabPanel({
  children,
}: {
  children: Record<TabId, ReactNode>;
}) {
  const { activePanel, setActivePanel } = useEditorStore();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Tab Bar */}
      <div style={{
        display: "flex", borderBottom: `1px solid ${colors.border.default}`,
        backgroundColor: colors.bg.secondary, flexShrink: 0,
      }}>
        {TABS.map((tab) => {
          const isActive = activePanel === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActivePanel(tab.id)}
              style={{
                padding: "8px 16px",
                fontSize: 11,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? colors.text.primary : colors.text.muted,
                backgroundColor: "transparent",
                border: "none",
                borderBottom: isActive ? `2px solid ${colors.accent.blue}` : "2px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {children[activePanel]}
      </div>
    </div>
  );
}
