// 로케일 하위 페이지의 <html lang> 을 실제 콘텐츠 언어로 교정한다.
//
// app/layout.js 는 <html lang="ko"> 를 하드코딩하고 있고, output:"export" + App Router
// 에서는 루트 레이아웃만 <html> 을 렌더하므로 라우트별로 lang 을 분기할 수 없다.
// 그 결과 out/{en,ja,zh}/** 의 하위 페이지는 본문이 영어·일본어·중국어인데도
// lang="ko" 로 나간다(로케일 루트 3개는 정적 셸이라 이미 올바르다).
//
// 빌드 산출물에서 리터럴 한 번만 치환하는 후처리라 부작용이 없다.
//
// 🔴 2026-08: zh-tw 가 이 맵에 없어서 out/zh-tw/** 19개 파일이 lang="ko" 로 나갔다
// (로케일 루트만 정적 셸이라 zh-TW 로 옳았고, 하위 페이지는 전부 한국어로 선언됐다).
// 손으로 쓴 목록이라 로케일이 늘어도 아무도 실패하지 않는 것이 원인이었으므로,
// 이제 대상 로케일을 lib/i18n/locales.ts 의 pathPrefix 에서 전수 발견하고
// 값이 없는 로케일이 하나라도 있으면 빌드를 세운다(CLAUDE.md 코딩 원칙 10).
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();

// 값은 정적 셸이 선언하는 것과 같아야 한다 — 셸(로케일 루트)과 하위 페이지가
// 서로 다른 lang 을 선언하면 hreflang 클러스터가 흔들린다.
// 실측(2026-08-15 라이브): /ja/=ja · /zh/=zh-CN · /zh-tw/=zh-TW · /en/=en
const LOCALE_LANG = { en: "en", ja: "ja", zh: "zh-CN", "zh-tw": "zh-TW" };
const KOREAN_HTML_TAG = /<html lang="ko"/;

/** lib/i18n/locales.ts 의 LOCALE_CONFIG[*].pathPrefix 에서 로케일 디렉터리를 전수 발견한다. */
function discoverLocaleSegments() {
  const source = readFileSync(resolve(rootDir, "lib", "i18n", "locales.ts"), "utf8");
  const segments = [...source.matchAll(/pathPrefix:\s*"([^"]*)"/g)]
    .map((match) => match[1].replace(/^\//, ""))
    .filter(Boolean);
  if (segments.length < 2) {
    throw new Error("[locale-html-lang] lib/i18n/locales.ts 에서 pathPrefix 를 읽지 못했다 — 파서가 깨졌다.");
  }
  const missing = segments.filter((segment) => !LOCALE_LANG[segment]);
  if (missing.length) {
    throw new Error(`[locale-html-lang] LOCALE_LANG 에 없는 로케일: ${missing.join(", ")} — 이 맵에 추가해야 한다.`);
  }
  return segments;
}

function collectHtmlFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) collectHtmlFiles(full, acc);
    else if (entry.endsWith(".html")) acc.push(full);
  }
  return acc;
}

const localeSegments = discoverLocaleSegments();

let total = 0;
for (const baseDir of ["out", "dist"]) {
  for (const locale of localeSegments) {
    const lang = LOCALE_LANG[locale];
    const localeDir = resolve(rootDir, baseDir, locale);
    for (const file of collectHtmlFiles(localeDir)) {
      const html = readFileSync(file, "utf8");
      if (!KOREAN_HTML_TAG.test(html)) continue;
      writeFileSync(file, html.replace(KOREAN_HTML_TAG, `<html lang="${lang}"`), "utf8");
      total += 1;
    }
  }
}

console.log(`[locale-html-lang] fixed ${total} page(s)`);
