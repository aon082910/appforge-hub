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

export interface ChatResult {
  summary: string;
  files: string[];
  attempts: number;
  crashed: boolean;
  error?: string;
}

export interface RunResult {
  port: number;
  crashed: boolean;
  error?: string;
}

const RESULT_MARKER = "\n===APPFORGE_RESULT===\n";

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
  testSettings: (body: Record<string, string>) =>
    request<{ ok: boolean; reply?: string; error?: string }>("/api/settings/test", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listProjects: () => request<Project[]>("/api/projects"),
  createProject: (name: string, description: string) =>
    request<{ id: string }>("/api/projects", { method: "POST", body: JSON.stringify({ name, description }) }),
  getProject: (id: string) => request<ProjectDetail>(`/api/projects/${id}`),
  deleteProject: (id: string) => request(`/api/projects/${id}`, { method: "DELETE" }),
  getFile: (id: string, path: string) =>
    request<{ path: string; content: string }>(`/api/projects/${id}/file?path=${encodeURIComponent(path)}`),
  saveFile: (id: string, path: string, content: string) =>
    request(`/api/projects/${id}/file`, { method: "PUT", body: JSON.stringify({ path, content }) }),
  runProject: (id: string) => request<RunResult>(`/api/projects/${id}/run`, { method: "POST" }),
  stopProject: (id: string) => request(`/api/projects/${id}/stop`, { method: "POST" }),
  getLogs: (id: string) => request<{ log: string; running: boolean }>(`/api/projects/${id}/logs`),
  downloadUrl: (id: string) => `/api/projects/${id}/download`,

  /**
   * Streams the model's raw output via onChunk as it arrives, then resolves
   * with the final structured result once the server-side generation (and
   * any auto-fix retries) finish.
   */
  async sendChatStream(id: string, message: string, onChunk: (text: string) => void): Promise<ChatResult> {
    const res = await fetch(`/api/projects/${id}/chat`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Request failed: ${res.status}`);
    }
    if (!res.body) throw new Error("Streaming not supported by this browser");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let pending = "";
    let markerFound = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });

      if (!markerFound) {
        const idx = pending.indexOf(RESULT_MARKER);
        if (idx !== -1) {
          if (idx > 0) onChunk(pending.slice(0, idx));
          pending = pending.slice(idx + RESULT_MARKER.length);
          markerFound = true;
          continue;
        }
        // Keep back a tail as long as the marker in case it's split across
        // two reads, and flush everything before that safely.
        const safeLen = Math.max(0, pending.length - RESULT_MARKER.length);
        if (safeLen > 0) {
          onChunk(pending.slice(0, safeLen));
          pending = pending.slice(safeLen);
        }
      }
    }

    if (!markerFound) {
      onChunk(pending);
      throw new Error("Stream ended without a result");
    }

    const result = JSON.parse(pending) as ChatResult & { error?: string };
    if (result.error) throw new Error(result.error);
    return result;
  },
};
