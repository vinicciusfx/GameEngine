// Bun watches direct imports. Restart the server on Bend dependency and
// project shader changes, then reload the page to see the updated scene.

import { Glob, spawn, type Subprocess } from "bun";
import { existsSync, readdirSync, statSync, watch } from "node:fs";
import { writeShaderCatalog } from "./shaders/catalog.js";

const PORT = "3100";

// Reference characters' pages (refs/*/index.html), served beside the
// engine's page when they exist. refs/ is gitignored and never built.
const REFERENCE_PAGES = existsSync("refs")
  ? readdirSync("refs").map((d) => `refs/${d}/index.html`).filter((p) => existsSync(p))
  : [];

let server: Subprocess | null = null;

function start() {
  writeShaderCatalog();
  server = spawn(["bun", `--port=${PORT}`, "index.html", ...REFERENCE_PAGES], { stdout: "inherit", stderr: "inherit" });
}

let timer: Timer | undefined;
let revision = 0;
function restart(file: string) {
  const pending = ++revision;
  clearTimeout(timer);
  timer = setTimeout(async () => {
    console.log(`\n${file} changed: restarting (reload the page)`);
    server?.kill();
    await server?.exited;
    if (pending === revision) start();
  }, 150);
}

if (process.env.WSL_DISTRO_NAME && /^\/mnt\/[a-z](?:\/|$)/i.test(process.cwd())) {
  // Edits made by Windows programs on a mounted drive bypass Linux file events.
  const sources = [
    "*.bend", "main.js", "index.html", "engine/**/*.{bend,js}",
    "editor/**/*.{bend,js,css}", "projects/**/*.bend", "projects/*/shaders/**/*",
    ...(existsSync("refs") ? ["refs/**/*.{bend,js,html,css}"] : []),
  ].map((pattern) => new Glob(pattern));
  function snapshot() {
    const files = new Map<string, string>();
    const paths = sources.flatMap((glob) => [...glob.scanSync({ dot: true })]);
    for (const file of paths) {
      if (file.split("/").includes("node_modules")) continue;
      const stat = statSync(file, { throwIfNoEntry: false });
      if (stat) files.set(file, `${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`);
    }
    return files;
  }
  let previous = snapshot();
  setInterval(() => {
    const next = snapshot();
    const paths = new Set([...previous.keys(), ...next.keys()]);
    const changed = [...paths].find((file) => previous.get(file) !== next.get(file));
    previous = next;
    if (changed) restart(changed);
  }, 1000);
} else {
  for (const dir of [".", "engine", "projects", "editor", ...(existsSync("refs") ? ["refs"] : [])]) {
    watch(dir, { recursive: dir !== "." }, (_, file) => {
      if (!file) return;
      const path = file.replaceAll("\\", "/");
      if ((dir === "projects" && /^[^/]+\/shaders(?:\/|$)/.test(path))
        || (path.endsWith(".bend") && !path.includes("node_modules"))) restart(file);
    });
  }
}

process.on("SIGINT", () => { server?.kill(); process.exit(0); });
start();
