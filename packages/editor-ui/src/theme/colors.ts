export const colors = {
  bg: {
    primary: "#0a0a14",
    secondary: "#12121e",
    tertiary: "#1a1a2a",
    panel: "#141420",
    hover: "#1e1e30",
    active: "#252538",
  },
  text: {
    primary: "#e8e8f0",
    secondary: "#a0a0b0",
    muted: "#666680",
    inverse: "#0a0a14",
  },
  border: {
    default: "#2a2a3a",
    light: "#1e1e2e",
    focus: "#3b82f6",
  },
  accent: {
    blue: "#3b82f6",
    green: "#22c55e",
    red: "#ef4444",
    yellow: "#f59e0b",
    purple: "#a855f7",
    cyan: "#06b6d4",
  },
  severity: {
    high: "#ef4444",
    medium: "#f59e0b",
    low: "#6b7280",
  },
  status: {
    passed: "#22c55e",
    failed: "#ef4444",
    error: "#f59e0b",
    running: "#3b82f6",
    pending: "#6b7280",
  },
  track: {
    capture: "#3b82f6",
    event: "#f59e0b",
    network: "#22c55e",
    state: "#a855f7",
    assert: "#ec4899",
  },
} as const;
