import { useEffect } from "react";
import { colors } from "./theme/index.js";
import { useEditorStore } from "./store/editorStore.js";
import { useKeyboard } from "./hooks/useKeyboard.js";
import { Toolbar } from "./layout/Toolbar.js";
import { StatusBar } from "./layout/StatusBar.js";
import { PanelLayout } from "./layout/PanelLayout.js";
import { ScenarioList } from "./components/ScenarioList.js";
import { CanvasTimeline } from "./components/CanvasTimeline.js";
import { Viewport } from "./components/Viewport.js";
import { TabPanel } from "./components/TabPanel.js";
import { DiffLogViewer } from "./components/DiffLogViewer.js";
import { Inspector } from "./components/Inspector.js";
import { AssertionList } from "./components/AssertionList.js";

export function App() {
  const loadScenarios = useEditorStore((s) => s.loadScenarios);

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  useKeyboard();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: colors.bg.primary,
        color: colors.text.primary,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <Toolbar />

      <PanelLayout
        left={<ScenarioList />}
        center={
          <>
            <CanvasTimeline />
            <Viewport />
          </>
        }
        right={
          <TabPanel>
            {{
              difflog: <DiffLogViewer />,
              inspector: <Inspector />,
              assertions: <AssertionList />,
            }}
          </TabPanel>
        }
      />

      <StatusBar />
    </div>
  );
}
