import { type ReactNode, useEffect, useState } from "react";
import { api } from "../lib/api";

export function AuthGate({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    check();
  }, []);

  async function check() {
    setLoading(true);
    try {
      const status = await api.authStatus();
      setSetupRequired(status.setupRequired);
      if (!status.setupRequired) {
        await api.me();
        setAuthed(true);
      }
    } catch {
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (setupRequired) await api.setup(username, password);
      else await api.login(username, password);
      setAuthed(true);
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) return <Centered>Loading…</Centered>;
  if (authed) return <>{children}</>;

  return (
    <Centered>
      <form onSubmit={submit} className="w-80 space-y-3 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        <h1 className="text-xl font-semibold text-neutral-100">
          {setupRequired ? "Set up AppForge Hub" : "Sign in"}
        </h1>
        {setupRequired && (
          <p className="text-sm text-neutral-400">Create the admin account for this instance.</p>
        )}
        <input
          className="w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />
        <input
          className="w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="w-full rounded bg-violet-600 px-3 py-2 font-medium text-white hover:bg-violet-500">
          {setupRequired ? "Create account" : "Sign in"}
        </button>
      </form>
    </Centered>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950">{children}</div>
  );
}
