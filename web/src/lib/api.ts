async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data as T;
}

export interface AuthStatus {
  setupRequired: boolean;
}

export interface Settings {
  provider: string;
  baseUrl: string;
  model: string;
  apiKeySet: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  port: number | null;
  running: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ProjectDetail extends Project {
  messages: ChatMsg[];
  files: string[];
}

export const api = {
  authStatus: () => request<AuthStatus>("/api/auth/status"),
  setup: (username: string, password: string) =>
    request("/api/auth/setup", { method: "POST", body: JSON.stringify({ username, password }) }),
  login: (username: string, password: string) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  me: () => request<{ username: string }>("/api/auth/me"),

  getSettings: () => request<Settings>("/api/settings"),
  saveSettings: (body: Record<string, string>) =>
    request("/api/settings", { method: "PUT", body: JSON.stringify(body) }),

  listProjects: () => request<Project[]>("/api/projects"),
  createProject: (name: string, description: string) =>
    request<{ id: string }>("/api/projects", { method: "POST", body: JSON.stringify({ name, description }) }),
  getProject: (id: string) => request<ProjectDetail>(`/api/projects/${id}`),
  deleteProject: (id: string) => request(`/api/projects/${id}`, { method: "DELETE" }),
  getFile: (id: string, path: string) =>
    request<{ path: string; content: string }>(`/api/projects/${id}/file?path=${encodeURIComponent(path)}`),
  sendChat: (id: string, message: string) =>
    request<{ summary: string; files: string[] }>(`/api/projects/${id}/chat`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  runProject: (id: string) => request<{ port: number }>(`/api/projects/${id}/run`, { method: "POST" }),
  stopProject: (id: string) => request(`/api/projects/${id}/stop`, { method: "POST" }),
};
