import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Project } from "../lib/api";

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setProjects(await api.listProjects());
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    try {
      const { id } = await api.createProject(name.trim(), description.trim());
      navigate(`/projects/${id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this app? This removes its files and database.")) return;
    await api.deleteProject(id);
    refresh();
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h2 className="mb-4 text-xl font-semibold">New app</h2>
      <form onSubmit={create} className="mb-10 space-y-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <input
          className="w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2"
          placeholder="App name (e.g. Household Chore Tracker)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className="w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2"
          placeholder="Optional: what should it do? You can also describe this in chat after creating it."
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          disabled={creating}
          className="rounded bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create app"}
        </button>
      </form>

      <h2 className="mb-4 text-xl font-semibold">Your apps</h2>
      <div className="space-y-2">
        {projects.length === 0 && <p className="text-neutral-500">No apps yet.</p>}
        {projects.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-700"
          >
            <button className="text-left" onClick={() => navigate(`/projects/${p.id}`)}>
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-neutral-500">
                {p.status}
                {p.running && <span className="ml-2 text-green-400">● running</span>}
              </div>
            </button>
            <button className="text-sm text-red-400 hover:text-red-300" onClick={() => remove(p.id)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
