import { useEffect, useState } from "react";
import { api } from "../lib/api";

const PROVIDERS = [
  { value: "none", label: "None (disabled)" },
  { value: "anthropic", label: "Anthropic (Claude API)" },
  { value: "openai", label: "OpenAI API" },
  { value: "openai_compatible", label: "Custom OpenAI-compatible endpoint" },
  { value: "ollama", label: "Local: Ollama" },
  { value: "llamacpp", label: "Local: llama.cpp server" },
];

const NEEDS_KEY = new Set(["anthropic", "openai", "openai_compatible"]);
const NEEDS_BASE_URL = new Set(["openai_compatible", "ollama", "llamacpp"]);

export function SettingsPage() {
  const [provider, setProvider] = useState("none");
  const [apiKey, setApiKey] = useState("");
  const [apiKeySet, setApiKeySet] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getSettings().then((s) => {
      setProvider(s.provider);
      setBaseUrl(s.baseUrl);
      setModel(s.model);
      setApiKeySet(s.apiKeySet);
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    try {
      await api.saveSettings({
        ai_provider: provider,
        ai_api_key: apiKey,
        ai_base_url: baseUrl,
        ai_model: model,
      });
      setSaved(true);
      setApiKey("");
      if (apiKey) setApiKeySet(true);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-8">
      <h2 className="mb-4 text-xl font-semibold">AI provider</h2>
      <p className="mb-6 text-sm text-neutral-400">
        Choose a cloud API for the best results, or point at a local model for fully offline use. Ollama and
        llama.cpp are used through their OpenAI-compatible endpoints.
      </p>
      <form onSubmit={save} className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <div>
          <label className="mb-1 block text-sm text-neutral-400">Provider</label>
          <select
            className="w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {NEEDS_KEY.has(provider) && (
          <div>
            <label className="mb-1 block text-sm text-neutral-400">
              API key {apiKeySet && <span className="text-green-400">(already set — leave blank to keep)</span>}
            </label>
            <input
              type="password"
              className="w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={apiKeySet ? "••••••••" : "sk-…"}
            />
          </div>
        )}

        {NEEDS_BASE_URL.has(provider) && (
          <div>
            <label className="mb-1 block text-sm text-neutral-400">
              Base URL
              {provider === "ollama" && " (e.g. http://ollama:11434 or http://192.168.1.50:11434)"}
              {provider === "llamacpp" && " (e.g. http://llamacpp:8080)"}
            </label>
            <input
              className="w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={
                provider === "ollama"
                  ? "http://ollama:11434"
                  : provider === "llamacpp"
                    ? "http://llamacpp:8080"
                    : "https://api.example.com/v1"
              }
            />
          </div>
        )}

        {provider !== "none" && (
          <div>
            <label className="mb-1 block text-sm text-neutral-400">Model</label>
            <input
              className="w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={
                provider === "anthropic"
                  ? "claude-sonnet-5"
                  : provider === "openai"
                    ? "gpt-4o"
                    : provider === "ollama"
                      ? "llama3.1"
                      : "model name"
              }
            />
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
        {saved && <p className="text-sm text-green-400">Saved.</p>}
        <button className="rounded bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-500">
          Save
        </button>
      </form>
    </div>
  );
}
