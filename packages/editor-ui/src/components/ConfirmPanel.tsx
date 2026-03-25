import { useState } from "react";

export function ConfirmPanel({
  scenarioId,
  onConfirm,
  onReject,
}: {
  scenarioId: string;
  onConfirm: () => void;
  onReject: (comment: string) => void;
}) {
  const [showReject, setShowReject] = useState(false);
  const [comment, setComment] = useState("");

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "8px 16px",
    }}>
      <button
        onClick={onConfirm}
        style={{
          padding: "6px 20px",
          borderRadius: 6,
          border: "none",
          backgroundColor: "#22c55e",
          color: "#fff",
          fontWeight: 600,
          cursor: "pointer",
          fontSize: 13,
        }}
      >
        Confirm
      </button>

      {!showReject ? (
        <button
          onClick={() => setShowReject(true)}
          style={{
            padding: "6px 20px",
            borderRadius: 6,
            border: "1px solid #555",
            backgroundColor: "transparent",
            color: "#ef4444",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Reject
        </button>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Rejection reason..."
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #555",
              backgroundColor: "#1a1a2a",
              color: "#ddd",
              fontSize: 12,
              width: 240,
            }}
          />
          <button
            onClick={() => { onReject(comment); setShowReject(false); setComment(""); }}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "none",
              backgroundColor: "#ef4444",
              color: "#fff",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Send
          </button>
          <button
            onClick={() => setShowReject(false)}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #444",
              backgroundColor: "transparent",
              color: "#888",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Cancel
          </button>
        </div>
      )}

      <span style={{ color: "#555", fontSize: 11, marginLeft: "auto" }}>
        {scenarioId}
      </span>
    </div>
  );
}
