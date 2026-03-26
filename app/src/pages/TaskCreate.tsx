import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "../components/NavBar.js";
import { createTask } from "../api.js";

export function TaskCreate() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("제목을 입력해주세요");
      return;
    }

    const result = await createTask(title, description, priority);
    if (result.ok) {
      navigate("/tasks");
    }
  };

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 600, margin: "24px auto", padding: "0 24px" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>새 할일</h2>

        <form onSubmit={handleSubmit} style={{
          backgroundColor: "#fff", borderRadius: 12, padding: 24,
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#555" }}>
              제목 *
            </label>
            <input
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="할일 제목"
              required
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: error ? "1px solid #ef4444" : "1px solid #ddd", fontSize: 14,
              }}
            />
            {error && (
              <div data-testid="title-error" style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>
                {error}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#555" }}>
              설명
            </label>
            <textarea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="상세 설명 (선택)"
              rows={4}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: "1px solid #ddd", fontSize: 14, resize: "vertical",
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#555" }}>
              우선순위
            </label>
            <select
              name="priority"
              data-testid="priority-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: "1px solid #ddd", fontSize: 14,
              }}
            >
              <option value="low">낮음</option>
              <option value="medium">보통</option>
              <option value="high">높음</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              data-testid="cancel-button"
              type="button"
              onClick={() => navigate("/tasks")}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 8,
                border: "1px solid #ddd", backgroundColor: "#fff",
                color: "#666", fontSize: 14, cursor: "pointer",
              }}
            >
              취소
            </button>
            <button
              type="submit"
              data-testid="submit-button"
              style={{
                flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
                backgroundColor: "#3b82f6", color: "#fff",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              만들기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
