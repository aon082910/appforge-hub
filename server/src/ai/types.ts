export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface StreamHandlers {
  onToken?: (token: string) => void;
}

export interface AiProvider {
  /** Human-readable name for logs/UI */
  readonly name: string;
  /** Send a chat completion request, returns the full text. Streams tokens via onToken if given. */
  chat(messages: ChatMessage[], handlers?: StreamHandlers): Promise<string>;
}

export type ProviderKind =
  | "none"
  | "anthropic"
  | "openai"
  | "openai_compatible"
  | "ollama"
  | "llamacpp";

export interface ProviderConfig {
  provider: ProviderKind;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}
