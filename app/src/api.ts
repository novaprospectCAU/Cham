const BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("token");
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (res.ok) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
  }
  return { ok: res.ok, data };
}

export function getUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export async function getTasks(empty = false) {
  const url = empty ? `${BASE}/tasks?_empty=true` : `${BASE}/tasks`;
  const res = await fetch(url, { headers: headers() });
  return res.json();
}

export async function getTask(id: string) {
  const res = await fetch(`${BASE}/tasks/${id}`, { headers: headers() });
  return res.json();
}

export async function createTask(title: string, description: string, priority: string) {
  const res = await fetch(`${BASE}/tasks`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ title, description, priority }),
  });
  return { ok: res.ok, data: await res.json() };
}

export async function completeTask(id: string) {
  const res = await fetch(`${BASE}/tasks/${id}/complete`, {
    method: "PATCH",
    headers: headers(),
  });
  return res.json();
}

export async function deleteTask(id: string) {
  const res = await fetch(`${BASE}/tasks/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  return res.json();
}
