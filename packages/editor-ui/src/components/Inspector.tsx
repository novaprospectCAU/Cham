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

function TreeNode({ node, depth, selectedTag, onSelect }: {
  node: DOMNode;
  depth: number;
  selectedTag: string | null;
  onSelect: (node: DOMNode) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const setHoveredNodeRect = useEditorStore((s) => s.setHoveredNodeRect);
  const nodeKey = `${node.tag}${node.id ? "#" + node.id : ""}`;
  const isSelected = selectedTag === nodeKey;

  return (
    <div>
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (hasChildren) setExpanded(!expanded);
          onSelect(node);
        }}
        onMouseEnter={() => node.rect && setHoveredNodeRect(node.rect)}
        onMouseLeave={() => setHoveredNodeRect(null)}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "2px 4px", paddingLeft: depth * 14 + 4,
          cursor: "pointer", fontSize: 11, lineHeight: 1.6,
          borderRadius: 3,
          backgroundColor: isSelected ? colors.accent.blue + "15" : "transparent",
          borderLeft: isSelected ? `2px solid ${colors.accent.blue}` : "2px solid transparent",
        }}
      >
        {hasChildren ? (
          <span style={{ color: colors.text.muted, fontSize: 7, width: 10, textAlign: "center" }}>
            {expanded ? "\u25BC" : "\u25B6"}
          </span>
        ) : (
          <span style={{ width: 10 }} />
        )}

        <span style={{ color: colors.accent.cyan, fontWeight: 500, fontSize: 11 }}>{node.tag}</span>
        {node.id && <span style={{ color: colors.accent.purple, fontSize: 10 }}>#{node.id}</span>}
        {node.classes && node.classes.length > 0 && (
          <span style={{ color: colors.accent.green, fontSize: 9 }}>
            .{node.classes.slice(0, 2).join(".")}
          </span>
        )}
        {node.textContent && !hasChildren && (
          <span style={{
            color: colors.text.muted, fontSize: 9,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100,
          }}>
            "{node.textContent.slice(0, 20)}"
          </span>
        )}

        {node.rect && (
          <span style={{ marginLeft: "auto", color: colors.text.muted, fontSize: 8, fontFamily: "ui-monospace, monospace", flexShrink: 0 }}>
            {node.rect.width}\u00d7{node.rect.height}
          </span>
        )}
      </div>

      {expanded && hasChildren && node.children!.map((child, i) => (
        <TreeNode key={i} node={child} depth={depth + 1} selectedTag={selectedTag} onSelect={onSelect} />
      ))}
    </div>
  );
}

export function Inspector() {
  const { result, selectedFrameIdx } = useEditorStore();
  const [selectedNode, setSelectedNode] = useState<DOMNode | null>(null);
  const selectedTag = selectedNode ? `${selectedNode.tag}${selectedNode.id ? "#" + selectedNode.id : ""}` : null;

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
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* DOM Tree */}
      <div style={{ flex: 1, overflow: "auto", padding: "4px 0" }}>
        <div style={{ fontSize: 9, color: colors.text.muted, fontWeight: 600, padding: "4px 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>
          DOM Tree
        </div>
        <div style={{ fontFamily: "ui-monospace, monospace" }}>
          {domTree.map((node: DOMNode, i: number) => (
            <TreeNode key={i} node={node} depth={0} selectedTag={selectedTag} onSelect={setSelectedNode} />
          ))}
        </div>
      </div>

      {/* Detail Panel (when node selected) */}
      {selectedNode && (
        <div style={{
          borderTop: `1px solid ${colors.border.default}`,
          padding: 8, flexShrink: 0, maxHeight: 200, overflow: "auto",
          backgroundColor: colors.bg.tertiary,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: colors.accent.cyan }}>
              &lt;{selectedNode.tag}&gt;
            </span>
            <button
              onClick={() => setSelectedNode(null)}
              style={{ border: "none", background: "none", color: colors.text.muted, cursor: "pointer", fontSize: 10 }}
            >
              \u2715
            </button>
          </div>

          {selectedNode.rect && (
            <div style={{ fontSize: 10, marginBottom: 6 }}>
              <span style={{ color: colors.text.muted }}>rect: </span>
              <span style={{ color: colors.text.secondary, fontFamily: "ui-monospace, monospace" }}>
                x:{selectedNode.rect.x} y:{selectedNode.rect.y} w:{selectedNode.rect.width} h:{selectedNode.rect.height}
              </span>
            </div>
          )}

          {selectedNode.id && (
            <div style={{ fontSize: 10 }}>
              <span style={{ color: colors.text.muted }}>id: </span>
              <span style={{ color: colors.accent.purple }}>{selectedNode.id}</span>
            </div>
          )}
          {selectedNode.classes && selectedNode.classes.length > 0 && (
            <div style={{ fontSize: 10 }}>
              <span style={{ color: colors.text.muted }}>class: </span>
              <span style={{ color: colors.accent.green }}>{selectedNode.classes.join(" ")}</span>
            </div>
          )}
          {selectedNode.attributes && Object.keys(selectedNode.attributes).length > 0 && (
            <div style={{ fontSize: 10, marginTop: 4 }}>
              {Object.entries(selectedNode.attributes).map(([k, v]) => (
                <div key={k}>
                  <span style={{ color: colors.accent.yellow }}>{k}</span>
                  <span style={{ color: colors.text.muted }}>=</span>
                  <span style={{ color: colors.text.secondary }}>"{v}"</span>
                </div>
              ))}
            </div>
          )}
          {selectedNode.textContent && (
            <div style={{ fontSize: 10, marginTop: 4, color: colors.text.secondary, fontStyle: "italic" }}>
              "{selectedNode.textContent}"
            </div>
          )}
        </div>
      )}

      {/* Computed Styles */}
      {styles && Object.keys(styles).length > 0 && (
        <div style={{ borderTop: `1px solid ${colors.border.default}`, padding: 8, maxHeight: 160, overflow: "auto" }}>
          <div style={{ fontSize: 9, color: colors.text.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
            Styles ({Object.keys(styles).length})
          </div>
          {Object.entries(styles).slice(0, 8).map(([selector, props]) => (
            <div key={selector} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 9, color: colors.accent.cyan }}>{selector}</div>
              <div style={{ paddingLeft: 8 }}>
                {Object.entries(props as Record<string, string>)
                  .filter(([, v]) => v && v !== "normal" && v !== "none" && v !== "0px")
                  .slice(0, 4)
                  .map(([prop, val]) => (
                    <div key={prop} style={{ fontSize: 9, display: "flex", gap: 6 }}>
                      <span style={{ color: colors.text.muted, minWidth: 80 }}>{prop}</span>
                      <span style={{ color: colors.text.secondary }}>{val}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
