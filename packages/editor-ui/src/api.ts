const BASE = "";

export async function fetchScenarios() {
  const res = await fetch(`${BASE}/api/scenarios`);
  return res.json();
}

export async function fetchResult(id: string) {
  const res = await fetch(`${BASE}/api/scenarios/${id}/result`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchBaseline(id: string) {
  const res = await fetch(`${BASE}/api/scenarios/${id}/baseline`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchDiff(id: string) {
  const res = await fetch(`${BASE}/api/scenarios/${id}/diff`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchCoverage() {
  const res = await fetch(`${BASE}/api/coverage`);
  return res.json();
}

export async function confirmScenario(id: string) {
  const res = await fetch(`${BASE}/api/scenarios/${id}/confirm`, { method: "POST" });
  return res.json();
}

export async function rejectScenario(id: string, comment: string) {
  const res = await fetch(`${BASE}/api/scenarios/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment }),
  });
  return res.json();
}
