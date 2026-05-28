const fs = require("fs");

function readJson(path) {
  const raw = fs.readFileSync(path);
  const candidates = [];

  candidates.push(raw.toString("utf8"));
  candidates.push(raw.toString("utf16le"));

  if (raw.length > 1) {
    candidates.push(raw.slice(1).toString("utf16le"));
  }

  if (raw.length >= 2 && raw[0] === 0xff && raw[1] === 0xfe) {
    candidates.push(raw.slice(2).toString("utf16le"));
  }

  if (raw.length >= 2 && raw[0] === 0xfe && raw[1] === 0xff) {
    const swapped = Buffer.from(raw.slice(2));
    for (let i = 0; i + 1 < swapped.length; i += 2) {
      const a = swapped[i];
      swapped[i] = swapped[i + 1];
      swapped[i + 1] = a;
    }
    candidates.push(swapped.toString("utf16le"));
  }

  for (const text of candidates) {
    try {
      const cleaned = text.replace(/^\uFEFF/, "").replace(/^\u00FE/, "");
      return JSON.parse(cleaned);
    } catch (e) {
      // try next decoding candidate
    }
  }

  throw new Error(`Failed to parse JSON: ${path}`);
}

function summarize(path) {
  const j = readJson(path);
  const audits = j.audits || {};

  const topUnused = ((audits["unused-javascript"]?.details?.items) || [])
    .map((it) => ({
      url: it.url,
      totalBytes: it.totalBytes || 0,
      wastedBytes: it.wastedBytes || 0,
    }))
    .sort((a, b) => b.wastedBytes - a.wastedBytes)
    .slice(0, 10);

  const topBootup = ((audits["bootup-time"]?.details?.items) || [])
    .map((it) => ({
      url: it.url,
      scripting: it.scripting || 0,
      total: it.total || 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return {
    file: path,
    score: {
      performance: j.categories?.performance?.score ?? null,
      accessibility: j.categories?.accessibility?.score ?? null,
    },
    metrics: {
      lcp: audits["largest-contentful-paint"]?.numericValue ?? null,
      fcp: audits["first-contentful-paint"]?.numericValue ?? null,
      tbt: audits["total-blocking-time"]?.numericValue ?? null,
      cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
    },
    topUnused,
    topBootup,
  };
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error("Usage: node scripts/parse-lh-summary.cjs <lh1.json> [lh2.json ...]");
  process.exit(1);
}

const out = files.map(summarize);
console.log(JSON.stringify(out, null, 2));
