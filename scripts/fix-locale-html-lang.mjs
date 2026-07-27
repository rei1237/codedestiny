// 로케일 하위 페이지의 <html lang> 을 실제 콘텐츠 언어로 교정한다.
//
// app/layout.js 는 <html lang="ko"> 를 하드코딩하고 있고, output:"export" + App Router
// 에서는 루트 레이아웃만 <html> 을 렌더하므로 라우트별로 lang 을 분기할 수 없다.
// 그 결과 out/{en,ja,zh}/** 의 하위 페이지는 본문이 영어·일본어·중국어인데도
// lang="ko" 로 나간다(로케일 루트 3개는 정적 셸이라 이미 올바르다).
//
// 빌드 산출물에서 리터럴 한 번만 치환하는 후처리라 부작용이 없다.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const LOCALE_LANG = { en: "en", ja: "ja", zh: "zh-CN" };
const KOREAN_HTML_TAG = /<html lang="ko"/;

function collectHtmlFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) collectHtmlFiles(full, acc);
    else if (entry.endsWith(".html")) acc.push(full);
  }
  return acc;
}

let total = 0;
for (const baseDir of ["out", "dist"]) {
  for (const [locale, lang] of Object.entries(LOCALE_LANG)) {
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
