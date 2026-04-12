import { existsSync, statSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = process.cwd();
const lines = [];

function du(dir) {
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const fp = join(dir, f.name);
    if (f.isDirectory()) total += du(fp);
    else total += statSync(fp).size;
  }
  return total;
}

function sz(path) {
  if (!existsSync(path)) return "NOT FOUND";
  return (statSync(path).size / 1024 / 1024).toFixed(2) + " MiB";
}

lines.push("=== HANDLER SIZE ===");
const handler = resolve(root, ".open-next/server-functions/default/handler.mjs");
lines.push("handler.mjs: " + sz(handler));

lines.push("\n=== .next/server TOP FILES ===");
const serverDir = resolve(root, ".next/server");
if (existsSync(serverDir)) {
  const files = [];
  function walk(d) {
    for (const f of readdirSync(d, { withFileTypes: true })) {
      const fp = join(d, f.name);
      if (f.isDirectory()) walk(fp);
      else files.push({ path: fp.replace(root, ""), size: statSync(fp).size });
    }
  }
  walk(serverDir);
  files.sort((a, b) => b.size - a.size);
  for (const f of files.slice(0, 30)) {
    lines.push((f.size / 1024).toFixed(0).padStart(7) + " KB  " + f.path);
  }
  const total = files.reduce((s, f) => s + f.size, 0);
  lines.push("TOTAL: " + (total / 1024 / 1024).toFixed(2) + " MiB  (files: " + files.length + ")");
}

const out = lines.join("\n") + "\n";
process.stdout.write(out);
