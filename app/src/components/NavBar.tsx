import { useNavigate, useLocation } from "react-router-dom";
import { logout } from "../api.js";

export function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav style={{
      display: "flex", gap: 16, padding: "12px 24px",
      backgroundColor: "#fff", borderBottom: "1px solid #e5e5e5",
      alignItems: "center",
    }}>
      <span style={{ fontWeight: 700, fontSize: 16 }}>Todo App</span>
      <div style={{ flex: 1 }} />
      <button
        data-testid="nav-dashboard"
        onClick={() => navigate("/dashboard")}
        style={{
          border: "none", background: "none", cursor: "pointer", fontSize: 14,
          color: location.pathname === "/dashboard" ? "#3b82f6" : "#666",
          fontWeight: location.pathname === "/dashboard" ? 600 : 400,
        }}
      >
        대시보드
      </button>
      <button
        data-testid="nav-tasks"
        onClick={() => navigate("/tasks")}
        style={{
          border: "none", background: "none", cursor: "pointer", fontSize: 14,
          color: location.pathname.startsWith("/tasks") ? "#3b82f6" : "#666",
          fontWeight: location.pathname.startsWith("/tasks") ? 600 : 400,
        }}
      >
        할일
      </button>
      <button
        data-testid="nav-logout"
        onClick={() => { logout(); navigate("/login"); }}
        style={{
          border: "none", background: "none", cursor: "pointer",
          fontSize: 14, color: "#ef4444",
        }}
      >
        로그아웃
      </button>
    </nav>
  );
}
