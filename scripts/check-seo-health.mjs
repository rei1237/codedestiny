/* eslint-disable no-console */
const BASE = (process.env.SITE_URL || "https://code-destiny.com").replace(/\/$/, "");

const targets = [
  // "/" and locale roots → 200 (rewrite serves legacy HTML; URL unchanged).
  { path: "/", allowRedirect: false },
  // Direct /static/index.html → 308 to / (canonical).
  { path: "/static/index.html", allowRedirect: true },
  { path: "/sitemap.xml", allowRedirect: false },
  { path: "/robots.txt", allowRedirect: false },
  { path: "/faq", allowRedirect: false },
  { path: "/en-us", allowRedirect: false },
  { path: "/ja-jp", allowRedirect: false },
  { path: "/zh-cn", allowRedirect: false },
  { path: "/hi-in", allowRedirect: false },
  { path: "/es-es", allowRedirect: false },
  { path: "/fr-fr", allowRedirect: false },
  { path: "/de-de", allowRedirect: false },
  { path: "/nl-nl", allowRedirect: false },
  { path: "/ms-my", allowRedirect: false },
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
