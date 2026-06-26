#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

const rootDir = process.cwd();
const i18nDir = resolve(rootDir, "public", "i18n");
const baseFile = "en.json";
const localeFiles = (await readdir(i18nDir))
  .filter((fileName) => fileName.endsWith(".json"))
  .sort();

function readJson(fileName) {
  const filePath = resolve(i18nDir, fileName);
  if (!existsSync(filePath)) throw new Error(`missing i18n file: ${fileName}`);
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function flatten(value, prefix = "", out = {}) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, `${prefix}[${index}]`, out));
    return out;
  }

  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }

  out[prefix] = value;
  return out;
}

function valueAtPath(source, path) {
  return String(path || "")
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .reduce((acc, key) => (acc && key ? acc[key] : acc), source);
}

function extractNativeMarkerKeys(html) {
  const tags = html.match(/<(?=\/?[A-Za-z])[^>]*(?:\bdata-cd-trans(?:=|\s|>)|\bdata-cd-trans-attr\b|\bcustom-trans\b)[^>]*>/g) || [];
  const textKeys = tags
    .map((tag) => {
      const dataKey = tag.match(/\bdata-key=["']([^"']+)["']/);
      if (dataKey?.[1]) return dataKey[1];
      const cdTransKey = tag.match(/\bdata-cd-trans=["']([^"']+)["']/);
      return cdTransKey?.[1] || "";
    })
    .filter(Boolean);
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

function findInvalidValues(flat) {
  return Object.entries(flat)
    .filter(([, value]) => {
      if (typeof value !== "string") return false;
      if (!value.trim()) return true;
      if (value.includes("\uFFFD")) return true;
      return /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(value);
    })
    .map(([key]) => key);
}

function extractServiceMapLocalizedGaps(source) {
  const start = source.indexOf("export const SERVICE_MAP = {");
  if (start < 0) return [];
  const body = source.slice(start);
  const entryRe = /\n  "([^"]+)": \{/g;
  const entries = [];
  let match;

  while ((match = entryRe.exec(body))) {
    const key = match[1];
    const from = match.index;
    const nextEntryOffset = body.slice(match.index + 1).search(/\n  "[^"]+": \{/);
    const to = nextEntryOffset >= 0 ? match.index + 1 + nextEntryOffset : body.indexOf("\n};", from);
    const chunk = body.slice(from, to >= 0 ? to : undefined);
    entries.push({ key, hasLocalized: /\blocalized\s*:/.test(chunk) });
  }

  return entries.filter((entry) => !entry.hasLocalized).map((entry) => entry.key);
}

const failures = [];
const baseJson = readJson(baseFile);
const baseFlat = flatten(baseJson);
const baseKeys = Object.keys(baseFlat).sort();
const indexHtml = readFileSync(resolve(rootDir, "index.html"), "utf8");
const nativeMarkerKeys = [...new Set(extractNativeMarkerKeys(indexHtml))].sort();
const serviceMapSource = readFileSync(resolve(rootDir, "app", "_lib", "serviceMap.js"), "utf8");
const serviceMapLocalizedGaps = extractServiceMapLocalizedGaps(serviceMapSource);

if (serviceMapLocalizedGaps.length) {
  failures.push(`serviceMap entries missing localized copy: ${serviceMapLocalizedGaps.slice(0, 20).join(", ")}`);
}

for (const fileName of localeFiles) {
  const json = readJson(fileName);
  const flat = flatten(json);
  const keys = Object.keys(flat).sort();
  const missing = baseKeys.filter((key) => !(key in flat));
  const extra = keys.filter((key) => !(key in baseFlat));
  const invalid = findInvalidValues(flat);
  const missingNativeKeys = nativeMarkerKeys.filter((key) => typeof valueAtPath(json, key) !== "string");

  if (missing.length) failures.push(`${fileName} missing keys: ${missing.slice(0, 20).join(", ")}`);
  if (extra.length) failures.push(`${fileName} extra keys: ${extra.slice(0, 20).join(", ")}`);
  if (invalid.length) failures.push(`${fileName} invalid values: ${invalid.slice(0, 20).join(", ")}`);
  if (missingNativeKeys.length) failures.push(`${fileName} missing native marker keys: ${missingNativeKeys.slice(0, 20).join(", ")}`);
}

if (failures.length) {
  console.error("[i18n:check] FAILED");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`[i18n:check] OK: ${localeFiles.length} locale files share ${baseKeys.length} keys`);
console.log(`[i18n:check] OK: ${nativeMarkerKeys.length} native marker keys resolve in every locale file`);
console.log("[i18n:check] OK: serviceMap entries include localized copy");
