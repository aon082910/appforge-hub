import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider, ChatMessage, StreamHandlers } from "../types.js";

export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = "claude-sonnet-5") {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async chat(messages: ChatMessage[], handlers?: StreamHandlers): Promise<string> {
    const system = messages.find((m) => m.role === "system")?.content;
    const rest = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 8192,
      system,
      messages: rest,
    });

    let full = "";
    stream.on("text", (chunk) => {
      full += chunk;
      handlers?.onToken?.(chunk);
    });
    await stream.finalMessage();
    return full;
  }
}
