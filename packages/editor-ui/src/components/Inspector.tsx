import { useState } from "react";

interface DOMNode {
  tag: string;
  id?: string;
  classes?: string[];
  textContent?: string;
  rect?: { x: number; y: number; width: number; height: number };
  attributes?: Record<string, string>;
  children?: DOMNode[];
}

function NodeRow({
  node,
  depth,
  selectedNode,
  onSelect,
}: {
  node: DOMNode;
  depth: number;
  selectedNode: DOMNode | null;
  onSelect: (node: DOMNode) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNode === node;

  return (
    <div>
      <div
        onClick={() => onSelect(node)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          paddingLeft: depth * 16 + 4,
          paddingTop: 3,
          paddingBottom: 3,
          paddingRight: 8,
          cursor: "pointer",
          fontSize: 12,
          backgroundColor: isSelected ? "#2a2a4a" : "transparent",
          borderLeft: isSelected ? "2px solid #3b82f6" : "2px solid transparent",
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            (e.currentTarget as HTMLDivElement).style.backgroundColor = "#1a1a30";
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
          }
        }}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            style={{
              width: 14,
              textAlign: "center",
              color: "#666",
              fontSize: 10,
              userSelect: "none",
              flexShrink: 0,
            }}
          >
            {expanded ? "\u25BC" : "\u25B6"}
          </span>
        ) : (
          <span style={{ width: 14, flexShrink: 0 }} />
        )}

        {/* Tag */}
        <span style={{ color: "#7dd3fc", fontFamily: "monospace", fontSize: 11 }}>
          {node.tag}
        </span>

        {/* ID */}
        {node.id && (
          <span style={{ color: "#c084fc", fontFamily: "monospace", fontSize: 11 }}>
            #{node.id}
          </span>
        )}

        {/* Classes */}
        {node.classes && node.classes.length > 0 && (
          <span style={{ color: "#86efac", fontFamily: "monospace", fontSize: 11 }}>
            .{node.classes.join(".")}
          </span>
        )}

        {/* Text content preview */}
        {node.textContent && !hasChildren && (
          <span
            style={{
              color: "#888",
              fontSize: 11,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 160,
            }}
          >
            {node.textContent.length > 30
              ? node.textContent.slice(0, 30) + "..."
              : node.textContent}
          </span>
        )}

        {/* Rect info */}
        {node.rect && (
          <span style={{ color: "#555", fontSize: 10, marginLeft: "auto", flexShrink: 0 }}>
            {node.rect.width}x{node.rect.height}
          </span>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {node.children!.map((child, i) => (
            <NodeRow
              key={`${child.tag}-${child.id || i}`}
              node={child}
              depth={depth + 1}
              selectedNode={selectedNode}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NodeDetail({ node }: { node: DOMNode }) {
  return (
    <div
      style={{
        padding: 12,
        backgroundColor: "#1a1a2a",
        borderRadius: 6,
        border: "1px solid #333",
        marginTop: 8,
      }}
    >
      <div style={{ fontSize: 11, color: "#888", marginBottom: 8, fontWeight: 600 }}>
        NODE DETAIL
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
        {/* Tag */}
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ color: "#666", minWidth: 70 }}>tag</span>
          <span style={{ color: "#7dd3fc", fontFamily: "monospace" }}>{node.tag}</span>
        </div>

        {/* ID */}
        {node.id && (
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ color: "#666", minWidth: 70 }}>id</span>
            <span style={{ color: "#c084fc", fontFamily: "monospace" }}>{node.id}</span>
          </div>
        )}

        {/* Classes */}
        {node.classes && node.classes.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ color: "#666", minWidth: 70 }}>classes</span>
            <span style={{ color: "#86efac", fontFamily: "monospace" }}>
              {node.classes.join(", ")}
            </span>
          </div>
        )}

        {/* Rect */}
        {node.rect && (
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ color: "#666", minWidth: 70 }}>rect</span>
            <span style={{ color: "#ddd", fontFamily: "monospace" }}>
              x:{node.rect.x} y:{node.rect.y} w:{node.rect.width} h:{node.rect.height}
            </span>
          </div>
        )}

        {/* Text content */}
        {node.textContent && (
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ color: "#666", minWidth: 70 }}>text</span>
            <span style={{ color: "#ddd", wordBreak: "break-all" }}>{node.textContent}</span>
          </div>
        )}

        {/* Attributes */}
        {node.attributes && Object.keys(node.attributes).length > 0 && (
          <div>
            <div style={{ color: "#666", marginBottom: 4 }}>attributes</div>
            <div
              style={{
                padding: 8,
                backgroundColor: "#111",
                borderRadius: 4,
                fontFamily: "monospace",
                fontSize: 11,
              }}
            >
              {Object.entries(node.attributes).map(([key, value]) => (
                <div key={key} style={{ display: "flex", gap: 6 }}>
                  <span style={{ color: "#f59e0b" }}>{key}</span>
                  <span style={{ color: "#666" }}>=</span>
                  <span style={{ color: "#ddd", wordBreak: "break-all" }}>"{value}"</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Children count */}
        {node.children && node.children.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ color: "#666", minWidth: 70 }}>children</span>
            <span style={{ color: "#888" }}>{node.children.length} nodes</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function Inspector({ domTree }: { domTree: DOMNode[] }) {
  const [selectedNode, setSelectedNode] = useState<DOMNode | null>(null);

  if (!domTree || domTree.length === 0) {
    return (
      <div style={{ padding: 16, color: "#888" }}>DOM tree not available</div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#aaa" }}>
        INSPECTOR
      </h3>

      {/* Tree view */}
      <div
        style={{
          maxHeight: 320,
          overflow: "auto",
          backgroundColor: "#1a1a2a",
          borderRadius: 6,
          border: "1px solid #333",
          padding: "4px 0",
        }}
      >
        {domTree.map((node, i) => (
          <NodeRow
            key={`${node.tag}-${node.id || i}`}
            node={node}
            depth={0}
            selectedNode={selectedNode}
            onSelect={setSelectedNode}
          />
        ))}
      </div>

      {/* Detail panel */}
      {selectedNode && <NodeDetail node={selectedNode} />}
    </div>
  );
}
