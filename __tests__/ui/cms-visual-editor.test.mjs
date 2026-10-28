import test from "node:test";
import assert from "node:assert/strict";
import { applyDetailCopy, detailCopyRecord, safeDetailImage } from "../../lib/cms/detail-copy.mjs";
import { splitPublishedCms } from "../../scripts/fetch-published-cms.mjs";
import { loadTsModule } from "../../scripts/lib/load-ts-module.mjs";
import { renderFeatureDetailPanels } from "../../js/feature-detail-panels.mjs";
import { readFileSync } from "node:fs";

const { visualFields, replaceVisualField, safePreviewPath, matchesCopy, mergeCopy, prefersResultCopy } = loadTsModule("app/admin/cms/_lib/visual-fields.ts");
const catalog = JSON.parse(readFileSync(new URL("../../lib/marketing/feature-visual-details.generated.json", import.meta.url)));
const original = catalog.items["new-year-ai"];

test("detail copy reaches the real renderer without changing billing, identity or navigation", () => {
  const edited = applyDetailCopy(original, {
    description: { text: "올해의 일과 관계를 살펴봅니다." },
    "crafted/0/panels/0/src": { text: "/images/replacement.webp" },
    "crafted/0/priceKRW": { text: "1" },
    featureKey: { text: "free" },
    href: { text: "/other/" },
    "__proto__/polluted": { text: "yes" },
  });
  assert.equal(edited.description, "올해의 일과 관계를 살펴봅니다.");
  assert.equal(edited.featureKey, original.featureKey);
  assert.equal(edited.href, original.href);
  assert.equal(edited.crafted[0].priceKRW, original.crafted[0].priceKRW);
  assert.equal(edited.crafted[0].panels[0].variants, undefined);
  assert.ok(renderFeatureDetailPanels(edited).includes("/images/replacement.webp"));
  assert.ok(renderFeatureDetailPanels(edited).includes("올해의 일과 관계를 살펴봅니다."));
  assert.notEqual(original.description, edited.description);
  assert.equal({}.polluted, undefined);
});

test("image edits reject scripts, external trackers and network-path references", () => {
  for (const url of ["javascript:alert(1)", "//evil.test/a.png", "/\\evil.test/a.png", "https://evil.test/a.png", "https://x@assets.code-destiny.com/a.png"]) {
    assert.equal(safeDetailImage(url), false);
    assert.equal(applyDetailCopy(original, { image: { text: url } }).image, original.image);
  }
  assert.equal(safeDetailImage("https://assets.code-destiny.com/new.webp"), true);
});

test("nested static readings and novel beats preserve every sibling and speaker", () => {
  const values = { record: { wood: { strength: "기존 장점", advice: "기존 조언" } }, beats: { "0": "첫 대사", "1": "둘째 대사" }, beatSpeakers: { "0": "yeon" } };
  const fields = visualFields(values);
  assert.equal(fields.some((field) => field.path[0] === "beatSpeakers"), false);
  const edited = replaceVisualField(values, ["record", "wood", "strength"], "새 장점");
  assert.equal(edited.record.wood.advice, "기존 조언");
  assert.deepEqual(edited.beats, values.beats);
  assert.equal(values.record.wood.strength, "기존 장점");
  assert.ok(Object.keys(detailCopyRecord(original)).length > 10);
});

test("preview accepts same-origin public paths only", () => {
  for (const path of ["https://evil.test", "/admin/cms", "/api/admin/cms", "/checkout", "/records/", "/yeongnyangi/library/"]) {
    assert.equal(safePreviewPath(path, "https://code-destiny.com"), null);
  }
  assert.equal(safePreviewPath("/ggulggul/?action=saju#result", "https://code-destiny.com"), "/ggulggul/?action=saju#result");
});

test("build snapshot separates novels and rejects runtime prompts or invalid exports", () => {
  const output = splitPublishedCms({ ok: true, version: 1, entries: { "light-novel": { prologue: { beats: { "0": "새 대사" } } }, "feature-detail": { sample: { record: {} } } } });
  assert.equal(output.episodes.prologue.beats["0"], "새 대사");
  assert.ok(output.entries["feature-detail"]);
  assert.equal(output.entries["light-novel"], undefined);
  assert.throws(() => splitPublishedCms({ ok: true, version: 1, entries: { "prompt.system": {} } }));
  assert.throws(() => splitPublishedCms({ ok: false }));
});

test("search finds unedited nested Korean copy regardless of spaces, case or line breaks", () => {
  assert.equal(matchesCopy("마음의간격", {record: {love: {text: "마음의  간격을\n존중하세요."}}}), true);
  assert.equal(matchesCopy("TAROT 조언", "tarot", {text: "선택을 위한 조언"}), true);
  assert.equal(matchesCopy("없는 문장", {text: "마음의 간격"}), false);
});

test("partial published and local records preserve default siblings and arrays", () => {
  const base = {record: {wood: {strength: "기존 장점", advice: "기존 조언"}, water: {text: "수기운"}}, items: ["A", "B"]};
  const merged = mergeCopy(base, {record: {wood: {strength: "저장한 장점"}}}, {record: {wood: {advice: "브라우저 조언"}}, items: ["C"]});
  assert.deepEqual(merged.record, {wood: {strength: "저장한 장점", advice: "브라우저 조언"}, water: {text: "수기운"}});
  assert.deepEqual(merged.items, ["C"]);
  assert.equal(base.record.wood.advice, "기존 조언");
  mergeCopy({}, JSON.parse('{"__proto__":{"polluted":true}}'));
  assert.equal({}.polluted, undefined);
});

test("conditional result groups open all their configured sentences", () => {
  for (const ns of ["saju-reading", "ziwei-deep", "vedic-reading", "sukuyo-mansion", "daily-fortune"]) assert.equal(prefersResultCopy(ns), true);
  assert.equal(prefersResultCopy("feature-detail"), false);
});
