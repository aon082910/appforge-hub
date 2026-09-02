import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { createProvider } from "../ai/index.js";
import { generateApp, writeGeneratedFiles } from "../ai/generator.js";
import type { ChatMessage } from "../ai/types.js";
import { db } from "../db/index.js";
import { getRunningPort, isRunning, startApp, stopApp } from "../runtime/runner.js";
import { scaffoldProject } from "../runtime/scaffold.js";
import { PROJECTS_DIR, projectDir } from "../util/paths.js";
import { currentProviderConfig } from "./settings.js";

interface ProjectRow {
  id: string;
  name: string;
  description: string;
  status: string;
  port: number | null;
  created_at: string;
  updated_at: string;
}

function listFiles(dir: string, base = dir): string[] {
  let out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "data.sqlite" || entry.name.startsWith("data.sqlite-")) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out = out.concat(listFiles(full, base));
    } else {
      out.push(path.relative(base, full).replace(/\\/g, "/"));
    }
  }
  return out.sort();
}

export async function projectRoutes(app: FastifyInstance) {
  app.get("/api/projects", async () => {
    const rows = db.prepare("SELECT * FROM projects ORDER BY updated_at DESC").all() as unknown as ProjectRow[];
    return rows.map((r) => ({ ...r, running: isRunning(r.id) }));
  });

  app.post<{ Body: { name: string; description?: string } }>("/api/projects", async (req, reply) => {
    const { name, description } = req.body || ({} as any);
    if (!name?.trim()) return reply.code(400).send({ error: "Name is required" });
    const id = nanoid(10);
    scaffoldProject(projectDir(id));
    db.prepare("INSERT INTO projects (id, name, description) VALUES (?, ?, ?)").run(
      id,
      name.trim(),
      description || ""
    );
    return { id };
  });

  app.get<{ Params: { id: string } }>("/api/projects/:id", async (req, reply) => {
    const row = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id) as
      | ProjectRow
      | undefined;
    if (!row) return reply.code(404).send({ error: "Not found" });
    const messages = db
      .prepare("SELECT role, content, created_at FROM chat_messages WHERE project_id = ? ORDER BY id ASC")
      .all(req.params.id);
    const files = listFiles(projectDir(req.params.id));
    return { ...row, running: isRunning(row.id), port: getRunningPort(row.id) ?? null, messages, files };
  });

  app.get<{ Params: { id: string }; Querystring: { path: string } }>(
    "/api/projects/:id/file",
    async (req, reply) => {
      const dir = projectDir(req.params.id);
      const target = path.join(dir, req.query.path || "");
      if (!target.startsWith(path.resolve(dir))) return reply.code(400).send({ error: "Invalid path" });
      if (!fs.existsSync(target)) return reply.code(404).send({ error: "Not found" });
      return { path: req.query.path, content: fs.readFileSync(target, "utf8") };
    }
  );

  app.put<{ Params: { id: string }; Body: { path: string; content: string } }>(
    "/api/projects/:id/file",
    async (req, reply) => {
      const row = db.prepare("SELECT id FROM projects WHERE id = ?").get(req.params.id);
      if (!row) return reply.code(404).send({ error: "Not found" });

      const dir = projectDir(req.params.id);
      const relPath = req.body?.path;
      const content = req.body?.content;
      if (typeof relPath !== "string" || typeof content !== "string") {
        return reply.code(400).send({ error: "path and content are required" });
      }
      if (relPath.startsWith("/") || relPath.includes("..")) {
        return reply.code(400).send({ error: "Invalid path" });
      }
      const target = path.join(dir, relPath);
      if (!target.startsWith(path.resolve(dir))) return reply.code(400).send({ error: "Invalid path" });

      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content, "utf8");
      db.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").run(req.params.id);

      if (isRunning(req.params.id)) {
        stopApp(req.params.id);
        await startApp(req.params.id, dir);
      }

      return { ok: true };
    }
  );

  app.delete<{ Params: { id: string } }>("/api/projects/:id", async (req) => {
    stopApp(req.params.id);
    db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);
    fs.rmSync(projectDir(req.params.id), { recursive: true, force: true });
    return { ok: true };
  });

  app.post<{ Params: { id: string }; Body: { message: string } }>(
    "/api/projects/:id/chat",
    async (req, reply) => {
      const row = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id) as
        | ProjectRow
        | undefined;
      if (!row) return reply.code(404).send({ error: "Not found" });

      const cfg = currentProviderConfig();
      if (cfg.provider === "none") {
        return reply.code(400).send({ error: "No AI provider configured yet — set one up in Settings." });
      }

      const userMessage = req.body?.message?.trim();
      if (!userMessage) return reply.code(400).send({ error: "Message is required" });

      db.prepare("INSERT INTO chat_messages (project_id, role, content) VALUES (?, 'user', ?)").run(
        req.params.id,
        userMessage
      );

      const history = db
        .prepare("SELECT role, content FROM chat_messages WHERE project_id = ? ORDER BY id ASC")
        .all(req.params.id) as unknown as ChatMessage[];

      try {
        const provider = createProvider(cfg);
        const result = await generateApp(provider, history);
        writeGeneratedFiles(projectDir(req.params.id), result.files);

        db.prepare("INSERT INTO chat_messages (project_id, role, content) VALUES (?, 'assistant', ?)").run(
          req.params.id,
          result.summary
        );
        db.prepare("UPDATE projects SET status = 'built', updated_at = datetime('now') WHERE id = ?").run(
          req.params.id
        );

        if (isRunning(req.params.id)) {
          stopApp(req.params.id);
          await startApp(req.params.id, projectDir(req.params.id));
        }

        return {
          summary: result.summary,
          files: result.files.map((f) => f.path),
        };
      } catch (err: any) {
        return reply.code(500).send({ error: err.message || "Generation failed" });
      }
    }
  );

  app.post<{ Params: { id: string } }>("/api/projects/:id/run", async (req, reply) => {
    const dir = projectDir(req.params.id);
    if (!fs.existsSync(dir)) return reply.code(404).send({ error: "Not found" });
    const port = await startApp(req.params.id, dir);
    db.prepare("UPDATE projects SET status = 'running', port = ? WHERE id = ?").run(port, req.params.id);
    return { port };
  });

  app.post<{ Params: { id: string } }>("/api/projects/:id/stop", async (req) => {
    stopApp(req.params.id);
    db.prepare("UPDATE projects SET status = 'built' WHERE id = ?").run(req.params.id);
    return { ok: true };
  });
}
