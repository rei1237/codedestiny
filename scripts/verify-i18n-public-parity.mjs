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

const baseFlat = flatten(readJson(baseFile));
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
  const hangulValues = Object.entries(flat).filter(([, value]) => typeof value === "string" && /[가-힣]/.test(value));

  if (missing.length || extra.length || badQuestionMarks.length || replacementChars.length || hangulValues.length) {
    failures.push({
      fileName,
      missing,
      extra,
      badQuestionMarks: badQuestionMarks.map(([key]) => key),
      replacementChars: replacementChars.map(([key]) => key),
      hangulValues: hangulValues.map(([key]) => key),
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
