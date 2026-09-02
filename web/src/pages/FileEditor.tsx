import { oneDark } from "@codemirror/theme-one-dark";
import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { languageExtensionFor } from "../lib/language";

export default function FileEditor({
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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, content]);

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
        <div className="flex-1 overflow-auto">
          {loading || !selected ? (
            <p className="p-4 text-sm text-neutral-500">{loading ? "Loading…" : "No file selected"}</p>
          ) : (
            <CodeMirror
              key={selected}
              value={content}
              height="100%"
              theme={oneDark}
              extensions={languageExtensionFor(selected)}
              basicSetup={{ foldGutter: true, highlightActiveLine: true }}
              onChange={(value) => {
                setContent(value);
                setDirty(true);
              }}
              style={{ height: "100%" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
