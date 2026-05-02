const args = process.argv.slice(2);

function getArg(name, fallback = "") {
  const idx = args.findIndex((arg) => arg === name || arg.startsWith(`${name}=`));
  if (idx === -1) return fallback;
  const direct = args[idx];
  if (direct.includes("=")) return direct.split("=").slice(1).join("=");
  const next = args[idx + 1];
  return typeof next === "string" ? next : fallback;
}

function normalizeBase(raw) {
  const value = String(raw || "").trim();
  if (!value) throw new Error("Missing --base argument");
  const url = new URL(value);
  return url.origin;
}

const base = normalizeBase(getArg("--base", "https://code-destiny.com"));
const providers = ["google", "naver", "kakao"];

let hasFailure = false;

for (const provider of providers) {
  const url = `${base}/auth/${provider}/callback?code=dummy-code&state=dummy-state`;
  try {
    const res = await fetch(url, { redirect: "follow" });
    const body = await res.text();
    const expected = `/api/auth/oauth/${provider}/callback`;
    const containsExpected = body.includes(expected);
    const ok = res.ok && containsExpected;

    console.log(
      `${provider.toUpperCase()} status=${res.status} containsExpected=${containsExpected} request=${url} final=${res.url}`
    );

    if (!ok) {
      hasFailure = true;
      console.error(
        `${provider.toUpperCase()} FAILED expected status 2xx and body include ${expected}`
      );
    }
  } catch (error) {
    hasFailure = true;
    console.error(`${provider.toUpperCase()} ERROR ${error?.message || String(error)}`);
  }
}

if (hasFailure) {
  process.exitCode = 2;
} else {
  console.log(`SMOKE_OK base=${base}`);
}
