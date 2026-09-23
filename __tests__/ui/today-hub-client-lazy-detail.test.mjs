import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../app/today/TodayHubClient.tsx", import.meta.url), "utf8");

function sliceBetween(text, start, end) {
  const from = text.indexOf(start);
  assert.notEqual(from, -1, `missing start marker: ${start}`);
  const to = text.indexOf(end, from);
  assert.notEqual(to, -1, `missing end marker: ${end}`);
  return text.slice(from, to);
}

test("/today hub uses summary-first loading and lazy detail fetches", () => {
  const summaryBlock = sliceBetween(source, "const summaryQuery = useMemo", "const [detailState");

  assert.match(source, /const summaryQuery = useMemo\(\(\) => \{\s+const params = new URLSearchParams\(\{ locale \}\);/);
  assert.doesNotMatch(summaryBlock, /detail/);
  assert.match(source, /fetch\(getApiUrl\(`\/api\/fortune\/today-hub\?\$\{summaryQuery\}`\)/);
  assert.match(source, /params\.set\("detail", "1"\);/);
  assert.match(source, /onToggle=\{\(event\) => \{/);
});

test("/today hub loading state uses flower pig Yeoni instead of an empty panel", () => {
  assert.match(source, /TODAY_LOADING_IMAGE = "\/images\/fortune-tea-house\/mobile\/flower-pig-result-still-mobile\.webp"/);
  assert.match(source, /function TodayLoadingPanel/);
  assert.match(source, /role="status"/);
  assert.match(source, /aria-busy="true"/);
  assert.doesNotMatch(source, /aria-hidden="true" className="min-h-\[16rem\] rounded-3xl border border-white\/8 bg-white\/\[0\.03\]"/);
});
