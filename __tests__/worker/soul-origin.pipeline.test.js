/**
 * @jest-environment node
 */

import fs from "node:fs";
import path from "node:path";

function read(relPath) {
  const abs = path.resolve(process.cwd(), relPath);
  return fs.readFileSync(abs, "utf8");
}

describe("soul-origin pipeline source contracts", () => {
  test("프론트 payload는 input/birthInput만 사용하고 금지 필드를 보내지 않아야 한다", () => {
    const source = read("js/soul-origin-book.js");
    expect(source.includes("input: input,")).toBe(true);
    expect(source.includes("birthInput: input,")).toBe(true);
    expect(source.includes("readPrayerIntent(")).toBe(false);
    expect(source.includes("engineSnapshots")).toBe(false);
    expect(source.includes("prayerTopic")).toBe(false);
    expect(source.includes("currentConcern")).toBe(false);
    expect(source.includes("desiredOutcome")).toBe(false);
    expect(source.includes("partnerInfo")).toBe(false);
    expect(source.includes("partnerBirthDate")).toBe(false);
    expect(source.includes("partnerBirthTime")).toBe(false);
  });

  test("프론트는 출생시간 미입력 시 즉시 차단해야 한다", () => {
    const source = read("js/soul-origin-book.js");
    expect(source.includes("if (!time || !Number.isFinite(time.hour)) return null;")).toBe(true);
    expect(source.includes("태어난 시간이 필요합니다")).toBe(true);
    expect(source.includes("time = { hour: 12, minute: 0 };")).toBe(false);
  });

  test("서버는 birthInput 기반 5개 로컬 엔진 seed를 생성해야 한다", () => {
    const source = read("worker/routes/soul-origin.js");
    expect(source.includes("const normalizedBirth = normalizeBirthInput(body?.birthInput || body?.input || {});")).toBe(true);
    expect(source.includes("seed.saju = calculateSajuLocal(birthInput);")).toBe(true);
    expect(source.includes("seed.ziwei = calculateZiweiLocal(birthInput);")).toBe(true);
    expect(source.includes("seed.astrology = calculateAstrologyLocal(birthInput);")).toBe(true);
    expect(source.includes("seed.vedic = calculateVedicLocal(birthInput);")).toBe(true);
    expect(source.includes("seed.sukyo = calculateSukyoLocal(birthInput);")).toBe(true);
  });

  test("운명의 업은 프로필 카드 location.label 출생지를 PDF payload까지 유지해야 한다", () => {
    const front = read("js/soul-origin-book.js");
    const worker = read("worker/routes/soul-origin.js");
    expect(front.includes("function resolveSoulOriginBirthPlace(profile, fallbackProfile)")).toBe(true);
    expect(front.includes("resolveSoulOriginBirthPlace(profile, storageProfile)")).toBe(true);
    expect(front.includes("resolveSoulOriginBirthPlace(src) || '대한민국'")).toBe(true);
    expect(worker.includes("const location = src.location && typeof src.location === \"object\" ? src.location : {};")).toBe(true);
    expect(worker.includes("|| location.label")).toBe(true);
    expect(worker.includes("birthPlace,")).toBe(true);
  });

  test("서버 응답과 archive는 열람 URL 필드를 포함해야 한다", () => {
    const source = read("worker/routes/soul-origin.js");
    expect(source.includes("pdfReady")).toBe(true);
    expect(source.includes("pdfUrl:")).toBe(true);
    expect(source.includes("htmlUrl:")).toBe(true);
    expect(source.includes("canReopen: true")).toBe(true);
    expect(source.includes("canDownload: true")).toBe(true);
    expect(source.includes("archive: {")).toBe(true);
    expect(source.includes("localSeed,")).toBe(true);
  });

  test("운명의 업 챕터는 고정 12개 구조를 유지해야 한다", () => {
    const source = read("worker/routes/soul-origin.js");
    const chapterIdMatches = source.match(/id:\s*"\d{2}"/g) || [];
    const chapterTitleMatches = source.match(/title:\s*"제\s*\d+장\./g) || [];
    const categoryKeyMatches = source.match(/categories:\s*\[/g) || [];
    expect(chapterIdMatches.length).toBeGreaterThanOrEqual(12);
    expect(chapterTitleMatches.length).toBeGreaterThanOrEqual(12);
    expect(categoryKeyMatches.length).toBeGreaterThanOrEqual(12);
    expect(source.includes("질문하신 내용은")).toBe(false);
    expect(source.includes("상대방은")).toBe(false);
    expect(source.includes("상대의 생년월일")).toBe(false);
  });
});
