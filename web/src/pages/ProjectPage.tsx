import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type ChatMsg, type ProjectDetail } from "../lib/api";

type Tab = "preview" | "files" | "logs";

export function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [tab, setTab] = useState<Tab>("preview");
  const [crashInfo, setCrashInfo] = useState<{ error: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const streamBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) load(id);
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    streamBoxRef.current?.scrollTo({ top: streamBoxRef.current.scrollHeight });
  }, [streamText]);

  async function load(projectId: string) {
    const p = await api.getProject(projectId);
    setProject(p);
    setMessages(p.messages);
  }

  async function sendMessage(text: string) {
    if (!id || !text.trim() || sending) return;
    setError("");
    setCrashInfo(null);
    setMessages((m) => [...m, { role: "user", content: text, created_at: "" }]);
    setSending(true);
    setStreamText("");
    try {
      const result = await api.sendChatStream(id, text, (chunk) => setStreamText((s) => s + chunk));
      setMessages((m) => [...m, { role: "assistant", content: result.summary, created_at: "" }]);
      if (result.crashed) setCrashInfo({ error: result.summary });
      await load(id);
      setPreviewKey((k) => k + 1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
      setStreamText("");
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    setInput("");
    await sendMessage(text);
  }

  async function toggleRun() {
    if (!id || !project) return;
    setError("");
    if (project.running) {
      await api.stopProject(id);
      setCrashInfo(null);
    } else {
      const result = await api.runProject(id);
      setPreviewKey((k) => k + 1);
      if (result.crashed) setCrashInfo({ error: result.error || "The app crashed on startup." });
      else setCrashInfo(null);
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
          {messages.length === 0 && !sending && (
            <p className="text-sm text-neutral-500">
              Describe the app you want, e.g. "A page to track household chores with who did what and when,
              with login for each family member."
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-lg p-3 text-sm whitespace-pre-wrap ${
                m.role === "user" ? "bg-violet-600/20 text-neutral-100" : "bg-neutral-900 text-neutral-300"
              }`}
            >
              {m.content}
            </div>
          ))}
          {sending && (
            <div>
              <div className="mb-1 text-xs text-neutral-500">Building…</div>
              <div
                ref={streamBoxRef}
                className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-neutral-900 p-3 font-mono text-xs text-neutral-500"
              >
                {streamText || "…"}
              </div>
            </div>
          )}
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
              <button
                onClick={() => setTab("logs")}
                className={`px-3 py-1.5 ${tab === "logs" ? "bg-neutral-800 text-white" : "text-neutral-400"}`}
              >
                Logs
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
          <div className="flex gap-2">
            <a
              href={api.downloadUrl(project.id)}
              className="rounded bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700"
            >
              Download
            </a>
            <button
              onClick={toggleRun}
              className="rounded bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700"
            >
              {project.running ? "Stop" : "Run"}
            </button>
          </div>
        </div>

        {crashInfo && (
          <div className="border-b border-red-900 bg-red-950/50 p-4 text-sm text-red-300">
            <div className="mb-2 font-medium">The app crashed on startup.</div>
            <pre className="mb-2 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono text-xs text-red-400">
              {crashInfo.error}
            </pre>
            <button
              onClick={() => sendMessage(`The app crashed on startup with this error:\n\n${crashInfo.error}\n\nPlease fix it.`)}
              disabled={sending}
              className="rounded bg-red-800 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Ask AI to fix it
            </button>
          </div>
        )}

        {tab === "preview" && (
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
        )}
        {tab === "files" && (
          <FileEditor projectId={id} files={project.files} onSaved={() => load(id)} />
        )}
        {tab === "logs" && <LogsView projectId={id} running={project.running} />}
      </div>
    </div>
  );
}

function LogsView({ projectId, running }: { projectId: string; running: boolean }) {
  const [log, setLog] = useState("");
  const [loading, setLoading] = useState(true);
  const boxRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const r = await api.getLogs(projectId);
        if (!cancelled) setLog(r.log);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    poll();
    const interval = running ? setInterval(poll, 2000) : undefined;
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [projectId, running]);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  }, [log]);

  return (
    <div className="flex-1 overflow-hidden bg-neutral-950 p-4">
      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : (
        <pre ref={boxRef} className="h-full overflow-y-auto whitespace-pre-wrap font-mono text-xs text-neutral-400">
          {log || "No output yet. Run the app to see its logs here."}
        </pre>
      )}
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
