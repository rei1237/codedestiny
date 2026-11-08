import { build } from "esbuild";
import { writeFile, readFile } from "node:fs/promises";
import { businessProducts } from "../lib/business-api/products.mjs";
const bundle = await build({
  stdin: {
    resolveDir: process.cwd(),
    contents: `
    export {calculate} from './worker/business-api/calculate.js';
    export {calculateZiweiChart} from './app/_lib/ziwei-engine.ts';
    export {calculateNatalSaju} from './lib/korean-calendar/index.js';
  `,
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  tsconfig: "tsconfig.json",
});
const { calculate, calculateZiweiChart, calculateNatalSaju } = await import(
  "data:text/javascript;base64," +
    Buffer.from(bundle.outputFiles[0].contents).toString("base64")
);
const examples = {};
for (const p of businessProducts)
  if (p.input) examples[p.slug] = await calculate(p.slug, p.input);
const path = "lib/business-api/examples.json";
const expected = JSON.stringify(examples, null, 2) + "\n";
if (process.argv.includes("--check")) {
  const { deepStrictEqual } = await import("node:assert/strict");
  const saju = businessProducts.find((p) => p.slug === "saju");
  deepStrictEqual(
    examples.saju.pillars,
    calculateNatalSaju(saju.input).pillars,
  );
  const birth = businessProducts.find((p) => p.slug === "ziwei").input;
  const [birthYear, birthMonth, birthDay] = birth.birthDate
    .split("-")
    .map(Number);
  const [birthHour, birthMinute] = birth.birthTime.split(":").map(Number);
  const chart = calculateZiweiChart({
    birthYear,
    birthMonth,
    birthDay,
    birthHour,
    birthMinute,
    gender: birth.gender,
    timezone: "Asia/Seoul",
  });
  deepStrictEqual(examples.ziwei, {
    mingGong: chart.mingGong,
    shenGong: chart.shenGong,
    palaces: chart.palaces.map((p) => ({
      name: p.name,
      branch: p.branch,
      stars: p.allStars.map((s) => s.name),
    })),
  });
  if ((await readFile(path, "utf8")).replaceAll("\r\n", "\n") !== expected)
    throw Error("응답 예시와 엔진 결과가 다릅니다.");
} else await writeFile(path, expected);
