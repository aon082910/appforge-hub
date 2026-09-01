import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";
import getPort, { portNumbers } from "get-port";

const RUNTIME_TEMPLATE_DIR = process.env.APPFORGE_RUNTIME_TEMPLATE || path.resolve("./runtime-template");

interface RunningApp {
  proc: ChildProcess;
  port: number;
}

const running = new Map<string, RunningApp>();

export function isRunning(projectId: string): boolean {
  return running.has(projectId);
}

export function getRunningPort(projectId: string): number | undefined {
  return running.get(projectId)?.port;
}

export async function startApp(projectId: string, projectDir: string): Promise<number> {
  const existing = running.get(projectId);
  if (existing) return existing.port;

  const port = await getPort({ port: portNumbers(4100, 4999) });
  const nodeModulesPath = path.join(RUNTIME_TEMPLATE_DIR, "node_modules");

  const proc = spawn(process.execPath, ["server.js"], {
    cwd: projectDir,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_PATH: nodeModulesPath,
      DB_PATH: path.join(projectDir, "data.sqlite"),
      APP_JWT_SECRET: `project-${projectId}`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  proc.stdout?.on("data", (d) => console.log(`[app:${projectId}]`, d.toString().trim()));
  proc.stderr?.on("data", (d) => console.error(`[app:${projectId}]`, d.toString().trim()));
  proc.on("exit", () => running.delete(projectId));

  running.set(projectId, { proc, port });
  return port;
}

export function stopApp(projectId: string) {
  const app = running.get(projectId);
  if (!app) return;
  app.proc.kill();
  running.delete(projectId);
}

export function stopAll() {
  for (const id of running.keys()) stopApp(id);
}
