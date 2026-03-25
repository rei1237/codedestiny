import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function parseArgs(argv) {
  const out = {
    url: "https://code-destiny.com",
    strategy: "mobile",
    label: "current",
    outDir: "reports/perf",
    baseline: "",
    apiKey: process.env.PAGESPEED_API_KEY || process.env.GOOGLE_PAGESPEED_API_KEY || "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const b = argv[i + 1];
    if (a === "--url" && b) {
      out.url = b;
      i += 1;
    } else if (a === "--strategy" && b) {
      out.strategy = b;
      i += 1;
    } else if (a === "--label" && b) {
      out.label = b;
      i += 1;
    } else if (a === "--outDir" && b) {
      out.outDir = b;
      i += 1;
    } else if (a === "--baseline" && b) {
      out.baseline = b;
      i += 1;
    } else if (a === "--apiKey" && b) {
      out.apiKey = b;
      i += 1;
    }
  }

  return out;
}

function pickAudit(audits, id) {
  const a = audits?.[id] || {};
  return {
    id,
    title: a.title || id,
    score: typeof a.score === "number" ? Math.round(a.score * 100) : null,
    numericValue: typeof a.numericValue === "number" ? a.numericValue : null,
    displayValue: a.displayValue || "-",
  };
}

function toK(v) {
  if (typeof v !== "number") return "-";
  return `${Math.round(v).toLocaleString("en-US")}`;
}

function buildSummary(data, label) {
  const categories = data?.lighthouseResult?.categories || {};
  const audits = data?.lighthouseResult?.audits || {};

  const performance = Math.round(((categories.performance?.score || 0) * 100));
  const lcp = pickAudit(audits, "largest-contentful-paint");
  const tbt = pickAudit(audits, "total-blocking-time");
  const si = pickAudit(audits, "speed-index");
  const fcp = pickAudit(audits, "first-contentful-paint");
  const cls = pickAudit(audits, "cumulative-layout-shift");

  return {
    label,
    requestedUrl: data?.id || "",
    finalUrl: data?.lighthouseResult?.finalDisplayedUrl || data?.lighthouseResult?.finalUrl || "",
    fetchedAt: new Date().toISOString(),
    scores: {
      performance,
      accessibility: Math.round(((categories.accessibility?.score || 0) * 100)),
      bestPractices: Math.round(((categories["best-practices"]?.score || 0) * 100)),
      seo: Math.round(((categories.seo?.score || 0) * 100)),
    },
    metrics: {
      lcp,
      tbt,
      speedIndex: si,
      fcp,
      cls,
    },
  };
}

function deltaLine(name, current, previous, unit = "") {
  if (typeof current !== "number" || typeof previous !== "number") return `- ${name}: 비교 불가`;
  const delta = current - previous;
  const arrow = delta < 0 ? "개선" : delta > 0 ? "악화" : "동일";
  const sign = delta > 0 ? "+" : "";
  return `- ${name}: ${previous}${unit} -> ${current}${unit} (${sign}${delta}${unit}, ${arrow})`;
}

function writeMarkdown(summary, baselineSummary) {
  const p = summary.scores.performance;
  const m = summary.metrics;

  const lines = [
    `# PSI Mobile Audit - ${summary.label}`,
    "",
    `- URL: ${summary.requestedUrl}`,
    `- Final URL: ${summary.finalUrl}`,
    `- Generated: ${summary.fetchedAt}`,
    "",
    "## Category Scores",
    `- Performance: ${summary.scores.performance}`,
    `- Accessibility: ${summary.scores.accessibility}`,
    `- Best Practices: ${summary.scores.bestPractices}`,
    `- SEO: ${summary.scores.seo}`,
    "",
    "## Core Metrics",
    `- LCP: ${m.lcp.displayValue} (${toK(m.lcp.numericValue)} ms)`,
    `- TBT: ${m.tbt.displayValue} (${toK(m.tbt.numericValue)} ms)`,
    `- Speed Index: ${m.speedIndex.displayValue} (${toK(m.speedIndex.numericValue)} ms)`,
    `- FCP: ${m.fcp.displayValue} (${toK(m.fcp.numericValue)} ms)`,
    `- CLS: ${m.cls.displayValue}`,
    "",
    "## Goal Check",
    `- Mobile Performance >= 90: ${p >= 90 ? "PASS" : "FAIL"}`,
  ];

  if (baselineSummary) {
    lines.push("", "## Delta vs Baseline");
    lines.push(
      deltaLine("Performance", summary.scores.performance, baselineSummary.scores.performance),
      deltaLine("LCP", Math.round(m.lcp.numericValue || 0), Math.round(baselineSummary.metrics.lcp.numericValue || 0), "ms"),
      deltaLine("TBT", Math.round(m.tbt.numericValue || 0), Math.round(baselineSummary.metrics.tbt.numericValue || 0), "ms"),
      deltaLine("Speed Index", Math.round(m.speedIndex.numericValue || 0), Math.round(baselineSummary.metrics.speedIndex.numericValue || 0), "ms"),
      deltaLine("FCP", Math.round(m.fcp.numericValue || 0), Math.round(baselineSummary.metrics.fcp.numericValue || 0), "ms"),
    );
  }

  return `${lines.join("\n")}\n`;
}

async function fetchPsi(url, strategy, apiKey) {
  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", strategy);
  if (apiKey) endpoint.searchParams.set("key", apiKey);
  endpoint.searchParams.append("category", "PERFORMANCE");
  endpoint.searchParams.append("category", "ACCESSIBILITY");
  endpoint.searchParams.append("category", "BEST_PRACTICES");
  endpoint.searchParams.append("category", "SEO");

  const res = await fetch(endpoint.toString(), {
    headers: {
      "Accept": "application/json",
      "User-Agent": "code-destiny-psi-audit/1.0",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) {
      throw new Error(
        "PSI quota exceeded (429). Set PAGESPEED_API_KEY or pass --apiKey <key>, then retry.",
      );
    }
    throw new Error(`PSI request failed (${res.status}): ${text.slice(0, 300)}`);
  }

  return res.json();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDir = resolve(process.cwd(), args.outDir);
  mkdirSync(outDir, { recursive: true });

  const psiRaw = await fetchPsi(args.url, args.strategy, args.apiKey);
  const summary = buildSummary(psiRaw, args.label);

  let baselineSummary = null;
  if (args.baseline) {
    const baselinePath = resolve(process.cwd(), args.baseline);
    if (!existsSync(baselinePath)) {
      throw new Error(`Baseline file not found: ${baselinePath}`);
    }
    baselineSummary = JSON.parse(readFileSync(baselinePath, "utf8"));
  }

  const stamp = new Date().toISOString().replace(/[.:]/g, "-");
  const safeLabel = args.label.replace(/[^a-zA-Z0-9_-]/g, "-");
  const summaryPath = resolve(outDir, `psi-${safeLabel}-${stamp}.summary.json`);
  const rawPath = resolve(outDir, `psi-${safeLabel}-${stamp}.raw.json`);
  const mdPath = resolve(outDir, `psi-${safeLabel}-${stamp}.md`);

  writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");
  writeFileSync(rawPath, JSON.stringify(psiRaw, null, 2), "utf8");
  writeFileSync(mdPath, writeMarkdown(summary, baselineSummary), "utf8");

  console.log(`[psi] URL: ${args.url}`);
  console.log(`[psi] Strategy: ${args.strategy}`);
  console.log(`[psi] Performance: ${summary.scores.performance}`);
  console.log(`[psi] LCP: ${summary.metrics.lcp.displayValue}`);
  console.log(`[psi] TBT: ${summary.metrics.tbt.displayValue}`);
  console.log(`[psi] Summary: ${summaryPath}`);
  console.log(`[psi] Markdown: ${mdPath}`);
  console.log(`[psi] Raw: ${rawPath}`);
}

main().catch((err) => {
  console.error(`[psi] ERROR: ${err.message}`);
  process.exit(1);
});
