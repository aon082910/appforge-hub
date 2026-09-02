import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";
import getPort, { portNumbers } from "get-port";

const RUNTIME_TEMPLATE_DIR = process.env.APPFORGE_RUNTIME_TEMPLATE || path.resolve("./runtime-template");
const CRASH_DETECT_WINDOW_MS = 900;
const LOG_LINE_LIMIT = 300;

interface RunningApp {
  proc: ChildProcess;
  port: number;
}

interface RunResult {
  port: number;
  crashed: boolean;
  /** Tail of stderr, only set when crashed is true */
  error?: string;
}

const running = new Map<string, RunningApp>();
const logs = new Map<string, string[]>();

function appendLog(projectId: string, line: string) {
  const buf = logs.get(projectId) || [];
  buf.push(line);
  if (buf.length > LOG_LINE_LIMIT) buf.splice(0, buf.length - LOG_LINE_LIMIT);
  logs.set(projectId, buf);
}

export function isRunning(projectId: string): boolean {
  return running.has(projectId);
}

export function getRunningPort(projectId: string): number | undefined {
  return running.get(projectId)?.port;
}

export function getLogs(projectId: string): string {
  return (logs.get(projectId) || []).join("\n");
}

export async function startApp(projectId: string, projectDir: string): Promise<RunResult> {
  const existing = running.get(projectId);
  if (existing) return { port: existing.port, crashed: false };

  const port = await getPort({ port: portNumbers(4100, 4999) });
  const nodeModulesPath = path.join(RUNTIME_TEMPLATE_DIR, "node_modules");
  logs.set(projectId, []);

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

  proc.stdout?.on("data", (d) => appendLog(projectId, d.toString()));
  proc.stderr?.on("data", (d) => appendLog(projectId, d.toString()));
  proc.on("exit", () => running.delete(projectId));

  running.set(projectId, { proc, port });

  // Give the process a short window to crash on boot (missing module,
  // syntax error, thrown exception before listen()) so callers can react
  // instead of reporting a fake success.
  const crashed = await new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), CRASH_DETECT_WINDOW_MS);
    proc.once("exit", () => {
      clearTimeout(timer);
      resolve(true);
    });
  });

  if (crashed) {
    return { port, crashed: true, error: getLogs(projectId).slice(-4000) };
  }
  return { port, crashed: false };
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
