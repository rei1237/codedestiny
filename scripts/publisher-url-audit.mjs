import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { inspectPublisherDocument } from "./lib/publisher-document.mjs";
import { hasAdvertisingReview } from "../lib/content/editorial-review.mjs";
import { canLoadAdsense } from "../app/components/adsense-route-policy.js";

const options = Object.fromEntries(process.argv.slice(2).map((arg) => arg.replace(/^--/, "").split(/=(.*)/s).slice(0, 2)));
const origin = new URL(options.origin || "https://code-destiny.com").origin;
const output = resolve(options.output || "docs/adsense/baseline");
const localDir = options.dir ? resolve(options.dir) : null;
const limit = Number(options.limit || 1600);
const observedAt = new Date().toISOString();
const failures = [];
const gsc = options.gsc ? JSON.parse(await readFile(resolve(options.gsc), "utf8")) : null;
async function fetchPage(url) {
  if (localDir) {
    const path = new URL(url).pathname;
    const file = path.endsWith(".xml") || path.endsWith(".txt") ? path.slice(1) : `${path.replace(/^\/+|\/+$/g, "")}/index.html`.replace(/^\//, "");
    try { return { status: 200, url, redirects: [], headers: {}, html: await readFile(resolve(localDir, file), "utf8") }; }
    catch { return { status: 404, url, redirects: [], headers: {}, html: "" }; }
  }
  const redirects = [];
  let current = url;
  for (let hop = 0; hop < 8; hop++) {
    const response = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(20000) });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      const target = new URL(location, current).href;
      redirects.push({ url: current, status: response.status, target });
      if (new URL(target).origin !== origin) return { status: response.status, url: current, redirects, headers: {}, html: "" };
      current = target; continue;
    }
    return { status: response.status, url: current, redirects, headers: Object.fromEntries(response.headers), html: await response.text() };
  }
  throw new Error("redirect limit");
}
const sitemap = await fetchPage(`${origin}/sitemap.xml`);
const sitemapUrls = [...sitemap.html.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1].replace("https://code-destiny.com", origin));
if (sitemap.status !== 200 || sitemapUrls.length === 0) throw new Error("A nonempty HTTP 200 sitemap is required");
const inSitemap = new Set(sitemapUrls);
const extras = ["/privacy/", "/terms/", "/contact-us/", "/login/", "/signup/", "/insights/?q=saju", "/insights/?page=2", "/insights/not-a-real-insight-approval-audit/", "/insights/daewoon-vs-sewoon/", "/insights/sukuyo-compatibility-rhythm-guide", "/ads.txt", "/robots.txt"];
const queue = [...new Set([...sitemapUrls, ...extras.map((path) => origin + path)])];
const seen = new Set(queue);
const results = [];
let cursor = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < queue.length && cursor < limit) {
    const url = queue[cursor++];
    try {
      const response = await fetchPage(url);
      if (url.endsWith(".txt")) { results.push({ url, status: response.status, resource: response.html.trim(), observedAt }); continue; }
      const document = inspectPublisherDocument(response.html, response.url);
      const robots = [document.robots, response.headers["x-robots-tag"] || ""].join(", ");
      const noindex = /noindex/i.test(robots);
      const risk = [];
      if (response.status >= 500) risk.push("server-error");
      if (response.status === 200 && !noindex && !document.bodyText) risk.push("empty-indexable-body");
      if (response.status === 200 && !document.title) risk.push("missing-title");
      if (inSitemap.has(url) && (response.status !== 200 || noindex || response.redirects.length)) risk.push("sitemap-conflict");
      if (document.articlePresent && document.reviewStatus !== "verified") risk.push("editorial-review-required");
      if (/목차를 생성할 h2\/h3가 없습니다/.test(document.bodyText)) risk.push("empty-template");
      if (/유상 코인|코인 차감|잔여 코인/.test(document.bodyText)) risk.push("legacy-policy-copy");
      const classification = response.redirects.length || response.status === 404 || response.status === 410 ? "D" : noindex ? "C" : "B";
      // B is a review queue, not an instruction to deindex; only human assessment can promote A.
      const { bodyText, ...fields } = document;
      const gscPage = gsc?.pages?.find((page) => page.path === new URL(url).pathname);
      results.push({ url, observedAt, initialStatus: response.redirects[0]?.status || response.status, status: response.status, finalUrl: response.url,
        redirects: response.redirects, ...fields, robots, indexable: response.status === 200 && !noindex,
        inSitemap: inSitemap.has(url), classification, classificationConfirmed: classification !== "B", risk,
        adsEligibleByRoute: canLoadAdsense(new URL(url).pathname), adsApproved: hasAdvertisingReview(url),
        gscClicks: gscPage?.clicks ?? null, gscImpressions: gscPage?.impressions ?? null,
        gscPeriod: gscPage ? gsc.period : null, backlinks: gscPage?.backlinks ?? null,
        action: gscPage?.clicks > 0 ? "protect observed traffic; improve before any indexing change" : classification === "B" ? "retain pending evidence review; no automatic deletion" : "verify existing disposition",
        bodySample: bodyText.slice(0, 500),
      });
      // One bounded discovery pass; never crawl APIs, private parameters, or external origins.
      if (inSitemap.has(url)) for (const href of document.internalLinks) {
        const link = new URL(href); link.hash = "";
        if (link.search || /^\/(?:api|admin|auth)\//.test(link.pathname) || /\.[a-z0-9]+$/i.test(link.pathname)) continue;
        if (!seen.has(link.href)) { seen.add(link.href); queue.push(link.href); }
      }
      if (results.length % 100 === 0) console.log(`[publisher-audit] ${results.length} inspected`);
    } catch (error) { failures.push({ url, error: String(error) }); }
  }
}));
results.sort((a, b) => a.url.localeCompare(b.url));
await mkdir(output, { recursive: true });
const audit = { observedAt, origin, mode: localDir ? "build-html" : "production-http", discovered: seen.size, inspected: results.length, truncated: cursor < queue.length, failures, results: [] };
await writeFile(resolve(output, "urls.json"), JSON.stringify(audit, null, 2).replace('"results": []', `"results": [\n${results.map((row) => "    " + JSON.stringify(row)).join(",\n")}\n  ]`) + "\n");
const keys = ["url", "initialStatus", "status", "indexable", "canonical", "title", "headings", "bodyChars", "noJsBodyChars", "streamingRequiresJs", "articlePresent", "author", "datePublished", "dateModified", "locale", "inSitemap", "classification", "classificationConfirmed", "risk", "action", "gscClicks", "gscImpressions", "gscPeriod", "backlinks"];
const csv = (value) => '"' + String(value == null ? "미확인" : typeof value === "object" ? JSON.stringify(value) : value).replace(/"/g, '""') + '"';
await writeFile(resolve(output, "urls.csv"), '\uFEFF' + keys.join(",") + "\n" + results.map((row) => keys.map((key) => csv(row[key])).join(",")).join("\n"));
await writeFile(resolve(output, "summary.md"), `# Public URL audit\n\n- Observed: ${observedAt}\n- Mode: ${localDir ? "build HTML" : "production HTTP"}; browser rendering and Googlebot are not inferred.\n- Sitemap: ${sitemapUrls.length}; inspected: ${results.length}; discovered: ${seen.size}; failed: ${failures.length}.\n- B classifications are pending manual assessment, not confirmed low quality.\n- Body length is diagnostic only. Missing Search Console/backlink data is unknown.\n- ${results.filter((row) => row.risk?.length).length} URLs need review; see urls.csv and urls.json.\n`);
console.log(`[publisher-audit] ${output}: ${results.length} URLs, ${failures.length} failures`);
if (failures.length) process.exitCode = 1;
