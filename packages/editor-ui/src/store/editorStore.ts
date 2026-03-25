import { create } from "zustand";
import * as api from "../api.js";

export interface Scenario {
  id: string;
  name: string;
  description: string;
  target_url: string;
  last_status: string | null;
  has_baseline: boolean;
  has_diff: boolean;
}

export interface Coverage {
  total_scenarios: number;
  passed: number;
  failed: number;
  not_run: number;
}

export interface EditorStore {
  // Data
  scenarios: Scenario[];
  selectedId: string | null;
  result: any | null;
  baseline: any | null;
  diff: any | null;
  coverage: Coverage | null;

  // UI State
  activePanel: "inspector" | "difflog" | "assertions";
  panelWidths: { left: number; right: number };
  timelineCursor: number;
  selectedFrameIdx: number;
  overlayOpacity: number;
  isPlaying: boolean;

  // Actions
  loadScenarios: () => Promise<void>;
  selectScenario: (id: string) => Promise<void>;
  confirmScenario: () => Promise<void>;
  rejectScenario: (comment: string) => Promise<void>;
  setActivePanel: (panel: "inspector" | "difflog" | "assertions") => void;
  setTimelineCursor: (ms: number) => void;
  setSelectedFrame: (idx: number) => void;
  setOverlayOpacity: (v: number) => void;
  setPanelWidth: (panel: "left" | "right", w: number) => void;
  setIsPlaying: (v: boolean) => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  scenarios: [],
  selectedId: null,
  result: null,
  baseline: null,
  diff: null,
  coverage: null,

  activePanel: "difflog",
  panelWidths: { left: 240, right: 320 },
  timelineCursor: 0,
  selectedFrameIdx: 0,
  overlayOpacity: 0.5,
  isPlaying: false,

  loadScenarios: async () => {
    const data = await api.fetchScenarios();
    const cov = await api.fetchCoverage();
    set({ scenarios: data.scenarios || [], coverage: cov });
  },

  selectScenario: async (id: string) => {
    set({ selectedId: id, selectedFrameIdx: 0, timelineCursor: 0 });
    const [result, baseline, diff] = await Promise.all([
      api.fetchResult(id),
      api.fetchBaseline(id),
      api.fetchDiff(id),
    ]);
    set({ result, baseline, diff });
  },

  confirmScenario: async () => {
    const { selectedId } = get();
    if (!selectedId) return;
    await api.confirmScenario(selectedId);
    await get().loadScenarios();
    await get().selectScenario(selectedId);
  },

  rejectScenario: async (comment: string) => {
    const { selectedId } = get();
    if (!selectedId) return;
    await api.rejectScenario(selectedId, comment);
  },

  setActivePanel: (panel) => set({ activePanel: panel }),
  setTimelineCursor: (ms) => set({ timelineCursor: ms }),
  setSelectedFrame: (idx) => set({ selectedFrameIdx: idx }),
  setOverlayOpacity: (v) => set({ overlayOpacity: v }),
  setPanelWidth: (panel, w) =>
    set((s) => ({ panelWidths: { ...s.panelWidths, [panel]: w } })),
  setIsPlaying: (v) => set({ isPlaying: v }),
}));
