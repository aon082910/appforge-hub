import path from "node:path";

export const DATA_DIR = process.env.APPFORGE_DATA_DIR || path.resolve("./data");
export const PROJECTS_DIR = path.join(DATA_DIR, "projects");

export function projectDir(id: string): string {
  return path.join(PROJECTS_DIR, id);
}
