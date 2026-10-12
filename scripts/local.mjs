import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { mkdirSync } from "node:fs";
const root = fileURLToPath(new URL("..", import.meta.url));
process.chdir(root);
const action = process.argv[2] || "start";
if (!["build", "start"].includes(action))
  throw new Error("Nur build oder start erlaubt.");
const data = path.resolve(
  process.env.LOCAL_DATA_DIR ||
    path.join(process.env.LOCALAPPDATA || root, "Motivationsboost", "data"),
);
mkdirSync(data, { recursive: true });
const env = {
  ...process.env,
  APP_MODE: "local",
  LOCAL_DATA_DIR: data,
  NEXT_DIST_DIR: ".next-local",
  NEXT_TELEMETRY_DISABLED: "1",
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || "qwen2.5:7b",
};
if (action === "start")
  env.NODE_OPTIONS = `${process.env.NODE_OPTIONS || ""} --require ${JSON.stringify(path.join(root, "scripts/local-egress.cjs"))}`;
const args = [
  path.join(root, "node_modules/next/dist/bin/next"),
  action,
  ...(action === "start"
    ? ["--hostname", "127.0.0.1", "--port", process.env.LOCAL_PORT || "3210"]
    : []),
];
const result = spawnSync(process.execPath, args, {
  env,
  stdio: "inherit",
  windowsHide: true,
});
process.exit(result.status ?? 1);
