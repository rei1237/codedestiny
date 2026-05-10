/* eslint-disable no-console */
const BASE = (process.env.SITE_URL || "https://code-destiny.com").replace(/\/$/, "");

const targets = [
  // Root must redirect to /static/ (single canonical URL).
  { path: "/", allowRedirect: true },
  // Canonical entry should resolve directly.
  { path: "/static/", allowRedirect: false },
  // Legacy static index should normalize to /static/.
  { path: "/static/index.html", allowRedirect: true },
  { path: "/sitemap.xml", allowRedirect: false },
  { path: "/robots.txt", allowRedirect: false },
  { path: "/today", allowRedirect: true },
  { path: "/ziwei", allowRedirect: true },
  { path: "/sukuyo", allowRedirect: true },
  { path: "/en", allowRedirect: true },
  { path: "/ja", allowRedirect: true },
  { path: "/zh", allowRedirect: true },
  { path: "/en/today", allowRedirect: true },
  { path: "/ja/today", allowRedirect: true },
  { path: "/zh/today", allowRedirect: true },
  { path: "/en/ziwei", allowRedirect: true },
  { path: "/ja/ziwei", allowRedirect: true },
  { path: "/zh/ziwei", allowRedirect: true },
  { path: "/en/sukuyo", allowRedirect: true },
  { path: "/ja/sukuyo", allowRedirect: true },
  { path: "/zh/sukuyo", allowRedirect: true },
  { path: "/insights/ziwei-basics", allowRedirect: true },
  { path: "/en/insights/ziwei-basics-en", allowRedirect: true },
  { path: "/ja/insights/ziwei-basics-jp", allowRedirect: true },
  { path: "/zh/insights/ziwei-basics-zh", allowRedirect: true },
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
