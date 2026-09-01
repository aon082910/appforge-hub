import fs from "node:fs";
import path from "node:path";

const RUNTIME_TEMPLATE_DIR = process.env.APPFORGE_RUNTIME_TEMPLATE || path.resolve("./runtime-template");

/** Copies the starter server.js/public/lib (never node_modules) into a fresh project dir. */
export function scaffoldProject(projectDir: string) {
  fs.mkdirSync(projectDir, { recursive: true });
  copyDirExcluding(RUNTIME_TEMPLATE_DIR, projectDir, new Set(["node_modules", "package-lock.json"]));
}

function copyDirExcluding(src: string, dest: string, excluded: Set<string>) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirExcluding(srcPath, destPath, excluded);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
