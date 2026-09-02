import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type ChatMsg, type ProjectDetail } from "../lib/api";

type Tab = "preview" | "files";

export function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [tab, setTab] = useState<Tab>("preview");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) load(id);
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function load(projectId: string) {
    const p = await api.getProject(projectId);
    setProject(p);
    setMessages(p.messages);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setError("");
    setMessages((m) => [...m, { role: "user", content: text, created_at: "" }]);
    setSending(true);
    try {
      const result = await api.sendChat(id, text);
      setMessages((m) => [...m, { role: "assistant", content: result.summary, created_at: "" }]);
      await load(id);
      setPreviewKey((k) => k + 1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function toggleRun() {
    if (!id || !project) return;
    if (project.running) await api.stopProject(id);
    else {
      await api.runProject(id);
      setPreviewKey((k) => k + 1);
    }
    await load(id);
  }

  if (!project || !id) return <div className="p-8 text-neutral-400">Loading…</div>;

  return (
    <div className="flex h-full">
      <div className="flex w-[420px] flex-col border-r border-neutral-800">
        <div className="border-b border-neutral-800 p-4">
          <h2 className="font-semibold">{project.name}</h2>
          <p className="text-xs text-neutral-500">{project.description || "No description"}</p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="text-sm text-neutral-500">
              Describe the app you want, e.g. "A page to track household chores with who did what and when,
              with login for each family member."
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-lg p-3 text-sm ${
                m.role === "user" ? "bg-violet-600/20 text-neutral-100" : "bg-neutral-900 text-neutral-300"
              }`}
            >
              {m.content}
            </div>
          ))}
          {sending && <div className="text-sm text-neutral-500">Building…</div>}
          <div ref={bottomRef} />
        </div>

        {error && <p className="px-4 text-sm text-red-400">{error}</p>}

        <form onSubmit={send} className="flex gap-2 border-t border-neutral-800 p-4">
          <input
            className="flex-1 rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm"
            placeholder="Describe what to build or change…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <button
            className="rounded bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            disabled={sending}
          >
            Send
          </button>
        </form>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-neutral-800 p-4">
          <div className="flex items-center gap-4">
            <div className="flex rounded border border-neutral-700 text-sm">
              <button
                onClick={() => setTab("preview")}
                className={`px-3 py-1.5 ${tab === "preview" ? "bg-neutral-800 text-white" : "text-neutral-400"}`}
              >
                Preview
              </button>
              <button
                onClick={() => setTab("files")}
                className={`px-3 py-1.5 ${tab === "files" ? "bg-neutral-800 text-white" : "text-neutral-400"}`}
              >
                Files
              </button>
            </div>
            <span className="text-sm text-neutral-400">
              {project.running ? (
                <span className="text-green-400">● Running</span>
              ) : (
                <span className="text-neutral-500">○ Stopped</span>
              )}
            </span>
          </div>
          <button
            onClick={toggleRun}
            className="rounded bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700"
          >
            {project.running ? "Stop" : "Run"}
          </button>
        </div>

        {tab === "preview" ? (
          <div className="flex-1 bg-white">
            {project.running ? (
              <iframe
                key={previewKey}
                title="preview"
                src={`/preview/${project.id}/`}
                className="h-full w-full border-0"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-neutral-400">
                Press Run to preview the app
              </div>
            )}
          </div>
        ) : (
          <FileEditor projectId={id} files={project.files} onSaved={() => load(id)} />
        )}
      </div>
    </div>
  );
}

function FileEditor({
  projectId,
  files,
  onSaved,
}: {
  projectId: string;
  files: string[];
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(files[0] ?? null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (selected) openFile(selected);
    else setContent("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => {
    if (selected && !files.includes(selected)) setSelected(files[0] ?? null);
  }, [files, selected]);

  async function openFile(path: string) {
    setLoading(true);
    setError("");
    try {
      const f = await api.getFile(projectId, path);
      setContent(f.content);
      setDirty(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      await api.saveFile(projectId, selected, content);
      setDirty(false);
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-56 overflow-y-auto border-r border-neutral-800 p-2">
        {files.map((f) => (
          <button
            key={f}
            onClick={() => setSelected(f)}
            className={`block w-full truncate rounded px-2 py-1 text-left font-mono text-xs ${
              f === selected ? "bg-neutral-800 text-white" : "text-neutral-400 hover:bg-neutral-900"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
          <span className="font-mono text-sm text-neutral-300">{selected || "No file selected"}</span>
          <button
            onClick={save}
            disabled={!selected || !dirty || saving}
            className="rounded bg-violet-600 px-3 py-1 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        {error && <p className="px-4 pt-2 text-sm text-red-400">{error}</p>}
        <textarea
          className="flex-1 resize-none bg-neutral-950 p-4 font-mono text-sm text-neutral-200 outline-none"
          value={loading ? "Loading…" : content}
          disabled={loading || !selected}
          onChange={(e) => {
            setContent(e.target.value);
            setDirty(true);
          }}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
