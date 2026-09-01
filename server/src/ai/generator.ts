import fs from "node:fs";
import path from "node:path";
import type { AiProvider, ChatMessage } from "./types.js";

export const SYSTEM_PROMPT = `You are AppForge, an AI that generates small self-hosted web apps.

The app runs on Node/Express with these fixed conventions already provided by the runtime (do NOT reimplement them):
- require('./lib/db') gives a ready-to-use better-sqlite3 database handle. Create your own tables with db.exec(...) at startup with CREATE TABLE IF NOT EXISTS.
- require('./lib/auth') exports { registerUser(email, password), verifyUser(email, password), signToken(user), requireAuth } backed by a pre-existing 'users' table. Use these instead of writing your own auth/password hashing. Set the cookie yourself, e.g. res.cookie('token', signToken(user), { httpOnly: true }).
- Dependencies already installed and available to require(): express, better-sqlite3, bcryptjs, jsonwebtoken, cookie-parser. Do not use any other npm package — there is no network access to install more at runtime.
- server.js must read the port from process.env.PORT and call app.listen(port).
- Static frontend files go under public/ and are served automatically by express.static in the starter server.js (keep that line if you keep server.js's structure, or replicate it).
- Keep the frontend as plain HTML/CSS/JS (no build step is run) unless the user explicitly asks for something else.

Respond with ONLY a single JSON object (no markdown fences, no commentary) of this exact shape:
{
  "summary": "one or two sentences describing what you built or changed",
  "files": [
    { "path": "server.js", "content": "...full file contents..." },
    { "path": "public/index.html", "content": "...full file contents..." }
  ]
}

Rules:
- "files" contains ONLY files you are creating or overwriting, each with its COMPLETE new content (never a diff/snippet).
- Paths are relative, no leading slash, no "..".
- Always include a complete, working server.js and public/index.html on the first message that scaffolds the app.
- On follow-up requests, only include the files that actually changed.`;

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GenerationResult {
  summary: string;
  files: GeneratedFile[];
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Model response did not contain a JSON object");
  return JSON.parse(candidate.slice(start, end + 1));
}

export async function generateApp(
  provider: AiProvider,
  history: ChatMessage[],
  onToken?: (t: string) => void
): Promise<GenerationResult> {
  const messages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }, ...history];
  const raw = await provider.chat(messages, { onToken });
  const parsed = extractJson(raw) as GenerationResult;
  if (!parsed.files || !Array.isArray(parsed.files)) {
    throw new Error("Model response was missing a 'files' array");
  }
  for (const f of parsed.files) {
    if (typeof f.path !== "string" || f.path.startsWith("/") || f.path.includes("..")) {
      throw new Error(`Refusing unsafe file path: ${f.path}`);
    }
  }
  return parsed;
}

export function writeGeneratedFiles(projectDir: string, files: GeneratedFile[]) {
  for (const file of files) {
    const target = path.join(projectDir, file.path);
    if (!target.startsWith(path.resolve(projectDir))) {
      throw new Error(`Refusing to write outside project dir: ${file.path}`);
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.content, "utf8");
  }
}
