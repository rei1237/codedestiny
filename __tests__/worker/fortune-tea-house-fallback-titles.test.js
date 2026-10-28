/**
 * @jest-environment node
 *
 * 운명 찻집 사주: 결정론 폴백 deepSections 제목이 검증기의 필수 제목을 빠짐없이 덮는지,
 * 검증기가 생성기와 같은 카테고리 규칙으로 검사하는지 고정한다. LLM 호출 없음.
 */

let utils;

beforeAll(async () => {
  ({ __fortuneTeaHouseTestUtils: utils } = await import("../../worker/routes/fortune-tea-house.js"));
});

const BASE = {
  consultationMode: "saju",
  nickname: "손님",
  birthDate: "1990-05-05",
  birthTime: "10:30",
  selectedTeaCupName: "오늘의 찻잔",
  selectedTeaCupTopic: "오늘의 마음",
  question: "요즘 마음이 자꾸 복잡해지는 이유가 궁금해요",
};
const CUPS = ["lotus-moon", "honey-peach", "star-black-tea", "gold-cinnamon", "white-lotus-healing", "black-moon-brown-rice"];
const CASES = [
  ["general", { ...BASE, selectedTeaCupId: "plain-cup" }],
  ["general + 질문 카테고리(annual)", { ...BASE, selectedTeaCupId: "plain-cup", questionCategory: "annual" }],
  ...CUPS.map((id) => [id, { ...BASE, selectedTeaCupId: id }]),
  ["sajuCompatibility", { ...BASE, consultationMode: "sajuCompatibility", selectedTeaCupId: "plain-cup" }],
];

test.each(CASES)("%s: 폴백 제목이 필수 제목을 모두 덮는다", (_, request) => {
  const required = utils.getSajuRequiredSectionTitles(request);
  const titles = utils.buildFallbackSajuDeepSections(request).map((section) => section.title);
  expect(required.length).toBeGreaterThanOrEqual(11);
  expect(required.filter((title) => !titles.includes(title))).toEqual([]);
});

test("general 폴백은 필수 제목 순서를 따른다", () => {
  const request = CASES[0][1];
  expect(utils.buildFallbackSajuDeepSections(request).map((section) => section.title))
    .toEqual(utils.getSajuRequiredSectionTitles(request));
});

test.each([
  ["고른 잔(직업운)과 질문 카테고리(love)가 다를 때", { ...BASE, selectedTeaCupId: "star-black-tea", questionCategory: "love" }],
  ["질문 문장으로만 카테고리(annual)가 정해질 때", { ...BASE, selectedTeaCupId: "gold-cinnamon", question: "올해 총운이 궁금해요" }],
])("%s 검증기는 생성기와 같은 규칙으로 검사한다", (_, request) => {
  const fallback = utils.normalizeDraftResult({}, request);
  expect(utils.resolveSajuCategoryRule(fallback).id).toBe(utils.resolveSajuCategoryRule(request).id);
  const titles = fallback.saju.deepSections.map((section) => section.title);
  expect(utils.getSajuRequiredSectionTitles(fallback).filter((title) => !titles.includes(title))).toEqual([]);
});

test("사주 궁합 상세 안내의 목차는 실제 상담지 섹션 제목과 같다", () => {
  const fs = require("node:fs");
  const required = utils.getSajuRequiredSectionTitles(CASES.at(-1)[1]);
  const sources = [
    require("../../content/product-details/tea-saju-compat/panels.cjs"),
    ...["content/product-details", "public/feature-details/crafted"].map((dir) => JSON.parse(fs.readFileSync(`${dir}/tea-saju-compat/manifest.json`, "utf8"))),
  ];
  for (const source of sources) expect(source.chapters.map((chapter) => chapter.title)).toEqual(required);
});
