/** @jest-environment node */
// 2026-11-08 판 2 도입 뒤에도 판 1 심화 리포트가 받는 장 프롬프트 바이트는 그대로여야 한다. 판 2는 질문을 1장에서만 다룬다.
import { createHash } from "node:crypto";
import { buildZiweiDeepChapterPrompt, ZIWEI_DEEP_CHAPTERS } from "../../worker/lib/ziwei-deep-report-prompt.mjs";

const sha = (text) => createHash("sha256").update(String(text)).digest("hex");
const chart = { lifePalace: "명궁", bodyPalace: "부부궁", palaces: [{ name: "명궁", mainStars: ["자미"], earthlyBranch: "자", brightness: { 자미: "묘" } }, { name: "재백궁", mainStars: ["무곡"], earthlyBranch: "진" }], fourTransformations: {} };
const birth = { name: "검사", gender: "female", birthDate: "1993-07-21", birthTime: "09:00", calendarType: "solar" };
const QUESTION = "올해 이직을 해도 될까요?";
const consultation = { topic: "직업", question: QUESTION };

it("V1 deep chapter prompt bytes stay identical", () => {
  const hashes = Object.fromEntries(ZIWEI_DEEP_CHAPTERS.map((chapter) => [chapter.id, sha(buildZiweiDeepChapterPrompt(chart, birth, chapter, consultation, "ko"))]));
  hashes["overview:none"] = sha(buildZiweiDeepChapterPrompt(chart, birth, ZIWEI_DEEP_CHAPTERS[0], null, "ko"));
  expect(hashes).toEqual({
    overview: "56804749061ed277fdd2a391adf309eb335ebdf76494f2edb9c8b12c990eadb2", ming: "612b1d745356694cf898a8b9bf942bfcff56632b1378481fbad6f31cfbfb34e1",
    siblings: "de779e4ebe30a2897dbb29d1edcf31875553f7a0d0693aac7cd05b175cba73ba", spouse: "c9942d2b7f9e91a48370b434ee5b0df07f9f914fca062fcd6fdaf6cf9509a3f2",
    children: "8f6de6cf3741689a0018e6ba7d613e9c380d190d909574b6ebf09b7bd09f9160", wealth: "4c4983dc01b7d7df9b330da0703c92fc0b715f9f7421435bf4869158f69c4430",
    health: "142a6629e5fc8049650b466671cd7d54a3cc38e6a9f27dd71e537a1a2fb969a5", travel: "2b7d2bbda577375c47aeb88c6dcf95aecc4e5bfe89c97a273e9c8a49d7040421",
    friends: "485997739b83880e6b5ddd49c823dc3eab5427db911eba5459deb2b6f1e4d680", career: "a4c0129464b05cbc81c5bcbe35c5c34ae037c45af1265edbe1af37f4877c13e3",
    property: "5e7039bbeefcb9d2da8f6dfb76e231db79f369a84eeaba000cf6491ed13cbe7e", fortune: "01826b8b2db930790ad5129b284be7ec823789f2ff224b2a80386594e7f3632c",
    parents: "1d8be4f4fa29ed6e04a37f7922cbcb776402da099bc68d0acce31215faf157e1", sihua: "579fe060d4476596b985a6f6c3d8a6bcd8928d3bab8cc24e1e11ae265a60af8d",
    masterplan: "117a4dcb8ed165218a3951997b78df77ac202d2a0ef3e640ce02cf28c0165f3e", "overview:none": "20b854223f95b2b071ea5b6ecf8f9428baa4c90e5e8cecf64c5702f600b506a6",
  });
});

it("V2 quotes the question only in the first chapter, which opens with innate nature", () => {
  const [overview, ...rest] = ZIWEI_DEEP_CHAPTERS;
  const first = buildZiweiDeepChapterPrompt(chart, birth, overview, consultation, "ko", { planVersion: 2 });
  expect(first).toContain(QUESTION);
  expect(first).toContain("타고난 본성");
  for (const chapter of rest) expect(buildZiweiDeepChapterPrompt(chart, birth, chapter, consultation, "ko", { planVersion: 2 })).not.toContain(QUESTION);
});
