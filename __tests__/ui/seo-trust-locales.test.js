const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");

test("locale sitemaps partition canonical URLs without changing lastmod or alternates", async () => {
  const { splitLocaleSitemaps } = await import("../../scripts/lib/locale-sitemaps.mjs");
  const xml = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  const partitions = splitLocaleSitemaps(xml);
  const blocks = text => [...text.matchAll(/<url>[\s\S]*?<\/url>/g)].map(m => m[0]).sort();
  assert.deepEqual(Object.values(partitions).flatMap(blocks).sort(), blocks(xml));
  for (const [file, data] of Object.entries(partitions)) {
    const locale = file.replace("sitemap-", "").replace(".xml", "");
    for (const match of data.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const segment = new URL(match[1]).pathname.split("/")[1];
      assert.equal(["ja", "en", "zh", "zh-tw"].includes(segment) ? segment : "ko", locale);
      assert.ok(!/\/(?:payment|checkout|admin|api|test|staging|account)(?:\/|$)/.test(new URL(match[1]).pathname));
    }
    assert.equal(fs.readFileSync(path.join(root, file), "utf8"), data);
    assert.equal(fs.readFileSync(path.join(root, "public", file), "utf8"), data);
  }
});

test("public trust dictionaries are complete, native-language and contain visible FAQ answers", async () => {
  const { TRUST_COPY, TRUST_KEYS, TRUST_LOCALES, trustRoutes } = await import("../../lib/i18n/public-trust-copy.mjs");
  const titles = new Set();
  const descriptions = new Set();
  for (const locale of TRUST_LOCALES) for (const key of TRUST_KEYS) {
    const copy = TRUST_COPY[locale][key];
    assert.ok(copy.title && copy.description && copy.intro);
    assert.ok(!titles.has(copy.title)); titles.add(copy.title);
    assert.ok(!descriptions.has(copy.description)); descriptions.add(copy.description);
    assert.doesNotMatch(JSON.stringify(copy), /[가-힣]|Translation pending/);
    assert.ok(copy.sections.length >= (key === "faq" ? 10 : 5));
    assert.ok(copy.sections.every(([heading, body]) => heading.length > 0 && body.length > 30));
    assert.ok(fs.existsSync(path.join(root, `app/[locale]/${key}/page.js`)));
    assert.equal(trustRoutes(key)[locale], `/${locale}/${key}/`);
    assert.equal(trustRoutes(key)["x-default"], `/${key}/`);
  }
});

test("feature introductions contain substantial native copy and real reciprocal routes", async () => {
  const { FEATURE_INTRODUCTIONS, INTRO_UI, INTRO_LOCALES, INTRO_TOPICS, introductionRoutes } = await import("../../lib/i18n/feature-introductions.mjs");
  for (const topic of INTRO_TOPICS) {
    assert.ok(
      ["page.js", "page.tsx"].some((file) => fs.existsSync(path.join(root, `app/${topic}`, file))),
      `${topic}: 한국어 원본 라우트가 없다`,
    );
    assert.ok(fs.existsSync(path.join(root, `app/[locale]/${topic}/page.js`)));
    for (const locale of INTRO_LOCALES) {
      const copy = FEATURE_INTRODUCTIONS[topic][locale];
      const ui = INTRO_UI[locale];
      const body = [copy.heading, ...copy.sections.flat(), ui.access, ui.question, ui.answer, ui.caution].join(" ");
      assert.doesNotMatch(body, /[가-힣]|Translation pending/);
      assert.ok(locale === "en" ? body.split(/\s+/).length >= 450 : body.length >= 800, `${locale}/${topic}: insufficient editorial detail`);
      assert.equal(introductionRoutes(topic)[locale], `/${locale}/${topic}/`);
      assert.equal(introductionRoutes(topic).ko, `/${topic}/`);
    }
  }
});

test("only completed public locales are eligible for SEO discovery", async () => {
  const { SEO_INDEXABLE_LOCALES } = await import("../../lib/i18n/locales.ts");
  assert.deepEqual(SEO_INDEXABLE_LOCALES, ["ko", "ja", "zh", "zh-TW", "en"]);

  const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  for (const locale of ["de", "es", "fr", "hi", "ms", "nl", "vi"]) {
    assert.doesNotMatch(sitemap, new RegExp(`https://code-destiny\\.com/${locale}(?:/|<)`));
  }
});

test("traditional-Chinese indexed hubs carry native explanatory copy", async () => {
  const source = fs.readFileSync(path.join(root, "lib/seo/i18nKeywords.ts"), "utf8");
  assert.match(source, /TRADITIONAL_READING_CONTEXT/);
  assert.doesNotMatch(source.match(/TRADITIONAL_READING_CONTEXT\s*=\s*"([^"]+)"/)?.[1] || "", /[가-힣]/);
  assert.match(source, /traditional\.faq\.push/);
});
