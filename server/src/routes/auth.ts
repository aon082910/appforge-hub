import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import { db } from "../db/index.js";

const SECRET = process.env.APPFORGE_SECRET || "change-me-in-production";
const COOKIE_NAME = "appforge_session";

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
}

export function hasAnyUser(): boolean {
  const row = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
  return row.c > 0;
}

export async function authRoutes(app: FastifyInstance) {
  app.get("/api/auth/status", async () => {
    return { setupRequired: !hasAnyUser() };
  });

  app.post<{ Body: { username: string; password: string } }>("/api/auth/setup", async (req, reply) => {
    if (hasAnyUser()) return reply.code(400).send({ error: "Already set up" });
    const { username, password } = req.body || ({} as any);
    if (!username || !password || password.length < 8) {
      return reply.code(400).send({ error: "Username and an 8+ character password are required" });
    }
    const hash = bcrypt.hashSync(password, 10);
    db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(username, hash);
    setSessionCookie(reply, username);
    return { ok: true };
  });

  app.post<{ Body: { username: string; password: string } }>("/api/auth/login", async (req, reply) => {
    const { username, password } = req.body || ({} as any);
    const row = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as UserRow | undefined;
    if (!row || !bcrypt.compareSync(password || "", row.password_hash)) {
      return reply.code(401).send({ error: "Invalid username or password" });
    }
    setSessionCookie(reply, row.username);
    return { ok: true };
  });

  app.post("/api/auth/logout", async (_req, reply) => {
    reply.clearCookie(COOKIE_NAME, { path: "/" });
    return { ok: true };
  });

  app.get("/api/auth/me", async (req, reply) => {
    const user = getSessionUser(req);
    if (!user) return reply.code(401).send({ error: "Not authenticated" });
    return { username: user };
  });
}

function setSessionCookie(reply: any, username: string) {
  const token = jwt.sign({ sub: username }, SECRET, { expiresIn: "30d" });
  reply.setCookie(COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function getSessionUser(req: any): string | null {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, SECRET) as { sub: string };
    return payload.sub;
  } catch {
    return null;
  }
}

export function requireSession(req: any, reply: any, done: (err?: Error) => void) {
  if (!getSessionUser(req)) {
    reply.code(401).send({ error: "Not authenticated" });
    return;
  }
  done();
}
