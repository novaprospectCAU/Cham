import { colors } from "../theme/index.js";
import { useEditorStore } from "../store/editorStore.js";

export function AssertionList() {
  const { result } = useEditorStore();
  const assertions = result?.assertions;

  if (!assertions || assertions.length === 0) {
    return (
      <div style={{ padding: 16, color: colors.text.muted, fontSize: 12 }}>
        Assertion 없음.
      </div>
    );
  }

  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {assertions.map((a: any, i: number) => (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "5px 8px", borderRadius: 4,
              backgroundColor: colors.bg.tertiary, fontSize: 11,
            }}
          >
            <span style={{ fontSize: 12 }}>
              {a.passed ? "\u2705" : "\u274C"}
            </span>
            <span style={{ color: colors.text.muted }}>{a.assertion.type}</span>
            {a.assertion.selector && (
              <code style={{ color: colors.accent.cyan, fontSize: 10, fontFamily: "ui-monospace, monospace" }}>
                {a.assertion.selector}
              </code>
            )}
            <span style={{ marginLeft: "auto", color: colors.text.muted, fontSize: 10 }}>
              {JSON.stringify(a.assertion.expected)}
              {a.actual !== undefined && ` = ${JSON.stringify(a.actual)}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
