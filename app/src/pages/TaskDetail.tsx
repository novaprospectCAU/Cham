import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { NavBar } from "../components/NavBar.js";
import { getTask, completeTask, deleteTask } from "../api.js";

interface Task {
  id: string; title: string; description: string; status: string;
  priority: string; created_at: string; completed_at: string | null;
}

export function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (id) getTask(id).then(setTask);
  }, [id]);

  const handleComplete = async () => {
    if (!id) return;
    const updated = await completeTask(id);
    setTask(updated);
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteTask(id);
    navigate("/tasks");
  };

  if (!task) return <div><NavBar /><div style={{ padding: 40, textAlign: "center" }}>로딩 중...</div></div>;

  const isCompleted = task.status === "completed";

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 600, margin: "24px auto", padding: "0 24px" }}>
        <button
          data-testid="back-button"
          onClick={() => navigate("/tasks")}
          style={{
            border: "none", background: "none", cursor: "pointer",
            fontSize: 14, color: "#3b82f6", marginBottom: 16,
          }}
        >
          ← 목록으로
        </button>

        <div style={{
          backgroundColor: "#fff", borderRadius: 12, padding: 24,
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <h2 data-testid="task-title" style={{ flex: 1, fontSize: 20, fontWeight: 700 }}>
              {task.title}
            </h2>
            <span
              data-testid="status-badge"
              style={{
                padding: "4px 12px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                backgroundColor: isCompleted ? "#dcfce7" : "#dbeafe",
                color: isCompleted ? "#166534" : "#1e40af",
              }}
            >
              {isCompleted ? "완료" : "활성"}
            </span>
          </div>

          {task.description && (
            <p data-testid="task-description" style={{ color: "#666", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              {task.description}
            </p>
          )}

          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 24 }}>
            생성: {new Date(task.created_at).toLocaleString("ko")}
            {task.completed_at && ` | 완료: ${new Date(task.completed_at).toLocaleString("ko")}`}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              data-testid="complete-button"
              onClick={handleComplete}
              disabled={isCompleted}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
                backgroundColor: isCompleted ? "#e5e5e5" : "#22c55e",
                color: isCompleted ? "#999" : "#fff",
                fontSize: 14, fontWeight: 600,
                cursor: isCompleted ? "default" : "pointer",
              }}
            >
              {isCompleted ? "이미 완료됨" : "완료 처리"}
            </button>
            <button
              data-testid="delete-button"
              onClick={() => setShowDeleteModal(true)}
              style={{
                padding: "10px 20px", borderRadius: 8,
                border: "1px solid #ef4444", backgroundColor: "#fff",
                color: "#ef4444", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              삭제
            </button>
          </div>
        </div>

        {/* Delete Confirm Modal */}
        {showDeleteModal && (
          <div
            data-testid="delete-confirm-modal"
            style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex", justifyContent: "center", alignItems: "center",
            }}
          >
            <div style={{
              backgroundColor: "#fff", borderRadius: 12, padding: 24,
              width: 320, textAlign: "center",
            }}>
              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>할일 삭제</p>
              <p style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>
                "{task.title}"을(를) 삭제하시겠습니까?
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  data-testid="delete-cancel"
                  onClick={() => setShowDeleteModal(false)}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 8,
                    border: "1px solid #ddd", backgroundColor: "#fff",
                    color: "#666", fontSize: 14, cursor: "pointer",
                  }}
                >
                  취소
                </button>
                <button
                  data-testid="delete-confirm"
                  onClick={handleDelete}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
                    backgroundColor: "#ef4444", color: "#fff",
                    fontSize: 14, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
