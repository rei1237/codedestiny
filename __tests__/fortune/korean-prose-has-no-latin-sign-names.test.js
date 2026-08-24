/**
 * 한국어 운세 문장에 영어 궁 이름이 새지 않는지 지킨다.
 *
 * 사고 이력: 일일 패키지의 `sky_today.moon_sign` 은 "Virgo" 처럼 **영어로만** 온다.
 * 그 값을 한국어 템플릿에 그대로 끼워 `달은 Capricorn 자리를 지납니다` 가 화면에 나갔다
 * (2026-08-24 발견, 두 곳: build-view.ts 의 narrative, day-relation.ts 의 neutral detail).
 *
 * 이 테스트는 렌더 결과가 아니라 **소스의 템플릿 리터럴**을 본다. 렌더는 날짜에 따라
 * 달의 궁이 바뀌어서 그날의 값이 우연히 안 걸릴 수 있기 때문이다.
 */
const { readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");

const DIR = join(__dirname, "..", "..", "lib", "fortune");

/** 12궁의 영어 이름. 한국어 문장 안에 이 낱말이 있으면 누수다. */
const LATIN_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

/** 한글이 들어 있는 백틱 템플릿 리터럴만 뽑는다. */
function koreanTemplates(source) {
  const out = [];
  for (const m of source.matchAll(/`(?:[^`\\]|\\.)*`/g)) {
    if (/[가-힣]/.test(m[0])) out.push(m[0]);
  }
  return out;
}

describe("한국어 운세 문장에 라틴 궁 이름 없음", () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".ts"));

  it("검사 대상 파일이 있다", () => {
    // 대상이 0개면 통과시키는 가드는 가드가 아니다.
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file} — 한글 템플릿에 영어 궁 이름이 없다`, () => {
      const source = readFileSync(join(DIR, file), "utf8");
      const offenders = [];
      for (const tpl of koreanTemplates(source)) {
        for (const sign of LATIN_SIGNS) {
          if (new RegExp(`\\b${sign}\\b`).test(tpl)) offenders.push(`${sign} ← ${tpl.slice(0, 90)}`);
        }
      }
      expect(offenders).toEqual([]);
    });
  }
});
