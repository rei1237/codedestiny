import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const i18nDir = resolve(rootDir, "public", "i18n");
const baseFile = "en.json";
const readyLocaleFiles = ["ja.json", "zh-cn.json"];

function readJson(fileName) {
  const filePath = resolve(i18nDir, fileName);
  if (!existsSync(filePath)) {
    throw new Error(`missing i18n file: ${fileName}`);
  }
  return JSON.parse(readFileSync(filePath, "utf8"));
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

function targetFilesFromArgs() {
  const args = process.argv.slice(2);
  if (args.includes("--all")) {
    // 🔴 vi.json 과 zh-tw.json 이 2026-08-20 까지 빠져 있었다. 둘 다 en.json 과 같은 5,845키를
    // 담고 있고 런타임 로케일 12개에 포함되는데, --all 에도 readyLocaleFiles 에도 없어서
    // 키 누락·한글 유입·U+FFFD 를 **어떤 모드로도** 검사받지 않았다.
    return ["de.json", "es.json", "fr.json", "hi.json", "ja.json", "ms.json", "nl.json", "vi.json", "zh-cn.json", "zh-tw.json"];
  }

  const explicit = args.filter((arg) => arg.endsWith(".json"));
  return explicit.length > 0 ? explicit : readyLocaleFiles;
}

/**
 * 🔴 한글이 남아 있어야 **정상**인 키. 상호·대표자·신고번호·주소는 등록된 문자열 자체가
 *    법적 형식이라 번역 대상이 아니다(라벨만 번역한다). 2026-08-20 이전에는 이 값들이
 *    12개 로케일에서 번역돼 있었고 — es `Parque Byeong-ha`, ja `コードの運命` — 그게 곧
 *    등록되지 않은 사업자 정보 표시였다.
 *
 *    면제로 끝내지 않는다: 아래에서 ko.json 값과 같은지 대신 단언한다.
 *    전용 가드는 `npm run verify:business-identity`(정본 lib/site-policy-config.js 와 대조).
 */
const LEGAL_VERBATIM_KEY = /^business\.[A-Za-z]+Value$/;
const stripSeparator = (value) => String(value).replace(/^\s*[:：]\s*/, "");

const baseFlat = flatten(readJson(baseFile));
const koFlat = flatten(readJson("ko.json"));
const baseKeys = Object.keys(baseFlat).sort();
const targetFiles = targetFilesFromArgs();
const failures = [];

for (const fileName of targetFiles) {
  const flat = flatten(readJson(fileName));
  const keys = Object.keys(flat).sort();
  const missing = baseKeys.filter((key) => !(key in flat));
  const extra = keys.filter((key) => !(key in baseFlat));
  const badQuestionMarks = Object.entries(flat).filter(([, value]) => typeof value === "string" && /^\?+$/.test(value));
  const replacementChars = Object.entries(flat).filter(([, value]) => typeof value === "string" && value.includes("\uFFFD"));
  const hangulValues = Object.entries(flat).filter(([key, value]) => {
    if (typeof value !== "string") return false;
    if (LEGAL_VERBATIM_KEY.test(key)) return false;
    return /[가-힣]/.test(value);
  });
  // 법정 표기는 "한글이면 실패"가 아니라 "ko 와 다르면 실패"다.
  const driftedLegalValues = Object.entries(flat).filter(([key, value]) => {
    if (typeof value !== "string" || !LEGAL_VERBATIM_KEY.test(key)) return false;
    const registered = koFlat[key];
    return registered === undefined || stripSeparator(value) !== stripSeparator(registered);
  });

  if (missing.length || extra.length || badQuestionMarks.length || replacementChars.length
      || hangulValues.length || driftedLegalValues.length) {
    failures.push({
      fileName,
      missing,
      extra,
      badQuestionMarks: badQuestionMarks.map(([key]) => key),
      replacementChars: replacementChars.map(([key]) => key),
      hangulValues: hangulValues.map(([key]) => key),
      driftedLegalValues: driftedLegalValues.map(([key]) => key),
    });
  }
}

if (failures.length > 0) {
  console.error("[i18n-public-parity] FAILED");
  for (const failure of failures) {
    console.error(JSON.stringify(failure, null, 2));
  }
  process.exit(1);
}

console.log(`[i18n-public-parity] OK: ${targetFiles.join(", ")} match ${baseFile}`);
