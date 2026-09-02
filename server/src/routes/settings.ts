import type { FastifyInstance } from "fastify";
import { createProvider } from "../ai/index.js";
import { getAllSettings, setSetting } from "../db/index.js";
import type { ProviderConfig, ProviderKind } from "../ai/types.js";

const TEST_TIMEOUT_MS = 25_000;

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

  // Tests a provider config without saving it -- values passed here override
  // the stored ones for this call only (blank/omitted falls back to what's
  // already saved, matching the "leave blank to keep" convention on the PUT
  // above), so this also doubles as "test my already-saved settings".
  app.post<{ Body: Partial<Record<(typeof KEYS)[number], string>> }>(
    "/api/settings/test",
    async (req, reply) => {
      const body = req.body || {};
      const stored = currentProviderConfig();
      const cfg: ProviderConfig = {
        provider: (body.ai_provider as ProviderKind) || stored.provider,
        apiKey: body.ai_api_key || stored.apiKey,
        baseUrl: body.ai_base_url || stored.baseUrl,
        model: body.ai_model || stored.model,
      };

      if (cfg.provider === "none") {
        return reply.code(400).send({ ok: false, error: "Select a provider first" });
      }

      try {
        const provider = createProvider(cfg);
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`No response after ${TEST_TIMEOUT_MS / 1000}s`)), TEST_TIMEOUT_MS)
        );
        const text = await Promise.race([
          provider.chat([{ role: "user", content: "Reply with exactly the word OK and nothing else." }]),
          timeout,
        ]);
        return { ok: true, reply: text.trim().slice(0, 200) };
      } catch (err: any) {
        return { ok: false, error: err.message || "Connection failed" };
      }
    }
  );
}
