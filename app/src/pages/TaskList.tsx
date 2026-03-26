import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { NavBar } from "../components/NavBar.js";
import { getTasks } from "../api.js";

interface Task {
  id: string; title: string; status: string; priority: string; created_at: string;
}

export function TaskList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEmpty = searchParams.get("_empty") === "true";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState("all");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getTasks(isEmpty).then((data) => { setTasks(data.tasks || []); setLoaded(true); });
  }, [isEmpty]);

  const filtered = filter === "all" ? tasks :
    filter === "completed" ? tasks.filter((t) => t.status === "completed") :
    tasks.filter((t) => t.status === "active");

  const PRIORITY_COLORS: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#6b7280" };

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 600, margin: "24px auto", padding: "0 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>할일 목록</h2>
          <button
            data-testid="create-task-button"
            onClick={() => navigate("/tasks/new")}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "none",
              backgroundColor: "#3b82f6", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            + 새 할일
          </button>
        </div>

        {/* Filter Bar */}
        <div data-testid="filter-bar" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[
            { id: "all", label: "전체" },
            { id: "active", label: "활성" },
            { id: "completed", label: "완료" },
          ].map((f) => (
            <button
              key={f.id}
              data-testid={`filter-${f.id}`}
              className={filter === f.id ? "active" : ""}
              onClick={() => setFilter(f.id)}
              style={{
                padding: "6px 14px", borderRadius: 6, border: "1px solid #ddd",
                backgroundColor: filter === f.id ? "#3b82f6" : "#fff",
                color: filter === f.id ? "#fff" : "#666",
                fontSize: 13, cursor: "pointer", fontWeight: filter === f.id ? 600 : 400,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Task Items or Empty State */}
        {loaded && filtered.length === 0 ? (
          <div data-testid="empty-state" style={{
            textAlign: "center", padding: 48, color: "#999",
            backgroundColor: "#fff", borderRadius: 12,
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 16, marginBottom: 16 }}>할일이 없습니다</div>
            <button
              data-testid="empty-create-button"
              onClick={() => navigate("/tasks/new")}
              style={{
                padding: "8px 20px", borderRadius: 8, border: "none",
                backgroundColor: "#3b82f6", color: "#fff", fontSize: 13, cursor: "pointer",
              }}
            >
              첫 번째 할일 만들기
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((task) => (
              <div
                key={task.id}
                data-testid="task-item"
                onClick={() => navigate(`/tasks/${task.id}`)}
                style={{
                  padding: "14px 16px", backgroundColor: "#fff", borderRadius: 8,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                  border: "1px solid #eee",
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  backgroundColor: task.status === "completed" ? "#22c55e" : PRIORITY_COLORS[task.priority] || "#999",
                }} />
                <span style={{
                  flex: 1, fontSize: 14,
                  textDecoration: task.status === "completed" ? "line-through" : "none",
                  color: task.status === "completed" ? "#999" : "#333",
                }}>
                  {task.title}
                </span>
                <span style={{ fontSize: 11, color: "#aaa" }}>
                  {task.status === "completed" ? "완료" : task.priority}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
