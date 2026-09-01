import OpenAI from "openai";
import type { AiProvider, ChatMessage, StreamHandlers } from "../types.js";

/**
 * Handles OpenAI proper, and any OpenAI-compatible endpoint (OpenRouter, Groq,
 * LM Studio, vLLM, etc.) by pointing baseURL elsewhere.
 */
export class OpenAiCompatibleProvider implements AiProvider {
  readonly name: string;
  private client: OpenAI;
  private model: string;

  constructor(opts: { apiKey?: string; baseUrl?: string; model: string; label?: string }) {
    this.client = new OpenAI({
      apiKey: opts.apiKey || "not-needed",
      baseURL: opts.baseUrl,
    });
    this.model = opts.model;
    this.name = opts.label || "openai";
  }

  async chat(messages: ChatMessage[], handlers?: StreamHandlers): Promise<string> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    });

    let full = "";
    for await (const part of stream) {
      const token = part.choices[0]?.delta?.content;
      if (token) {
        full += token;
        handlers?.onToken?.(token);
      }
    }
    return full;
  }
}
