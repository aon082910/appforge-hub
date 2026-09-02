import fs from "node:fs";
import path from "node:path";
import type { AiProvider, ChatMessage } from "./types.js";

// A delimiter-based output format instead of JSON: smaller/local models are
// unreliable at producing valid JSON once file content includes quotes,
// backticks, or literal newlines (observed firsthand against a local Ollama
// model, which emitted an unescaped template literal inside a JSON string).
// Plain markers sidestep escaping entirely -- file content is taken verbatim
// between markers, no matter what characters it contains.
const FILE_START = /^===FILE:\s*(.+?)\s*===$/;
const FILE_END = "===END FILE===";
const SUMMARY_START = "===SUMMARY===";
const SUMMARY_END = "===END SUMMARY===";

export const SYSTEM_PROMPT = `You are AppForge, an AI that generates small self-hosted web apps.

The app runs on Node/Express with these fixed conventions already provided by the runtime (do NOT reimplement them):
- require('./lib/db') gives a ready-to-use SQLite database handle (Node's built-in node:sqlite, same API shape as better-sqlite3: db.exec(sql), db.prepare(sql).run(...params)/.get(...params)/.all(...params)). Create your own tables with db.exec(...) at startup with CREATE TABLE IF NOT EXISTS.
- require('./lib/auth') exports { registerUser(email, password), verifyUser(email, password), signToken(user), requireAuth } backed by a pre-existing 'users' table. Use these instead of writing your own auth/password hashing. Set the cookie yourself, e.g. res.cookie('token', signToken(user), { httpOnly: true }).
- Dependencies already installed and available to require(): express, bcryptjs, jsonwebtoken, cookie-parser, plus the built-in node:sqlite. Do not use any other npm package — there is no network access to install more at runtime.
- server.js must read the port from process.env.PORT and call app.listen(port).
- Static frontend files go under public/ and are served automatically by express.static in the starter server.js (keep that line if you keep server.js's structure, or replicate it).
- Keep the frontend as plain HTML/CSS/JS (no build step is run) unless the user explicitly asks for something else.

Respond in EXACTLY this plain-text format — no JSON, no markdown code fences around the whole response:

===SUMMARY===
One or two sentences describing what you built or changed.
===END SUMMARY===
===FILE: server.js===
...complete file contents, verbatim, no escaping...
===END FILE===
===FILE: public/index.html===
...complete file contents, verbatim, no escaping...
===END FILE===

Rules:
- Every file's content goes between its own "===FILE: <path>===" and "===END FILE===" markers, written exactly as it should appear on disk — do not escape quotes, backticks, or newlines, and do not wrap file content in markdown code fences.
- Include ONLY files you are creating or overwriting, each with its COMPLETE new content (never a diff/snippet).
- Paths are relative, no leading slash, no "..".
- Always include a complete, working server.js and public/index.html on the first message that scaffolds the app.
- On follow-up requests, only include the files that actually changed.
- Do not write any text outside the ===SUMMARY=== and ===FILE=== blocks.`;

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GenerationResult {
  summary: string;
  files: GeneratedFile[];
}

export function parseGeneration(raw: string): GenerationResult {
  const summaryStart = raw.indexOf(SUMMARY_START);
  const summaryEnd = raw.indexOf(SUMMARY_END);
  const summary =
    summaryStart !== -1 && summaryEnd !== -1
      ? raw.slice(summaryStart + SUMMARY_START.length, summaryEnd).trim()
      : "Updated the app.";

  const lines = raw.split("\n");
  const files: GeneratedFile[] = [];
  let current: { path: string; lines: string[] } | null = null;

  for (const line of lines) {
    const startMatch = line.match(FILE_START);
    if (startMatch) {
      if (current) files.push({ path: current.path, content: current.lines.join("\n") });
      current = { path: startMatch[1].trim(), lines: [] };
      continue;
    }
    if (current && line.trim() === FILE_END) {
      files.push({ path: current.path, content: current.lines.join("\n") });
      current = null;
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) files.push({ path: current.path, content: current.lines.join("\n") });

  if (files.length === 0) {
    throw new Error(
      "Model response didn't contain any ===FILE: ...=== blocks. It may not have followed the required format."
    );
  }
  for (const f of files) {
    if (!f.path || f.path.startsWith("/") || f.path.includes("..")) {
      throw new Error(`Refusing unsafe file path: ${f.path}`);
    }
  }
  return { summary, files };
}

export async function generateApp(
  provider: AiProvider,
  history: ChatMessage[],
  onToken?: (t: string) => void
): Promise<GenerationResult> {
  const messages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }, ...history];
  const raw = await provider.chat(messages, { onToken });
  return parseGeneration(raw);
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
