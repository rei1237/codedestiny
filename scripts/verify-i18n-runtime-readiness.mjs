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
const noindexLocaleMirrorFiles = [
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
];

const buttonLangToFile = {
  en: "en.json",
  ja: "ja.json",
  "zh-CN": "zh-cn.json",
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
  return source.match(/<(?=\/?[A-Za-z])[^>]*(?:\bdata-cd-trans\b|\bcustom-trans\b)[^>]*>/g) || [];
}

function valueAtPath(source, path) {
  return String(path || "").replace(/\[(\d+)\]/g, ".$1").split(".").reduce((acc, key) => {
    if (!acc || !key) return acc;
    return acc[key];
  }, source);
}

function extractNativeMarkerKeys(html) {
  const tags = extractNativeMarkerTags(html);

  return tags.map((tag) => {
    const dataKey = tag.match(/\bdata-key=["']([^"']+)["']/);
    if (dataKey && dataKey[1]) return dataKey[1];

    const cdTransKey = tag.match(/\bdata-cd-trans=["']([^"']+)["']/);
    if (cdTransKey && cdTransKey[1]) return cdTransKey[1];

    return "";
  });
}

function extractNativeScriptSrc(html) {
  return html.match(/<script\b[^>]*\bsrc=["']([^"']*\/js\/cd-lang-native\.js\?v=[^"']+)["'][^>]*>/i)?.[1] || "";
}

function findBadValues(flat) {
  return Object.entries(flat).filter(([, value]) => {
    if (typeof value !== "string") return false;
    return /^\?+$/.test(value) || value.includes("\uFFFD") || /[\uAC00-\uD7A3]/u.test(value);
  }).map(([key]) => key);
}

const indexHtml = readText(indexPath);
const buttonLangs = extractLangButtons(indexHtml);
const baseFlat = flatten(readJson("en.json"));
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
  const badValues = findBadValues(flat);

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

for (const mirrorPath of noindexLocaleMirrorFiles) {
  const mirrorHtml = readText(resolve(rootDir, mirrorPath));

  if (!/<link rel="canonical" href="https:\/\/code-destiny\.com\/">/i.test(mirrorHtml)) {
    failures.push(`${mirrorPath} must canonicalize to https://code-destiny.com/ until locale SEO is explicitly enabled`);
  }

  if (!/<meta name="robots" content="noindex, nofollow">/i.test(mirrorHtml)) {
    failures.push(`${mirrorPath} must remain noindex while runtime translation is not SEO-indexable`);
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
