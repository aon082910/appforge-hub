import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";

const EXCLUDED = new Set(["node_modules"]);

function addDir(zip: archiver.Archiver, dir: string, base: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED.has(entry.name) || entry.name.startsWith("data.sqlite")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      addDir(zip, full, base);
    } else {
      zip.file(full, { name: path.relative(base, full).replace(/\\/g, "/") });
    }
  }
}

/** Returns a readable zip stream of a project's source files (no node_modules, no sqlite db). */
export function zipProject(projectDir: string): archiver.Archiver {
  const zip = archiver("zip", { zlib: { level: 9 } });
  addDir(zip, projectDir, projectDir);
  void zip.finalize();
  return zip;
}
