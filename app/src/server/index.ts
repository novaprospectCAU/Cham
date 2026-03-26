import express from "express";
import cors from "cors";
import crypto from "node:crypto";

const app = express();
app.use(cors());
app.use(express.json());

// --- In-memory store ---

interface User { id: string; name: string; email: string; password: string; }
interface Task { id: string; title: string; description: string; priority: string; status: string; created_at: string; completed_at: string | null; user_id: string; }

const users: User[] = [
  { id: crypto.randomUUID(), name: "테스트 유저", email: "test@example.com", password: "password123" },
];

let tasks: Task[] = [];

function generateToken(userId: string): string {
  return `jwt_${userId}_${Date.now()}`;
}

function getUserFromToken(auth: string | undefined): User | null {
  if (!auth?.startsWith("Bearer jwt_")) return null;
  const userId = auth.split("_")[1];
  return users.find((u) => u.id === userId) || null;
}

// --- Auth ---

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) {
    res.status(401).json({ error: "INVALID_CREDENTIALS" });
    return;
  }
  res.json({
    token: generateToken(user.id),
    user: { id: user.id, name: user.name, email: user.email },
  });
});

// --- Tasks ---

app.get("/api/tasks", (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "UNAUTHORIZED" }); return; }

  const empty = req.query._empty === "true";
  const userTasks = empty ? [] : tasks.filter((t) => t.user_id === user.id);
  res.json({ tasks: userTasks, total: userTasks.length });
});

app.post("/api/tasks", (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "UNAUTHORIZED" }); return; }

  const { title, description, priority } = req.body;
  if (!title) { res.status(400).json({ error: "TITLE_REQUIRED" }); return; }

  const task: Task = {
    id: crypto.randomUUID(),
    title,
    description: description || "",
    priority: priority || "medium",
    status: "active",
    created_at: new Date().toISOString(),
    completed_at: null,
    user_id: user.id,
  };
  tasks.unshift(task);
  res.status(201).json(task);
});

app.get("/api/tasks/:id", (req, res) => {
  const task = tasks.find((t) => t.id === req.params.id);
  if (!task) { res.status(404).json({ error: "NOT_FOUND" }); return; }
  res.json(task);
});

app.patch("/api/tasks/:id/complete", (req, res) => {
  const task = tasks.find((t) => t.id === req.params.id);
  if (!task) { res.status(404).json({ error: "NOT_FOUND" }); return; }
  task.status = "completed";
  task.completed_at = new Date().toISOString();
  res.json(task);
});

app.delete("/api/tasks/:id", (req, res) => {
  const idx = tasks.findIndex((t) => t.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "NOT_FOUND" }); return; }
  tasks.splice(idx, 1);
  res.json({ deleted: true });
});

app.listen(3001, () => {
  console.log("Todo API server running on http://localhost:3001");
});
