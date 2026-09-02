import path from "node:path";

// Always resolve to an absolute path -- downstream path-traversal checks
// compare against path.resolve(dir), which silently never matches if DATA_DIR
// (and everything built from it) is left relative.
export const DATA_DIR = path.resolve(process.env.APPFORGE_DATA_DIR || "./data");
export const PROJECTS_DIR = path.join(DATA_DIR, "projects");

export function projectDir(id: string): string {
  return path.join(PROJECTS_DIR, id);
}

/** True if `target` resolves to a path inside `dir` (not just prefix-matching, e.g. /data/abc vs /data/abcxyz). */
export function isInside(dir: string, target: string): boolean {
  const resolvedDir = path.resolve(dir);
  const resolvedTarget = path.resolve(target);
  return resolvedTarget === resolvedDir || resolvedTarget.startsWith(resolvedDir + path.sep);
}
