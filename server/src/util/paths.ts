import path from "node:path";

export const DATA_DIR = process.env.APPFORGE_DATA_DIR || path.resolve("./data");
export const PROJECTS_DIR = path.join(DATA_DIR, "projects");
