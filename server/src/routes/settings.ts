import type { FastifyInstance } from "fastify";
import { getAllSettings, setSetting } from "../db/index.js";
import type { ProviderConfig, ProviderKind } from "../ai/types.js";

const KEYS = ["ai_provider", "ai_api_key", "ai_base_url", "ai_model"] as const;

export function currentProviderConfig(): ProviderConfig {
  const s = getAllSettings();
  return {
    provider: (s.ai_provider as ProviderKind) || (process.env.AI_PROVIDER as ProviderKind) || "none",
    apiKey: s.ai_api_key || process.env.AI_API_KEY || undefined,
    baseUrl: s.ai_base_url || process.env.AI_BASE_URL || undefined,
    model: s.ai_model || process.env.AI_MODEL || undefined,
  };
}

export async function settingsRoutes(app: FastifyInstance) {
  app.get("/api/settings", async () => {
    const cfg = currentProviderConfig();
    return {
      provider: cfg.provider,
      baseUrl: cfg.baseUrl || "",
      model: cfg.model || "",
      apiKeySet: Boolean(cfg.apiKey),
    };
  });

  app.put<{ Body: Partial<Record<(typeof KEYS)[number], string>> }>("/api/settings", async (req) => {
    const body = req.body || {};
    for (const key of KEYS) {
      if (typeof body[key] === "string") {
        // Don't overwrite a stored key with an empty string sent by an
        // untouched masked field in the settings form.
        if (key === "ai_api_key" && body[key] === "") continue;
        setSetting(key, body[key] as string);
      }
    }
    return { ok: true };
  });
}
