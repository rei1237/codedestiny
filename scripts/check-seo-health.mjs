/* eslint-disable no-console */
const BASE = (process.env.SITE_URL || "https://code-destiny.com").replace(/\/$/, "");

const targets = [
  // Public canonical URLs must resolve directly. Keep this list aligned with the sitemap and entity registry.
  { path: "/", allowRedirect: false },
  { path: "/sitemap.xml", allowRedirect: false },
  { path: "/robots.txt", allowRedirect: false },
  { path: "/fusion-fortune/", allowRedirect: false },
  { path: "/kkul-kkul-unse/", allowRedirect: false },
  { path: "/saju/", allowRedirect: false },
  { path: "/manse/", allowRedirect: false },
  { path: "/ziwei/", allowRedirect: false },
  { path: "/sukuyo/", allowRedirect: false },
  { path: "/vedic/", allowRedirect: false },
  { path: "/astrology/", allowRedirect: false },
  { path: "/tarot/", allowRedirect: false },
  { path: "/compatibility/", allowRedirect: false },
  { path: "/today/", allowRedirect: false },
  { path: "/dream/", allowRedirect: false },
  { path: "/insights/", allowRedirect: false },
  { path: "/high-value/", allowRedirect: false },
  { path: "/high-value/how-fusion-fortune-works/", allowRedirect: false },
  { path: "/high-value/saju-and-ziwei-reading/", allowRedirect: false },
  { path: "/high-value/saju-and-sukuyo-compatibility/", allowRedirect: false },
  { path: "/high-value/vedic-and-western-astrology/", allowRedirect: false },
  { path: "/high-value/how-to-read-manse/", allowRedirect: false },
  { path: "/high-value/ai-fortune-reading-guide/", allowRedirect: false },
];

async function check(url) {
  try {
    const res = await fetch(url, { redirect: "manual" });
    const location = res.headers.get("location");
    return { ok: res.status >= 200 && res.status < 400, status: res.status, location: location || "" };
  } catch (error) {
    return { ok: false, status: 0, location: String(error?.message || error) };
  }
}

async function main() {
  let hasFailure = false;
  console.log(`\n[seo-health] base: ${BASE}\n`);

  for (const target of targets) {
    const url = `${BASE}${target.path}`;
    const result = await check(url);
    const strictOk = target.allowRedirect ? result.status >= 200 && result.status < 400 : result.status === 200;
    const state = strictOk ? "OK " : "BAD";
    console.log(`${state} ${result.status.toString().padStart(3, " ")}  ${url}${result.location ? ` -> ${result.location}` : ""}`);
    if (!strictOk) hasFailure = true;
  }

  if (hasFailure) {
    console.log("\n[seo-health] FAILED: fix BAD endpoints before submitting sitemap.\n");
    process.exit(1);
  }

  console.log("\n[seo-health] PASS: all critical SEO endpoints look good.\n");
}

main();
