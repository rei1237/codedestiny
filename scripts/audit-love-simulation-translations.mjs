#!/usr/bin/env node
/**
 * 러브 시뮬레이션 장면·서사 번역(`public/i18n/<lang>/loveSimulationScenes.json`)의 상태를 잰다.
 *
 * 기계가 잡을 수 있는 것만 잡는다 — **한글 잔존 · 키 집합 · 자리표시자 · 고유명사 표기**.
 * 말투·존대·문장 품질은 여기서 못 잡으니 표본을 눈으로 봐야 한다.
 *
 * 🔴 `verify:*` 가 아니라 `audit:*` 인 이유: CI 게이트 추가는 사용자 승인 사항이고
 * (CLAUDE.md CI gate scope), 아직 이 사전은 화면에 배선되지 않았다. 배선 PR 에서
 * 정적 가드가 이 검사들을 흡수하는 것이 맞다.
 *
 * 실행: node scripts/audit-love-simulation-translations.mjs  (또는 npm run audit:love-sim-translations)
 * 종료 코드: 결함이 있으면 1.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const rootDir = process.cwd();
const i18nDir = resolve(rootDir, "public", "i18n");
const NS = "loveSimulationScenes";

/** 손으로 저작하는 로케일. 나머지는 en 복사라 en 과 같아야 한다. */
const AUTHORED = ["en", "ja", "zh-cn", "zh-tw"];
const MIRRORED = ["vi", "hi", "es", "fr", "de", "nl", "ms"];

/**
 * 캐릭터 이름 확정 표기. 정본은 `i18n/authored/shellRuntime-38.json` 이고
 * `i18n/glossary.json` 의 `terms` 가 프롬프트로 주입한다.
 * 🔴 여기 값이 글로서리와 어긋나면 검사가 거짓말을 한다 — 아래에서 실제로 대조한다.
 */
const NAMES = [
  ["강태준", "Kang Tae-jun", "カン・テジュン"],
  ["권세현", "Kwon Se-hyun", "クォン・セヒョン"],
  ["미카엘", "Michael", "ミカエル"],
  ["서유안", "Seo Yu-an", "ソ・ユアン"],
  ["서이준", "Seo I-jun", "ソ・イジュン"],
  ["윤시우", "Yoon Si-woo", "ユン・シウ"],
  ["한윤서", "Han Yoon-seo", "ハン・ユンソ"],
  ["김밍", "Kim Ming", "キム・ミン"],
  ["박지은", "Park Ji-eun", "パク・ジウン"],
  ["새벽", "Saebyeok", "セビョク"],
  ["서연", "Seoyeon", "ソヨン"],
  ["소화", "Sohwa", "ソファ"],
  ["지윤", "Jiyoon", "ジユン"],
  ["하린", "Harin", "ハリン"],
  ["네오", "Neo", "ネオ"],
  ["연이", "Yeoni", "ヨニ"],
];

function flatten(node, prefix = "", out = {}) {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[path] = value;
    else if (value && typeof value === "object") flatten(value, path, out);
  }
  return out;
}

function load(locale) {
  const path = join(i18nDir, locale, `${NS}.json`);
  if (!existsSync(path)) return null;
  return flatten(JSON.parse(readFileSync(path, "utf8")));
}

const placeholders = (value) =>
  [...String(value).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

const problems = [];
const ko = load("ko");
if (!ko) {
  console.error(`[audit] public/i18n/ko/${NS}.json 이 없습니다. 먼저 번역을 돌리세요.`);
  process.exit(1);
}
const koKeys = Object.keys(ko).sort();
console.log(`[audit] ko 정본 ${koKeys.length}키`);

// ── 1) 로케일별 키 집합 · 한글 잔존 · 자리표시자 ───────────────────────────
for (const locale of [...AUTHORED, ...MIRRORED]) {
  const dict = load(locale);
  if (!dict) {
    problems.push(`${locale}: 사전 파일이 없다`);
    continue;
  }
  const keys = Object.keys(dict).sort();
  if (keys.join("|") !== koKeys.join("|")) {
    const missing = koKeys.filter((k) => !(k in dict));
    const extra = keys.filter((k) => !(k in ko));
    problems.push(`${locale}: 키 집합 불일치 (누락 ${missing.length} / 잉여 ${extra.length})${missing[0] ? ` 예: ${missing[0]}` : ""}`);
  }
  const hangul = keys.filter((k) => /[가-힣]/.test(dict[k]));
  if (hangul.length) problems.push(`${locale}: 한글 잔존 ${hangul.length}건 예: ${hangul[0]}`);

  const brokenPlaceholders = koKeys.filter((k) => dict[k] && placeholders(ko[k]) !== placeholders(dict[k]));
  if (brokenPlaceholders.length) {
    problems.push(`${locale}: 자리표시자 불일치 ${brokenPlaceholders.length}건 예: ${brokenPlaceholders[0]}`);
  }
  console.log(`[audit]   ${locale.padEnd(6)} ${keys.length}키 · 한글 ${hangul.length} · 자리표시자 어긋남 ${brokenPlaceholders.length}`);
}

// ── 2) 용어집과 이 파일의 이름 표기가 같은가 (검사가 거짓말하지 않게) ──────
const glossary = JSON.parse(readFileSync(resolve(rootDir, "i18n", "glossary.json"), "utf8"));
for (const [koName, latin, kana] of NAMES) {
  const term = glossary.terms?.[koName];
  if (!term) {
    problems.push(`glossary.json 에 캐릭터 이름 "${koName}" 이 없다 — 프롬프트에 주입되지 않는다`);
    continue;
  }
  if (term.en !== latin || term.ja !== kana) {
    problems.push(`glossary.json 의 "${koName}" 표기가 이 검사와 다르다 (en=${term.en} ja=${term.ja})`);
  }
}

// ── 3) 이름 표기 정확도 ────────────────────────────────────────────────────
/**
 * 🔴 이 검사는 **부분 문자열**로 센다. 그래서 이름과 글자가 같은 일반명사가 섞이면
 * 오탐이 난다(2026-08-25 실측):
 *   새벽 = 사람 이름이자 "dawn"    — `새벽 공기`·`새벽 막차` 는 dawn 으로 옮기는 게 맞다
 *   연이 = 사람 이름이자 `공연이`·`서연이`(서연+주격조사) 의 일부
 *   소화 = 사람 이름이자 "digestion"
 * 그래서 **개별 불일치를 결함으로 세지 않는다.** 잡으려는 것은
 * "이름이 통째로 낱말로 번역됐다"는 **계통적 실패**이고, 그건 정확도가 바닥으로 떨어진다
 * (실제 사고: zh 에서 새벽 0/176 → 凌晨). 임계 미만일 때만 실패시키고, 나머지는 사람이
 * 표본으로 확인하도록 목록만 찍는다.
 */
const SYSTEMIC_FAILURE_RATIO = 0.5;
console.log("\n[audit] 캐릭터 이름 표기 (해당 이름이 든 ko 키 대비 — 동음이의어 오탐 포함)");
const dicts = Object.fromEntries(AUTHORED.map((l) => [l, load(l)]).filter(([, d]) => d));
let reviewCount = 0;
for (const [koName, latin, kana] of NAMES) {
  const keys = koKeys.filter((k) => ko[k].includes(koName));
  if (!keys.length) continue;
  const cells = [];
  let worst = 1;
  for (const locale of AUTHORED) {
    const want = locale === "ja" ? kana : latin;
    const hit = keys.filter((k) => dicts[locale]?.[k]?.includes(want)).length;
    const ratio = hit / keys.length;
    if (ratio < worst) worst = ratio;
    if (hit < keys.length) reviewCount += keys.length - hit;
    cells.push(`${locale}:${hit}/${keys.length}`);
  }
  const systemic = worst < SYSTEMIC_FAILURE_RATIO;
  const mark = systemic ? "🔴" : worst === 1 ? "  " : "· ";
  console.log(`[audit]   ${mark} ${koName.padEnd(7)} ${cells.join("  ")}`);
  if (systemic) {
    problems.push(
      `"${koName}" 표기가 어느 로케일에서 ${(worst * 100).toFixed(0)}% 까지 떨어졌다 — 이름이 낱말로 번역됐을 가능성이 크다`,
    );
  }
}
if (reviewCount) {
  console.log(
    `[audit]   · 표시는 부분 불일치 ${reviewCount}자리 — 대부분 동음이의어 오탐이다. 결함으로 세지 않으니 표본으로 확인할 것.`,
  );
}

// ── 4) 미저작 로케일은 en 과 같아야 한다 ───────────────────────────────────
const en = dicts.en;
for (const locale of MIRRORED) {
  const dict = load(locale);
  if (!dict || !en) continue;
  const diff = koKeys.filter((k) => dict[k] !== en[k]);
  if (diff.length) problems.push(`${locale}: en 복사본과 ${diff.length}건 다르다 예: ${diff[0]}`);
}

// ── 결과 ───────────────────────────────────────────────────────────────────
console.log("");
if (problems.length) {
  console.error(`[audit] ❌ 결함 ${problems.length}건`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log("[audit] ✅ 키 집합 · 한글 잔존 · 자리표시자 · 이름 표기 · en 복사 일치 모두 통과");
console.log("[audit] 🔴 말투·존대·문장 품질은 기계가 못 잡는다 — 로케일별 표본을 눈으로 볼 것.");
