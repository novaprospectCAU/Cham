import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "../components/NavBar.js";
import { getUser, getTasks } from "../api.js";

export function Dashboard() {
  const navigate = useNavigate();
  const user = getUser();
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    getTasks().then((data) => setTaskCount(data.total || 0));
  }, []);

  if (!user) return null;

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 600, margin: "40px auto", padding: "0 24px" }}>
        <div data-testid="user-greeting" style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
          안녕하세요, {user.name}님
        </div>

        <div data-testid="task-summary-card" style={{
          padding: 24, backgroundColor: "#fff", borderRadius: 12,
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: 16,
        }}>
          <div style={{ fontSize: 14, color: "#888", marginBottom: 8 }}>전체 할일</div>
          <div data-testid="task-total-count" style={{ fontSize: 36, fontWeight: 700, color: "#3b82f6" }}>
            {taskCount}
          </div>
        </div>

        <button
          data-testid="create-task-button"
          onClick={() => navigate("/tasks/new")}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 8,
            border: "none", backgroundColor: "#3b82f6", color: "#fff",
            fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}
        >
          + 새 할일 만들기
        </button>
      </div>
    </div>
  );
}
