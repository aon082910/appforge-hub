import { AnthropicProvider } from "./providers/anthropic.js";
import { OpenAiCompatibleProvider } from "./providers/openai.js";
import type { AiProvider, ProviderConfig } from "./types.js";

/**
 * Ollama and llama.cpp (llama-server) both expose an OpenAI-compatible
 * /v1/chat/completions endpoint, so they reuse OpenAiCompatibleProvider
 * with a different default base URL/model instead of bespoke clients.
 */
export function createProvider(cfg: ProviderConfig): AiProvider {
  switch (cfg.provider) {
    case "anthropic":
      if (!cfg.apiKey) throw new Error("Anthropic API key is required");
      return new AnthropicProvider(cfg.apiKey, cfg.model || "claude-sonnet-5");

    case "openai":
      if (!cfg.apiKey) throw new Error("OpenAI API key is required");
      return new OpenAiCompatibleProvider({
        apiKey: cfg.apiKey,
        model: cfg.model || "gpt-4o",
        label: "openai",
      });

    case "openai_compatible":
      if (!cfg.baseUrl) throw new Error("Base URL is required for a custom OpenAI-compatible endpoint");
      return new OpenAiCompatibleProvider({
        apiKey: cfg.apiKey,
        baseUrl: cfg.baseUrl,
        model: cfg.model || "gpt-4o",
        label: "openai_compatible",
      });

    case "ollama":
      return new OpenAiCompatibleProvider({
        apiKey: "ollama",
        baseUrl: (cfg.baseUrl || "http://ollama:11434") + "/v1",
        model: cfg.model || "llama3.1",
        label: "ollama",
      });

    case "llamacpp":
      return new OpenAiCompatibleProvider({
        apiKey: "not-needed",
        baseUrl: (cfg.baseUrl || "http://llamacpp:8080") + "/v1",
        model: cfg.model || "local-model",
        label: "llamacpp",
      });

    default:
      throw new Error(`Unknown or unconfigured AI provider: ${cfg.provider}`);
  }
}
