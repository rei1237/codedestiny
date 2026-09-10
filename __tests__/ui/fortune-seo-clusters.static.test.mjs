import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  ILGAN_MONTHLY_MONTHS,
  ILGAN_MONTHLY_STEMS,
} from "../../lib/saju/ilgan-monthly-registry.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const expectedStemSlugs = [
  "gap-mok",
  "eul-mok",
  "byeong-hwa",
  "jeong-hwa",
  "mu-to",
  "gi-to",
  "gyeong-geum",
  "sin-geum",
  "im-su",
  "gye-su",
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("2026년 9월 일간별 운세 registry는 10개 고유 프로필을 제공한다", () => {
  assert.deepEqual(Object.keys(ILGAN_MONTHLY_MONTHS), ["2026-09"]);
  assert.deepEqual(
    ILGAN_MONTHLY_STEMS.map((profile) => profile.slug),
    expectedStemSlugs,
  );
  assert.equal(new Set(ILGAN_MONTHLY_STEMS.map((profile) => profile.slug)).size, 10);
  for (const profile of ILGAN_MONTHLY_STEMS) {
    assert.match(profile.name, /일간$/);
    assert.ok(profile.flow.length > 40);
    assert.ok(profile.money.length > 20);
    assert.ok(profile.love.length > 20);
    assert.ok(profile.work.length > 20);
    assert.ok(profile.health.length > 20);
  }
});

test("신규 SEO route source와 정적 sitemap coverage가 계획과 일치한다", () => {
  const monthlyHub = read("app/saju/monthly/[month]/page.tsx");
  const monthlyDetail = read("app/saju/monthly/[month]/[stem]/page.tsx");
  const datePage = read("app/fortune/date/[date]/[sign]/page.tsx");
  const sitemap = read("sitemap.xml");

  assert.match(monthlyHub, /generateStaticParams/);
  assert.match(monthlyHub, /const MONTH_KEY = "2026-09"/);
  assert.match(monthlyHub, /일간별 운세/);
  assert.match(monthlyDetail, /generateStaticParams/);
  assert.match(monthlyDetail, /buildFaqPageJsonLd/);
  assert.match(datePage, /generateStaticParams/);
  assert.match(datePage, /resolveFortuneArchiveDates/);

  const monthlyUrls = sitemap.match(/<loc>https:\/\/code-destiny\.com\/saju\/monthly\/2026-09(?:\/[^<]+)?\/?<\/loc>/g) ?? [];
  const dateUrls = sitemap.match(/<loc>https:\/\/code-destiny\.com\/fortune\/date\/\d{4}-\d{2}-\d{2}\/[a-z]+\/?<\/loc>/g) ?? [];
  assert.equal(monthlyUrls.length, 11);
  assert.equal(dateUrls.length, 30 * 12);
});

test("날짜 archive의 공개 보관 기간은 30일이고 tomorrow 계산용 파일은 31일이다", () => {
  const dailyData = read("lib/fortune/daily-data.ts");
  const buildData = read("scripts/fortune-build-data.mjs");

  assert.match(dailyData, /FORTUNE_ARCHIVE_DAYS = 30/);
  assert.match(buildData, /FORTUNE_RETENTION_DAYS: '31'/);
  assert.match(buildData, /archive: archiveDates/);
});
