import http from "node:http";
import type { FastifyInstance } from "fastify";
import { getRunningPort } from "../runtime/runner.js";

/**
 * Reverse proxy so a running generated app is reachable through this
 * container's single exposed port at /preview/<id>/...
 *
 * Registered as its own encapsulated plugin so the raw-buffer content type
 * parser below only applies here, not to the JSON API routes.
 */
export async function previewRoutes(app: FastifyInstance) {
  app.addContentTypeParser("*", { parseAs: "buffer" }, (_req, body, done) => done(null, body));

  app.all("/preview/:id/*", async (req, reply) => {
    const port = getRunningPort((req.params as any).id);
    if (!port) return reply.code(404).send({ error: "App is not running" });
    const subPath = "/" + ((req.params as any)["*"] || "");

    const headers = { ...req.headers };
    delete headers.host;

    await new Promise<void>((resolve) => {
      const proxyReq = http.request(
        { host: "127.0.0.1", port, path: subPath, method: req.method, headers },
        (proxyRes) => {
          reply.raw.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
          proxyRes.pipe(reply.raw);
          proxyRes.on("end", resolve);
        }
      );
      proxyReq.on("error", () => {
        reply.raw.writeHead(502);
        reply.raw.end("Preview app is not responding");
        resolve();
      });
      const body = req.body as Buffer | undefined;
      if (body && body.length) proxyReq.write(body);
      proxyReq.end();
    });
  });
}
