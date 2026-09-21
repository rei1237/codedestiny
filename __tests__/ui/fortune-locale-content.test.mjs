import assert from "node:assert/strict";
import test from "node:test";
import { loadTsModule } from "../../scripts/lib/load-ts-module.mjs";

const { SIGN_PROFILES } = loadTsModule("lib/fortune/sign-profiles.ts");
const { getPeriodReading } = loadTsModule("lib/fortune/period-readings.ts");
const { buildPeriodFaqs } = loadTsModule("lib/fortune/period-faqs.ts");
const {
  getLocalizedPeriodReading,
  getLocalizedProfile,
  sajuInsightText,
} = loadTsModule("lib/fortune/localization.ts");
const { formatFortuneEvidence, resolveFortuneMarked } = loadTsModule("lib/fortune/localized-evidence.ts");

const locales = ["en", "ja", "zh-CN", "zh-TW"];
const periods = ["today", "tomorrow", "weekly", "monthly"];
const korean = /[가-힣]/;

test("24개 sign의 4개 기간 해설이 로케일별로 남고 한국어로 되돌아가지 않는다", () => {
  for (const locale of locales) {
    for (const sourceProfile of SIGN_PROFILES) {
      const profile = getLocalizedProfile(sourceProfile, locale);
      const readings = periods.map((period) => getLocalizedPeriodReading(
        profile,
        period,
        locale,
        getPeriodReading(sourceProfile.id, period, sourceProfile.reading),
      ));
      assert.equal(new Set(readings).size, periods.length, `${locale}:${sourceProfile.id} 기간 해설 중복`);
      readings.forEach((reading, index) => {
        const minimumLength = locale === "en" ? 60 : 30;
        assert.ok(reading.length >= minimumLength, `${locale}:${sourceProfile.id}:${periods[index]} 해설이 너무 짧음`);
        assert.doesNotMatch(reading, korean, `${locale}:${sourceProfile.id}:${periods[index]} 한국어 잔존`);
      });
    }
  }
});

test("기간별 FAQ와 띠별 명리 해설이 화면/구조화 데이터에 쓸 수 있는 로케일 문장이다", () => {
  for (const locale of locales) {
    for (const sourceProfile of SIGN_PROFILES) {
      const profile = getLocalizedProfile(sourceProfile, locale);
      const questions = periods.map((period) => {
        const faqs = buildPeriodFaqs(profile, period, locale);
        assert.equal(faqs.length, profile.faqs.length + 1, `${locale}:${profile.id}:${period} FAQ 수`);
        for (const faq of faqs) {
          assert.doesNotMatch(faq.question, korean, `${locale}:${profile.id}:${period} FAQ 질문 한국어 잔존`);
          assert.doesNotMatch(faq.answer, korean, `${locale}:${profile.id}:${period} FAQ 답변 한국어 잔존`);
        }
        return faqs[0].question;
      });
      assert.equal(new Set(questions).size, periods.length, `${locale}:${profile.id} 기간 FAQ 중복`);

      if (sourceProfile.kind === "animal") {
        const insight = sajuInsightText(sourceProfile.id, "한국어 원문", locale);
        assert.ok(insight?.length >= 12, `${locale}:${profile.id} 명리 해설 누락`);
        assert.doesNotMatch(insight, korean, `${locale}:${profile.id} 명리 해설 한국어 잔존`);
      }
    }
  }
});

test("계산 근거의 절기와 날짜가 간체/번체 로케일을 섞지 않는다", () => {
  assert.match(formatFortuneEvidence("2026년 9월 14일 · 경칩", "zh-CN"), /2026.*9.*14.*惊蛰/);
  assert.doesNotMatch(formatFortuneEvidence("2026년 9월 14일 · 경칩", "zh-CN"), /驚蟄|[가-힣]/);
  assert.match(formatFortuneEvidence("2026년 9월 14일 · 경칩", "zh-TW"), /2026.*9.*14.*驚蟄/);
  assert.doesNotMatch(formatFortuneEvidence("2026년 9월 14일 · 경칩", "zh-TW"), /惊蛰|[가-힣]/);
  assert.match(formatFortuneEvidence("2026년 9월 14일 · 경칩", "ja"), /2026.*9.*14.*啓蟄/);
  assert.match(formatFortuneEvidence("2026년 9월 14일 · 경칩", "en"), /Sep.*14.*2026.*Awakening of Insects/);
  const monthly = resolveFortuneMarked({
    key: "fortuneTpl.monthlyNarrative",
    vars: {
      year: "2026",
      month: "9",
      monthGanji: "丁酉",
      termText: "백로(2026-09-07) → 추분(2026-09-23)",
      sign: "Aries",
    },
  }, "", "en");
  assert.match(monthly, /White Dew.*Autumn Equinox/);
  assert.doesNotMatch(monthly, korean);
});

test("달 위상은 정밀한 원본 식별자를 한 번만 번역한다", () => {
  const cases = [
    ["New moon / 신월", "New moon", "新月", "新月", "新月"],
    ["Waxing crescent / 초현", "Waxing crescent", "満ちていく三日月", "盈眉月", "盈眉月"],
    ["First quarter / 상현", "First quarter", "上弦の月", "上弦月", "上弦月"],
    ["Waxing gibbous / 상현", "Waxing gibbous", "満月に向かう月（上弦後）", "盈凸月", "盈凸月"],
    ["Full moon / 보름", "Full moon", "満月", "满月", "滿月"],
    ["Waning gibbous / 하현", "Waning gibbous", "欠けていく月（下弦前）", "亏凸月", "虧凸月"],
    ["Last quarter / 하현", "Last quarter", "下弦の月", "下弦月", "下弦月"],
    ["Waning crescent / 그믐", "Waning crescent", "欠けていく三日月", "残月", "殘月"],
  ];
  for (const [source, ...expected] of cases) {
    ["en", "ja", "zh-CN", "zh-TW"].forEach((locale, index) => {
      assert.equal(formatFortuneEvidence(source, locale), expected[index]);
      assert.equal(formatFortuneEvidence(source.split(" / ")[0], locale), expected[index]);
    });
    assert.equal(formatFortuneEvidence(source, "ko"), source);
  }
  assert.equal(formatFortuneEvidence("Moon phase unavailable", "ja"), "Moon phase unavailable");
  assert.equal(formatFortuneEvidence("Waxing gibbous / 123.45°", "ja"), "Waxing gibbous / 123.45°");
  assert.equal(formatFortuneEvidence("A Full moon reading", "ja"), "A Full moon reading");
});
