#!/usr/bin/env node

/**
 * Simple AdSense readiness crawler.
 * Checks:
 * 1) 404 broken links
 * 2) Thin pages (<300 chars of visible text)
 * 3) Placeholder words: "준비 중", "Coming Soon", "test"
 * 4) robots.txt allow status for Mediapartners-Google
 */

const startUrl = process.argv[2] || "https://code-destiny.com";
const maxPages = Number(process.argv[3] || 250);

const PLACEHOLDER_RE = /준비\s*중|coming\s*soon|\btest\b/i;
const USER_AGENT = "CodeDestiny-AdSense-Audit/1.0 (+https://code-destiny.com)";

function normalizeUrl(input, base) {
  try {
    const url = new URL(input, base);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function sameOrigin(url, origin) {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

function extractLinks(html, baseUrl) {
  const links = [];
  const re = /<a\s[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const raw = m[1]?.trim();
    if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:")) continue;
    const normalized = normalizeUrl(raw, baseUrl);
    if (normalized) links.push(normalized);
  }
  return links;
}

function htmlToText(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function textLengthNoSpace(text) {
  return text.replace(/\s/g, "").length;
}

function parseMediapartnersAllow(robotsText) {
  const lines = robotsText.split(/\r?\n/).map((line) => line.trim());
  let inTargetBlock = false;
  let hasAllowAll = false;
  let hasDisallowAll = false;

  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;

    const uaMatch = line.match(/^User-agent:\s*(.+)$/i);
    if (uaMatch) {
      const ua = uaMatch[1].trim().toLowerCase();
      inTargetBlock = ua === "mediapartners-google";
      continue;
    }

    if (!inTargetBlock) continue;

    const allowMatch = line.match(/^Allow:\s*(.*)$/i);
    if (allowMatch && allowMatch[1].trim() === "/") {
      hasAllowAll = true;
    }

    const disallowMatch = line.match(/^Disallow:\s*(.*)$/i);
    if (disallowMatch && disallowMatch[1].trim() === "/") {
      hasDisallowAll = true;
    }
  }

  if (hasDisallowAll) return false;
  if (hasAllowAll) return true;
  return null;
}

async function fetchText(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
    },
  });
  const body = await res.text();
  return { res, body };
}

async function crawl() {
  const origin = new URL(startUrl).origin;
  const queue = [startUrl];
  const visited = new Set();

  const broken404 = [];
  const thinPages = [];
  const placeholderPages = [];
  const pageStatuses = [];

  while (queue.length > 0 && visited.size < maxPages) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    let res;
    let html;

    try {
      const out = await fetchText(current);
      res = out.res;
      html = out.body;
    } catch (error) {
      pageStatuses.push({ url: current, status: "FETCH_ERROR", message: String(error) });
      continue;
    }

    const status = res.status;
    const contentType = res.headers.get("content-type") || "";
    pageStatuses.push({ url: current, status });

    if (status === 404) {
      broken404.push(current);
      continue;
    }

    if (!contentType.includes("text/html")) {
      continue;
    }

    const visibleText = htmlToText(html);
    const textLen = textLengthNoSpace(visibleText);

    if (textLen < 300) {
      thinPages.push({ url: current, textLengthNoSpace: textLen });
    }

    if (PLACEHOLDER_RE.test(visibleText)) {
      placeholderPages.push({ url: current, matched: "준비 중 | Coming Soon | test" });
    }

    const links = extractLinks(html, current);
    for (const link of links) {
      if (!sameOrigin(link, origin)) continue;
      if (!visited.has(link)) queue.push(link);
    }
  }

  let robots = { url: `${origin}/robots.txt`, fetched: false, allowsMediapartnersGoogle: null };

  try {
    const { res, body } = await fetchText(`${origin}/robots.txt`);
    robots = {
      ...robots,
      fetched: true,
      status: res.status,
      allowsMediapartnersGoogle: parseMediapartnersAllow(body),
      note:
        parseMediapartnersAllow(body) === true
          ? "Mediapartners-Google 허용 확인"
          : parseMediapartnersAllow(body) === false
            ? "Mediapartners-Google 차단 가능성 있음"
            : "명시 규칙 없음(기본 규칙 해석 필요)",
    };
  } catch (error) {
    robots = {
      ...robots,
      error: String(error),
    };
  }

  return {
    startUrl,
    crawledCount: visited.size,
    maxPages,
    broken404,
    thinPages,
    placeholderPages,
    robots,
    pageStatuses,
  };
}

async function main() {
  const result = await crawl();

  const reportPath = new URL("../_tmp_adsense_audit_report.json", import.meta.url);
  await import("node:fs/promises").then((fs) =>
    fs.writeFile(reportPath, JSON.stringify(result, null, 2), "utf8"),
  );

  console.log("=== AdSense Crawl Audit ===");
  console.log(`Start URL: ${result.startUrl}`);
  console.log(`Crawled pages: ${result.crawledCount}`);
  console.log(`404 pages: ${result.broken404.length}`);
  console.log(`Thin pages (<300 chars): ${result.thinPages.length}`);
  console.log(`Placeholder pages: ${result.placeholderPages.length}`);
  console.log(
    `robots Mediapartners-Google allow: ${String(result.robots.allowsMediapartnersGoogle)}`,
  );
  console.log("Report file: _tmp_adsense_audit_report.json");
}

main().catch((error) => {
  console.error("Audit failed:", error);
  process.exit(1);
});
