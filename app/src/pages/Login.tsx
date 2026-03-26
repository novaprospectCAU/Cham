import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api.js";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요");
      return;
    }

    const result = await login(email, password);
    if (result.ok) {
      navigate("/dashboard");
    } else {
      setError("이메일 또는 비밀번호가 올바르지 않습니다");
    }
  };

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", backgroundColor: "#f5f5f5",
    }}>
      <form onSubmit={handleSubmit} style={{
        width: 360, padding: 32, backgroundColor: "#fff",
        borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, textAlign: "center" }}>
          로그인
        </h1>

        <input
          name="email"
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%", padding: "10px 12px", marginBottom: 12,
            borderRadius: 8, border: "1px solid #ddd", fontSize: 14,
          }}
        />

        <input
          name="password"
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%", padding: "10px 12px", marginBottom: 16,
            borderRadius: 8, border: "1px solid #ddd", fontSize: 14,
          }}
        />

        {error && (
          <div data-testid="error-message" style={{
            color: "#ef4444", fontSize: 13, marginBottom: 12,
            padding: "8px 12px", backgroundColor: "#fef2f2", borderRadius: 6,
          }}>
            {error}
          </div>
        )}

        <button type="submit" style={{
          width: "100%", padding: "10px 0", borderRadius: 8,
          border: "none", backgroundColor: "#3b82f6", color: "#fff",
          fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>
          로그인
        </button>
      </form>
    </div>
  );
}
