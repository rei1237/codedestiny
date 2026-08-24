import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const indexPath = resolve(rootDir, "index.html");
const i18nDir = resolve(rootDir, "public", "i18n");
const minimumNativeMarkers = 232;
const staticMirrorFiles = [
  "public/static/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
];
// feat(i18n-seo) "open ja/zh/en indexing"(a4a0ae90) 이후 정책: 각 로케일 미러는
// 자기 자신의 로케일 경로로 self-canonical + index,follow여야 한다(더 이상 noindex/루트 canonical 아님).
const indexableLocaleMirrorFiles = {
  "public/en/index.html": "https://code-destiny.com/en/",
  "public/ja/index.html": "https://code-destiny.com/ja/",
  "public/zh/index.html": "https://code-destiny.com/zh/",
};

const buttonLangToFile = {
  en: "en.json",
  ja: "ja.json",
  "zh-CN": "zh-cn.json",
  "zh-TW": "zh-tw.json",
  vi: "vi.json",
  hi: "hi.json",
  es: "es.json",
  fr: "fr.json",
  de: "de.json",
  nl: "nl.json",
  ms: "ms.json",
};

const googleRuntimeSources = [
  resolve(rootDir, "js", "core", "index-inline-runtime.js"),
  resolve(rootDir, "public", "js", "cd-google-translate-lazy.js"),
];

function readText(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`missing file: ${filePath}`);
  }
  return readFileSync(filePath, "utf8");
}

function readJson(fileName) {
  return JSON.parse(readText(resolve(i18nDir, fileName)));
}

function flatten(value, prefix = "") {
  if (Array.isArray(value)) {
    return value.reduce((acc, item, index) => {
      Object.assign(acc, flatten(item, `${prefix}[${index}]`));
      return acc;
    }, {});
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce((acc, [key, child]) => {
      Object.assign(acc, flatten(child, prefix ? `${prefix}.${key}` : key));
      return acc;
    }, {});
  }

  return { [prefix]: value };
}

function extractLangButtons(html) {
  const buttons = [];
  const buttonRe = /<button\b(?=[^>]*\bclass=["'][^"']*\blang-btn\b[^"']*["'])(?=[^>]*\bdata-lang=["']([^"']+)["'])[^>]*>/g;
  let match;

  while ((match = buttonRe.exec(html))) {
    buttons.push(match[1]);
  }

  return [...new Set(buttons)];
}

function extractIncludedLanguages(source) {
  const langs = new Set();
  const includedRe = /(?:includedLanguages\s*:|INCLUDED_GT_LANGUAGES\s*=)\s*["']([^"']+)["']/g;
  let match;

  while ((match = includedRe.exec(source))) {
    match[1].split(",").map((lang) => lang.trim()).filter(Boolean).forEach((lang) => langs.add(lang));
  }

  return langs;
}

function countMatches(source, re) {
  return (source.match(re) || []).length;
}

function extractNativeMarkerTags(source) {
  return source.match(/<(?=\/?[A-Za-z])[^>]*(?:\bdata-cd-trans(?:=|\s|>)|\bdata-cd-trans-attr\b|\bcustom-trans\b)[^>]*>/g) || [];
}

function valueAtPath(source, path) {
  return String(path || "").replace(/\[(\d+)\]/g, ".$1").split(".").reduce((acc, key) => {
    if (!acc || !key) return acc;
    return acc[key];
  }, source);
}

function extractNativeMarkerKeys(html) {
  const tags = extractNativeMarkerTags(html);

  const textKeys = tags.map((tag) => {
    const dataKey = tag.match(/\bdata-key=["']([^"']+)["']/);
    if (dataKey && dataKey[1]) return dataKey[1];

    const cdTransKey = tag.match(/\bdata-cd-trans=["']([^"']+)["']/);
    if (cdTransKey && cdTransKey[1]) return cdTransKey[1];

    return "";
  }).filter(Boolean);
  const attrKeys = tags.flatMap((tag) => {
    const attrSpec = tag.match(/\bdata-cd-trans-attr=["']([^"']+)["']/)?.[1] || "";
    return attrSpec
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.split(":").slice(1).join(":").trim())
      .filter(Boolean);
  });
  return [...textKeys, ...attrKeys];
}

function extractNativeScriptSrc(html) {
  return html.match(/<script\b[^>]*\bsrc=["']([^"']*\/js\/cd-lang-native\.js\?v=[^"']+)["'][^>]*>/i)?.[1] || "";
}

/**
 * \uD83D\uDD34 \uD55C\uAE00\uC774 \uB0A8\uC544 \uC788\uC5B4\uC57C **\uC815\uC0C1**\uC778 \uD0A4. \uC0C1\uD638\u00B7\uB300\uD45C\uC790\u00B7\uC2E0\uACE0\uBC88\uD638\u00B7\uC8FC\uC18C\uB294 \uB4F1\uB85D\uB41C \uBB38\uC790\uC5F4 \uC790\uCCB4\uAC00
 *    \uBC95\uC801 \uD615\uC2DD\uC774\uB77C \uBC88\uC5ED \uB300\uC0C1\uC774 \uC544\uB2C8\uB2E4(\uB77C\uBCA8\uB9CC \uBC88\uC5ED\uD55C\uB2E4). 2026-08-20 \uC774\uC804\uC5D0\uB294 \uC774 \uAC12\uB4E4\uC774
 *    12\uAC1C \uB85C\uCF00\uC77C\uC5D0\uC11C \uBC88\uC5ED\uB3FC \uC788\uC5C8\uACE0 \u2014 es `Parque Byeong-ha`, fr `Parc Byeong-ha`,
 *    ja `\u30B3\u30FC\u30C9\u306E\u904B\u547D` \u2014 \uADF8\uAC8C \uACE7 **\uB4F1\uB85D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC5C5\uC790 \uC815\uBCF4 \uD45C\uC2DC**\uC600\uB2E4.
 *
 *    \uBA74\uC81C\uB85C \uB05D\uB0B4\uC9C0 \uC54A\uB294\uB2E4: \uC544\uB798\uC5D0\uC11C ko.json \uAC12\uACFC \uAC19\uC740\uC9C0 \uB300\uC2E0 \uB2E8\uC5B8\uD55C\uB2E4. \uC804\uC6A9 \uAC00\uB4DC\uB294
 *    `npm run verify:business-identity`(\uC815\uBCF8 lib/site-policy-config.js \uC640 \uB300\uC870).
 */
const LEGAL_VERBATIM_KEY = /^business\.[A-Za-z]+Value$/;

// withdrawModal.confirmMismatch는 서버(worker/routes/auth.js)가 confirmText를 "회원탈퇴"
// 리터럴로 검증하므로, 모든 로케일(en 포함) 안내 문구가 이 한글 단어를 인용해야 한다 — 값 전체가
// 아니라 인용된 한 단어만 불변이라 LEGAL_VERBATIM_KEY(전체 일치)와 달리 존재 여부만 면제한다.
// scripts/verify-i18n-public-parity.mjs의 HANGUL_QUOTE_ALLOWED_KEYS와 짝을 이룬다.
const HANGUL_QUOTE_ALLOWED_KEYS = new Set(["withdrawModal.confirmMismatch"]);

/** \uB77C\uBCA8\uACFC \uAC12\uC744 \uC787\uB294 \uAD6C\uBD84\uC790(": " / "\uFF1A"). \uD45C\uC2DC \uADDC\uCE59\uC774\uB77C \uB85C\uCF00\uC77C \uAC83\uC744 \uADF8\uB300\uB85C \uB454\uB2E4. */
function stripSeparator(value) {
  return String(value).replace(/^\s*[:\uFF1A]\s*/, "");
}

function findBadValues(flat, koFlat) {
  return Object.entries(flat).filter(([key, value]) => {
    if (typeof value !== "string") return false;
    if (LEGAL_VERBATIM_KEY.test(key)) {
      const registered = koFlat[key];
      return registered === undefined || stripSeparator(value) !== stripSeparator(registered);
    }
    if (HANGUL_QUOTE_ALLOWED_KEYS.has(key)) return false;
    return /^\?+$/.test(value) || value.includes("\uFFFD") || /[\uAC00-\uD7A3]/u.test(value);
  }).map(([key]) => key);
}

const indexHtml = readText(indexPath);
const buttonLangs = extractLangButtons(indexHtml);
const baseFlat = flatten(readJson("en.json"));
const koFlat = flatten(readJson("ko.json"));
const baseKeys = Object.keys(baseFlat).sort();
const failures = [];
const warnings = [];

if (buttonLangs.length === 0) {
  failures.push("no .lang-btn[data-lang] buttons found in index.html");
}

for (const lang of buttonLangs) {
  if (lang === "ko") continue;
  const fileName = buttonLangToFile[lang];

  if (!fileName) {
    failures.push(`no i18n file mapping for language button: ${lang}`);
    continue;
  }

  const filePath = resolve(i18nDir, fileName);
  if (!existsSync(filePath)) {
    failures.push(`missing i18n JSON for ${lang}: ${fileName}`);
    continue;
  }

  const flat = flatten(readJson(fileName));
  const keys = Object.keys(flat).sort();
  const missing = baseKeys.filter((key) => !(key in flat));
  const extra = keys.filter((key) => !(key in baseFlat));
  const badValues = findBadValues(flat, koFlat);

  if (missing.length) failures.push(`${fileName} missing keys: ${missing.slice(0, 12).join(", ")}${missing.length > 12 ? " ..." : ""}`);
  if (extra.length) failures.push(`${fileName} extra keys: ${extra.slice(0, 12).join(", ")}${extra.length > 12 ? " ..." : ""}`);
  if (badValues.length) failures.push(`${fileName} bad translated values: ${badValues.slice(0, 12).join(", ")}${badValues.length > 12 ? " ..." : ""}`);
}

for (const runtimePath of googleRuntimeSources) {
  const runtimeSource = readText(runtimePath);
  const included = extractIncludedLanguages(runtimeSource);
  const missing = buttonLangs.filter((lang) => lang !== "ko" && !included.has(lang));

  if (missing.length) {
    failures.push(`${runtimePath} missing Google Translate languages: ${missing.join(", ")}`);
  }
}

const nativeScriptLoaded = /\/js\/cd-lang-native\.js(?:[?"'\s>]|$)/.test(indexHtml);
const rootNativePath = resolve(rootDir, "js", "cd-lang-native.js");
const publicNativePath = resolve(rootDir, "public", "js", "cd-lang-native.js");
const rootNativeExists = existsSync(rootNativePath);
const publicNativeExists = existsSync(publicNativePath);
const nativeMarkerCount = extractNativeMarkerTags(indexHtml).length;
const nativeMarkerKeys = extractNativeMarkerKeys(indexHtml);
const rootNativeScriptSrc = extractNativeScriptSrc(indexHtml);

if (nativeScriptLoaded && !rootNativeExists) {
  failures.push("index.html loads /js/cd-lang-native.js but root js/cd-lang-native.js is missing");
}

if (nativeScriptLoaded && rootNativeExists) {
  const nativeSource = readText(rootNativePath);
  const included = extractIncludedLanguages(nativeSource);
  const missing = buttonLangs.filter((lang) => lang !== "ko" && !included.has(lang));

  if (missing.length) {
    failures.push(`js/cd-lang-native.js missing Google Translate languages: ${missing.join(", ")}`);
  }

  if (/hideLanguageWidget\s*\(/.test(nativeSource) || /style\.display\s*=\s*["']none["']/.test(nativeSource)) {
    failures.push("js/cd-lang-native.js must not hide #langWrap");
  }

  if (!/window\.changeLanguage\s*=\s*nativeChangeLanguage/.test(nativeSource)) {
    failures.push("js/cd-lang-native.js must bind window.changeLanguage to nativeChangeLanguage");
  }

  if (!/window\.__cdNativeLangBound\s*=\s*true/.test(nativeSource)) {
    failures.push("js/cd-lang-native.js must set window.__cdNativeLangBound");
  }

  // 마커 변수의 `@키` 해석은 두 런타임에 같은 동작으로 있어야 한다(이중 구현).
  // 한쪽만 있으면 같은 마커가 정적 셸과 React 페이지에서 다르게 풀려, 번역문 안에
  // 한국어 변수가 남는다. 이름 grep 이 아니라 **호출 지점까지** 본다.
  if (!/function resolveVars\(/.test(nativeSource)) {
    failures.push("js/cd-lang-native.js must define resolveVars() — `@key` marker vars would stay Korean");
  }
  const bareVarInterp = nativeSource.match(/interpolate\(resolveValue\([^)]*\),\s*vars(?!\s*\|\|)/g) || [];
  if (bareVarInterp.length) {
    failures.push(`js/cd-lang-native.js passes raw vars to interpolate ${bareVarInterp.length} time(s) — route them through resolveVars()`);
  }

  const coreDictPath = resolve(rootDir, "lib", "i18n", "dictionary.ts");
  if (!existsSync(coreDictPath)) {
    failures.push("lib/i18n/dictionary.ts is missing — the shared i18n core is gone");
  } else {
    const coreSource = readText(coreDictPath);
    if (!/export function resolveVars\(/.test(coreSource)) {
      failures.push("lib/i18n/dictionary.ts must export resolveVars() — the React runtime would leave `@key` vars unresolved");
    }
    if (!/interpolate\(value,\s*resolveVars\(/.test(coreSource)) {
      failures.push("lib/i18n/dictionary.ts resolveKey() must pass vars through resolveVars()");
    }
  }

  if (!publicNativeExists) {
    failures.push("index.html loads /js/cd-lang-native.js but public/js/cd-lang-native.js is missing; run npm run sync:public");
  } else {
    const publicNativeSource = readText(publicNativePath);
    if (publicNativeSource !== nativeSource) {
      failures.push("public/js/cd-lang-native.js is out of sync with js/cd-lang-native.js; run npm run sync:public");
    }
  }

  if (nativeMarkerCount < minimumNativeMarkers) {
    failures.push(`index.html must include at least ${minimumNativeMarkers} native translation markers; found ${nativeMarkerCount}`);
  }

  const missingMarkerKeys = nativeMarkerKeys
    .map((key, index) => ({ key, index }))
    .filter(({ key }) => !key);

  if (missingMarkerKeys.length) {
    failures.push(`native translation markers missing data-key: ${missingMarkerKeys.map(({ index }) => index + 1).join(", ")}`);
  }

  const uniqueMarkerKeys = [...new Set(nativeMarkerKeys.filter(Boolean))].sort();
  const jsonFilesForButtons = [...new Set(buttonLangs
    .filter((lang) => lang !== "ko")
    .map((lang) => buttonLangToFile[lang])
    .filter(Boolean))];

  for (const fileName of [...new Set(["en.json", ...jsonFilesForButtons])]) {
    const dictionary = readJson(fileName);
    const missingKeys = uniqueMarkerKeys.filter((key) => typeof valueAtPath(dictionary, key) !== "string");

    if (missingKeys.length) {
      failures.push(`${fileName} missing native marker keys: ${missingKeys.join(", ")}`);
    }
  }
}

if (!nativeScriptLoaded && publicNativeExists && !rootNativeExists) {
  warnings.push("public/js/cd-lang-native.js exists but has no root source and is not loaded");
}

for (const mirrorPath of staticMirrorFiles) {
  const filePath = resolve(rootDir, mirrorPath);
  if (!existsSync(filePath)) {
    failures.push(`missing static mirror: ${mirrorPath}`);
    continue;
  }

  const mirrorHtml = readText(filePath);
  const mirrorNativeScriptSrc = extractNativeScriptSrc(mirrorHtml);
  const mirrorMarkerCount = extractNativeMarkerTags(mirrorHtml).length;

  if (mirrorNativeScriptSrc !== rootNativeScriptSrc) {
    failures.push(`${mirrorPath} cd-lang-native script mismatch: ${mirrorNativeScriptSrc || "missing"} !== ${rootNativeScriptSrc || "missing"}`);
  }

  if (mirrorMarkerCount !== nativeMarkerCount) {
    failures.push(`${mirrorPath} native marker count mismatch: ${mirrorMarkerCount} !== ${nativeMarkerCount}`);
  }
}

for (const [mirrorPath, expectedCanonical] of Object.entries(indexableLocaleMirrorFiles)) {
  const mirrorHtml = readText(resolve(rootDir, mirrorPath));
  const escapedCanonical = expectedCanonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  if (!new RegExp(`<link rel="canonical" href="${escapedCanonical}">`, "i").test(mirrorHtml)) {
    failures.push(`${mirrorPath} must self-canonicalize to ${expectedCanonical}`);
  }

  if (!/<meta name="robots" content="index, follow/i.test(mirrorHtml)) {
    failures.push(`${mirrorPath} must be indexable (robots: index, follow) per the open-locale-indexing policy`);
  }
}

if (failures.length > 0) {
  console.error("[i18n-runtime-readiness] FAILED");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`[i18n-runtime-readiness] OK: language buttons=${buttonLangs.join(", ")}`);
console.log(`[i18n-runtime-readiness] OK: JSON parity matches en.json for ${buttonLangs.filter((lang) => lang !== "ko").length} locale files`);
console.log(`[i18n-runtime-readiness] native=${nativeScriptLoaded ? "loaded" : "not-loaded"}, rootNative=${rootNativeExists ? "yes" : "no"}, nativeMarkers=${nativeMarkerCount}`);

for (const warning of warnings) {
  console.warn(`[i18n-runtime-readiness] WARN: ${warning}`);
}
