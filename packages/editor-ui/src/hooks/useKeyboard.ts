import { useEffect } from "react";
import { useEditorStore } from "../store/editorStore.js";

export function useKeyboard() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const store = useEditorStore.getState();
      const tag = (e.target as HTMLElement).tagName;

      // Don't handle if focus is on an input/textarea
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const ctrl = e.ctrlKey || e.metaKey;

      switch (e.key) {
        // Playback
        case " ":
          e.preventDefault();
          store.setIsPlaying(!store.isPlaying);
          break;

        // Frame navigation
        case "ArrowRight":
          e.preventDefault();
          if (store.result?.frames) {
            const maxIdx = store.result.frames.length - 1;
            store.setSelectedFrame(Math.min(store.selectedFrameIdx + 1, maxIdx));
          }
          break;

        case "ArrowLeft":
          e.preventDefault();
          store.setSelectedFrame(Math.max(store.selectedFrameIdx - 1, 0));
          break;

        case "Home":
          e.preventDefault();
          store.setSelectedFrame(0);
          break;

        case "End":
          e.preventDefault();
          if (store.result?.frames) {
            store.setSelectedFrame(store.result.frames.length - 1);
          }
          break;

        // Panel tabs
        case "1":
          if (!ctrl) store.setActivePanel("difflog");
          break;

        case "2":
          if (!ctrl) store.setActivePanel("inspector");
          break;

        case "3":
          if (!ctrl) store.setActivePanel("assertions");
          break;

        // Scenario navigation
        case "ArrowUp":
          if (ctrl) {
            e.preventDefault();
            navigateScenario(-1);
          }
          break;

        case "ArrowDown":
          if (ctrl) {
            e.preventDefault();
            navigateScenario(1);
          }
          break;

        // Confirm (Ctrl+Enter)
        case "Enter":
          if (ctrl && store.selectedId && store.result) {
            e.preventDefault();
            store.confirmScenario();
          }
          break;

        // Escape = clear selection / stop playback
        case "Escape":
          store.setIsPlaying(false);
          store.setHoveredNodeRect(null);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}

function navigateScenario(direction: number) {
  const store = useEditorStore.getState();
  const { scenarios, selectedId } = store;
  if (scenarios.length === 0) return;

  const currentIdx = scenarios.findIndex((s) => s.id === selectedId);
  const nextIdx = Math.max(0, Math.min(scenarios.length - 1, currentIdx + direction));
  store.selectScenario(scenarios[nextIdx].id);
}
