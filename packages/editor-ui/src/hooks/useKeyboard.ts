import { useEffect } from "react";
import { useEditorStore } from "../store/editorStore.js";

export function useKeyboard() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const store = useEditorStore.getState();

      // Don't handle if focus is on an input
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      switch (e.key) {
        case " ": // Space = toggle playback
          e.preventDefault();
          store.setIsPlaying(!store.isPlaying);
          break;

        case "ArrowRight": // Next frame
          e.preventDefault();
          if (store.result?.frames) {
            const maxIdx = store.result.frames.length - 1;
            store.setSelectedFrame(Math.min(store.selectedFrameIdx + 1, maxIdx));
          }
          break;

        case "ArrowLeft": // Previous frame
          e.preventDefault();
          store.setSelectedFrame(Math.max(store.selectedFrameIdx - 1, 0));
          break;

        case "1": // Tab: Diff Log
          store.setActivePanel("difflog");
          break;

        case "2": // Tab: Inspector
          store.setActivePanel("inspector");
          break;

        case "3": // Tab: Assertions
          store.setActivePanel("assertions");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
