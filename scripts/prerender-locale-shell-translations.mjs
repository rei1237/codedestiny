// 로케일 셸(/en, /ja, /zh)의 본문을 빌드 시점에 미리 번역한다.
//
// 문제: dist/{en,ja,zh}/index.html 은 <head>(title·description·lang)만 각 언어로
// 바뀌고 <body> 는 한국어 정적 셸 그대로다. 번역은 LocaleRuntimeBridge 가
// /i18n/{lang}.json 을 받아 런타임에 DOM 을 치환하는 방식이라, JS 를 실행하지 않는
// 크롤러와 심사관 시야에서는 "영어 URL 에 한국어 페이지"가 된다.
//
// 해법: 같은 사전으로 빌드 시점에 미리 치환한다. 런타임 markNativeNodes 가
// `!el.hasAttribute('data-cd-origin-text')` 로 가드하므로, 한국어 원문을 그 속성에
// 미리 넣어 두면 KO 복원 버튼도 그대로 동작한다.
//
// 2.2MB 풀 셸을 유지하므로 해외 사용자의 기능 손실이 없고,
// href/class/id/인라인 스크립트를 건드리지 않으므로 기존 검증 게이트에도 영향이 없다.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();

// 셸 로케일 → public/i18n 사전 파일명
// zh-tw 는 promote-static-shell-to-root 가 셸을 승격하는데도 여기 없어서 번역 패스를
// 한 번도 받지 못했다(본문 54%가 한국어인 채로 lang="zh-TW" 를 선언했다).
const LOCALE_DICTIONARIES = { en: "en", ja: "ja", zh: "zh-cn", "zh-tw": "zh-tw" };

function flattenDictionary(source, prefix = "", target = {}) {
  for (const [key, value] of Object.entries(source || {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) flattenDictionary(value, path, target);
    else if (typeof value === "string") target[path] = value;
  }
  return target;
}

function escapeHtmlText(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttribute(value) {
  return escapeHtmlText(value).replace(/"/g, "&quot;");
}

/**
 * 여는 태그 ~ 닫는 태그 사이에 다른 태그가 없는 요소만 잡는다.
 * 중첩이 생기면 이 정규식이 조용히 어긋나므로, 아래에서 별도로 세어 빌드를 실패시킨다.
 *
 * 셸은 마커 문법 두 가지를 섞어 쓴다 — `data-cd-trans="키"`(374개)와
 * `data-cd-trans data-key="키"`(802개). 예전 정규식은 `data-cd-trans="` 만 잡아
 * 후자 802개(전체의 68%)를 통째로 건너뛰었고, 그 결과 /ja·/zh·/en 본문에 한국어가
 * 각 10,102자씩 남았다. 런타임(js/cd-lang-native.js, LocaleRuntimeBridge.tsx)은
 * 처음부터 둘 다 읽고 있었으므로, 여기만 런타임과 같은 해석으로 맞춘다.
 *
 * 접두사가 겹치는 `data-cd-trans-attr` 를 오인하지 않도록 뒤 문자를 확인한다.
 */
const TRANS_MARKER_SOURCE = String.raw`\sdata-cd-trans(?=[\s=>])`;
const SIMPLE_TRANS_ELEMENT = new RegExp(
  String.raw`<([a-z][a-z0-9]*)((?:[^<>]*?)${TRANS_MARKER_SOURCE}(?:[^<>]*?))>([^<]*)<\/\1>`,
  "gi",
);

/** 런타임과 같은 우선순위: data-key 가 먼저, 없으면 data-cd-trans 의 값. */
function extractTransKey(attrs) {
  const fromDataKey = /\sdata-key="([^"]+)"/.exec(attrs);
  if (fromDataKey) return fromDataKey[1];
  const fromInlineValue = /\sdata-cd-trans="([^"]+)"/.exec(attrs);
  return fromInlineValue ? fromInlineValue[1] : "";
}

function translateShell(html, dictionary) {
  let textReplaced = 0;
  let attrReplaced = 0;

  let output = html.replace(
    SIMPLE_TRANS_ELEMENT,
    (match, tag, attrs, text) => {
      const key = extractTransKey(attrs);
      if (!key) return match;
      const translated = dictionary[key];
      if (typeof translated !== "string" || translated.length === 0) return match;
      if (/data-cd-origin-text=/.test(attrs)) return match;

      textReplaced += 1;
      const withOrigin = `${attrs} data-cd-origin-text="${escapeAttribute(text)}"`;
      return `<${tag}${withOrigin}>${escapeHtmlText(translated)}</${tag}>`;
    },
  );

  // data-cd-trans-attr="aria-label:home.tiles.someAria, title:home.x" 형태의 속성 번역
  output = output.replace(/<([a-z][a-z0-9]*)((?:[^<>]*?)\sdata-cd-trans-attr="([^"]+)"(?:[^<>]*?))>/gi, (match, tag, attrs, spec) => {
    let nextAttrs = attrs;
    for (const item of spec.split(",").map((part) => part.trim()).filter(Boolean)) {
      const [attrName, key] = item.split(":").map((part) => (part || "").trim());
      if (!attrName || !key) continue;
      const translated = dictionary[key];
      if (typeof translated !== "string" || translated.length === 0) continue;

      const originName = `data-cd-origin-attr-${attrName.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
      if (new RegExp(`\\s${originName}=`).test(nextAttrs)) continue;

      const current = new RegExp(`\\s${attrName}="([^"]*)"`).exec(nextAttrs);
      if (!current) continue;

      nextAttrs = nextAttrs.replace(current[0], ` ${attrName}="${escapeAttribute(translated)}"`);
      nextAttrs += ` ${originName}="${escapeAttribute(current[1])}"`;
      attrReplaced += 1;
    }
    return nextAttrs === attrs ? match : `<${tag}${nextAttrs}>`;
  });

  return { output, textReplaced, attrReplaced };
}

let touched = 0;
for (const baseDir of ["dist", "out", ".open-next/assets"]) {
  for (const [locale, dictionaryName] of Object.entries(LOCALE_DICTIONARIES)) {
    const shellPath = resolve(rootDir, baseDir, locale, "index.html");
    if (!existsSync(shellPath)) continue;

    const dictionaryPath = resolve(rootDir, "public", "i18n", `${dictionaryName}.json`);
    if (!existsSync(dictionaryPath)) {
      console.error(`[locale-prerender] missing dictionary: ${dictionaryPath}`);
      process.exit(1);
    }

    const html = readFileSync(shellPath, "utf8");
    // 마커 총계는 주석·스크립트·스타일을 걷어낸 사본에서 센다. 셸 주석에 "data-cd-trans"
    // 라는 낱말이 설명문으로 8곳 등장해서, 원문 그대로 세면 실제 속성이 아닌 것까지
    // 분모에 들어가 가드가 상시 실패한다.
    const markupOnly = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "");
    const totalKeys = (markupOnly.match(new RegExp(TRANS_MARKER_SOURCE, "g")) || []).length;
    const simpleKeys = [...markupOnly.matchAll(SIMPLE_TRANS_ELEMENT)].length;

    // 셸 편집으로 중첩 마크업이 생기면 위 정규식이 조용히 건너뛴다. 그 상태로 배포하면
    // 로케일 본문 일부가 한국어로 남으므로 여기서 막는다.
    if (simpleKeys < totalKeys) {
      console.error(
        `[locale-prerender] ${baseDir}/${locale}: ${totalKeys - simpleKeys} data-cd-trans element(s) contain nested markup; ` +
          "the shell must keep these as plain-text nodes.",
      );
      process.exit(1);
    }

    const dictionary = flattenDictionary(JSON.parse(readFileSync(dictionaryPath, "utf8")));
    const { output, textReplaced, attrReplaced } = translateShell(html, dictionary);
    writeFileSync(shellPath, output, "utf8");
    touched += 1;
    console.log(`[locale-prerender] ${baseDir}/${locale}: text ${textReplaced}, attr ${attrReplaced}`);
  }
}

if (touched === 0) console.log("[locale-prerender] no locale shells found (skipped)");
