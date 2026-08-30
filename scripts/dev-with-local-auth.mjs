import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const children = new Set();
let shuttingDown = false;
const portoneAliasGroups = [
  ["PORTONE_API_SECRET", "PORTONE_API_Secret", "PORTONE_API_SECRET_KEY", "PORTONE_V2_API_SECRET", "PORTONE_API_SECRET_V2", "PORTONE_SECRET"],
  ["PORTONE_CHANNEL_KEY", "PORTONE_channel", "PORTONE_CHANNEL", "PORTONE_CHANNELKEY", "PORTONE_V2_CHANNEL_KEY"],
  // 🔴 접두사 없는 KAKAOPAY_CHANNEL_KEY 는 .env.local 관용 표기라 여기서만 승격한다.
  // 스테이징 제외 판정이 /^PORTONE_/ 로 이뤄지므로 워커 시크릿 동기화 목록에는 넣지 않는다.
  ["PORTONE_KAKAOPAY_CHANNEL_KEY", "PORTONE_KAKAOPAY_CHANNEL", "PORTONE_CHANNEL_KEY_KAKAOPAY", "KAKAOPAY_CHANNEL_KEY"],
  ["PORTONE_STORE_ID", "PORTONE_Store", "PORTONE_STORE", "PORTONE_STOREID", "PORTONE_V2_STORE_ID"],
  ["PORTONE_WEBHOOK_SECRET", "PORTONE_webhook", "PORTONE_WEBHOOK", "PORTONE_WEBHOOK_SECRET_KEY", "PORTONE_WEBHOOK_TOKEN", "PORTONE_webhook_Secret", "PORTONE_V2_WEBHOOK_SECRET"],
  ["PORTONE_WEBHOOK_URL", "PORTONE_webhook_URL", "PORTONE_webhookurl", "PORTONE_WEBHOOKURL"],
  ["MID", "INICISMID", "INIstoreId", "INI_STORE_ID", "INICIS_MID", "INICIS_STORE_ID"],
  ["INIsignkey", "INISIGNKEY", "INI_SIGNKEY", "INICIS_SIGNKEY", "INICIS_WEB_SIGNKEY"],
  ["INIAPIKEY", "INI_API_KEY", "INICIS_API_KEY"],
  ["INIAPI_IV", "INI_API_IV", "INICIS_API_IV"],
];

function loadEnvFile(path, override = true) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*[=:]\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1];
    if (!override && process.env[key] !== undefined && process.env[key] !== "") continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value.replace(/\\n/g, "\n");
  }
}

function promoteAliasGroup(keys) {
  const primary = keys[0];
  if (process.env[primary]) return;
  for (const key of keys.slice(1)) {
    const value = String(process.env[key] || "").trim();
    if (!value) continue;
    process.env[primary] = value;
    return;
  }
}

loadEnvFile(".env", true);
loadEnvFile(".env.cloudflare.local", true);
loadEnvFile(".dev.vars", true);
loadEnvFile(".env.local", true);
for (const group of portoneAliasGroups) promoteAliasGroup(group);

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
