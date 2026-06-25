import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const children = new Set();
let shuttingDown = false;

function start(name, args) {
  const isWindows = process.platform === "win32";
  const child = spawn(isWindows ? `${npmCommand} ${args.join(" ")}` : npmCommand, isWindows ? [] : args, {
    stdio: "inherit",
    shell: isWindows,
    env: process.env,
  });

  children.add(child);

  child.on("exit", (code, signal) => {
    children.delete(child);
    if (shuttingDown) return;
    shuttingDown = true;
    for (const other of children) {
      other.kill(process.platform === "win32" ? undefined : "SIGTERM");
    }
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });

  child.on("error", (error) => {
    console.error(`[dev] ${name} failed: ${error.message}`);
    process.exitCode = 1;
  });

  return child;
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    child.kill(process.platform === "win32" ? undefined : "SIGTERM");
  }
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(130);
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit(143);
});

start("next", ["run", "dev:next"]);
start("local-auth-api", ["run", "dev:local-auth-api"]);
