import { useState } from "react";
import { colors } from "../theme/index.js";
import { useEditorStore } from "../store/editorStore.js";

interface DOMNode {
  tag: string;
  id?: string;
  classes?: string[];
  textContent?: string;
  rect?: { x: number; y: number; width: number; height: number };
  attributes?: Record<string, string>;
  children?: DOMNode[];
}

function TreeNode({ node, depth }: { node: DOMNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        onClick={() => hasChildren && setExpanded(!expanded)}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "2px 0", paddingLeft: depth * 16,
          cursor: hasChildren ? "pointer" : "default",
          fontSize: 11, lineHeight: 1.6,
        }}
      >
        {hasChildren && (
          <span style={{ color: colors.text.muted, fontSize: 8, width: 10 }}>
            {expanded ? "\u25BC" : "\u25B6"}
          </span>
        )}
        {!hasChildren && <span style={{ width: 10 }} />}

        <span style={{ color: colors.accent.cyan, fontWeight: 500 }}>{node.tag}</span>
        {node.id && <span style={{ color: colors.accent.purple }}>#{node.id}</span>}
        {node.classes && node.classes.length > 0 && (
          <span style={{ color: colors.accent.green, fontSize: 10 }}>
            .{node.classes.join(".")}
          </span>
        )}
        {node.textContent && (
          <span style={{ color: colors.text.muted, fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 }}>
            "{node.textContent.slice(0, 30)}"
          </span>
        )}

        <span style={{ marginLeft: "auto", color: colors.text.muted, fontSize: 9 }}>
          {node.rect ? `${node.rect.width}x${node.rect.height}` : ""}
        </span>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children!.map((child, i) => (
            <TreeNode key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Inspector() {
  const { result, selectedFrameIdx } = useEditorStore();

  const frame = result?.frames?.[selectedFrameIdx];
  const domTree = frame?.dom_tree;
  const styles = frame?.computed_styles;

  if (!domTree) {
    return (
      <div style={{ padding: 16, color: colors.text.muted, fontSize: 12 }}>
        DOM 트리 없음. 시나리오를 실행하세요.
      </div>
    );
  }

  return (
    <div style={{ padding: 8 }}>
      <div style={{ fontSize: 9, color: colors.text.muted, fontWeight: 600, padding: "4px 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>
        DOM Tree
      </div>
      <div style={{ fontFamily: "ui-monospace, monospace" }}>
        {domTree.map((node: DOMNode, i: number) => (
          <TreeNode key={i} node={node} depth={0} />
        ))}
      </div>

      {styles && Object.keys(styles).length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 9, color: colors.text.muted, fontWeight: 600, padding: "4px 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Computed Styles ({Object.keys(styles).length} selectors)
          </div>
          <div style={{ padding: "4px 8px" }}>
            {Object.entries(styles).slice(0, 5).map(([selector, props]) => (
              <div key={selector} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: colors.accent.cyan, fontWeight: 500 }}>{selector}</div>
                <div style={{ paddingLeft: 12 }}>
                  {Object.entries(props as Record<string, string>).filter(([, v]) => v && v !== "normal" && v !== "none").slice(0, 6).map(([prop, val]) => (
                    <div key={prop} style={{ fontSize: 10, display: "flex", gap: 8 }}>
                      <span style={{ color: colors.text.muted, minWidth: 100 }}>{prop}:</span>
                      <span style={{ color: colors.text.secondary }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
