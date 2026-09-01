import path from "node:path";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import staticPlugin from "@fastify/static";
import Fastify from "fastify";
import { authRoutes, getSessionUser } from "./routes/auth.js";
import { projectRoutes } from "./routes/projects.js";
import { settingsRoutes } from "./routes/settings.js";
import { stopAll } from "./runtime/runner.js";

const PORT = Number(process.env.PORT || 8000);
const PUBLIC_PATHS = new Set([
  "/api/auth/status",
  "/api/auth/setup",
  "/api/auth/login",
]);

const app = Fastify({ logger: true });

await app.register(cors, { origin: true, credentials: true });
await app.register(cookie);

app.addHook("onRequest", async (req, reply) => {
  if (!req.url.startsWith("/api/") || PUBLIC_PATHS.has(req.url.split("?")[0])) return;
  if (!getSessionUser(req)) {
    reply.code(401).send({ error: "Not authenticated" });
  }
});

await app.register(authRoutes);
await app.register(settingsRoutes);
await app.register(projectRoutes);

const webDist = path.resolve(process.env.APPFORGE_WEB_DIST || "../web/dist");
await app.register(staticPlugin, { root: webDist, wildcard: false });
app.setNotFoundHandler((req, reply) => {
  if (req.url.startsWith("/api/") || req.url.startsWith("/preview/")) {
    reply.code(404).send({ error: "Not found" });
    return;
  }
  reply.type("text/html").sendFile("index.html");
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    stopAll();
    process.exit(0);
  });
}

app.listen({ port: PORT, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
