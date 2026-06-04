import { existsSync, readFileSync } from "node:fs";

function loadLocalEnv() {
  for (const file of [".env.local", ".env.cloudflare.local"]) {
    if (!existsSync(file)) continue;
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*(PEXELS_API_KEY|PEXELS_APIKEY|PEXES_APIKEY)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const key = match[1];
      const value = String(match[2] || "").trim().replace(/^["']|["']$/g, "");
      if (value && !process.env[key]) process.env[key] = value;
    }
  }
}

loadLocalEnv();

const apiKey = process.env.PEXELS_API_KEY || process.env.PEXELS_APIKEY || process.env.PEXES_APIKEY || "";

const queries = [
  "mystical cosmos stars nebula night sky",
  "mystical astrology stars cosmic sky five elements",
  "cosmic stage spotlight stars destiny",
  "mystic tarot cards stars nebula night sky",
];

if (!apiKey) {
  console.error("[smoke-pexels-images] FAIL missing PEXELS_API_KEY");
  process.exit(1);
}

for (const query of queries) {
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "3");
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("size", "large");
  url.searchParams.set("locale", "en-US");

  const response = await fetch(url, { headers: { Authorization: apiKey } });
  if (!response.ok) {
    console.error(`[smoke-pexels-images] FAIL ${query}: HTTP ${response.status}`);
    process.exit(1);
  }

  const data = await response.json().catch(() => null);
  const photo = Array.isArray(data?.photos) ? data.photos.find((item) => item?.src?.landscape || item?.src?.large2x || item?.src?.large) : null;
  if (!photo) {
    console.error(`[smoke-pexels-images] FAIL ${query}: empty photos`);
    process.exit(1);
  }

  const src = photo?.src?.landscape || photo?.src?.large2x || photo?.src?.large;
  const credit = String(photo?.photographer || "").trim();
  if (!/^https:\/\//.test(String(src || "")) || !credit) {
    console.error(`[smoke-pexels-images] FAIL ${query}: invalid photo payload`);
    process.exit(1);
  }

  console.log(`[smoke-pexels-images] OK ${query} -> ${credit}`);
}

console.log("[smoke-pexels-images] PASS");
