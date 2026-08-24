/**
 * 작명 프롬프트의 로케일 분기 가드.
 *
 * 🔴 이 스위트가 지키는 것은 두 가지다.
 *   1. ko 프롬프트가 로케일 분기 도입 전과 **바이트 단위로 같다**. 골든 스냅샷으로만 증명된다 —
 *      정적 grep 은 조립 결과가 같은지 알 수 없다.
 *   2. 12개 로케일이 **전부** 프로파일을 갖는다. 로케일을 추가하고 프로파일을 빠뜨리면
 *      조용히 ko 로 떨어져 한국어 리포트가 나가므로, 목록을 손으로 적지 않고 전수 검사한다.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { buildGeneratedPrompt } from "../../worker/routes/naming-prompt.js";
import { parseNamingResultCards } from "../../worker/lib/naming-result-cards.js";
import { AI_OUTPUT_FALLBACK, AI_OUTPUT_LOCALES, buildOutputLanguageDirective } from "../../lib/i18n/ai-locale.js";
import {
  NAMING_DEFAULT_LOCALE,
  NAMING_LOCALES,
  NAMING_LOCALE_PROFILES,
  normalizeNamingLocale,
  resolveNamingLocaleProfile,
} from "../../worker/lib/naming-locale-profile.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const GOLDEN = join(HERE, "__fixtures__", "naming-prompt.ko.golden.txt");

const INPUT = Object.freeze({
  gender: "F",
  birthDate: "2026-03-14",
  birthTime: "09:20",
  birthTimeUnknown: false,
  calendarType: "solar",
  isLeapMonth: false,
  birthPlace: "대한민국 서울",
  timezone: "Asia/Seoul",
  familyName: "김",
  nameLength: 2,
  desiredType: "신생아 이름",
  currentName: "",
  desiredSyllables: ["서"],
  requiredSyllables: [],
  blockedSyllables: ["철"],
  preferredImage: ["단정함"],
  preferredStyle: "단정하고 부르기 쉬운",
  useHanja: true,
  generationNameRule: "",
  siblingHarmony: "",
  avoidFamilyNames: "",
  desiredNames: [{ hangul: "서윤", hanjaCandidates: ["瑞潤"], note: "" }],
  memo: "",
});

const SAJU = Object.freeze({
  source: "destiny-bias-engine",
  engineVersion: "test",
  sajuEvidenceHash: "TESTHASH",
  yearPillar: "丙午", monthPillar: "辛卯", dayPillar: "甲子", hourPillar: "己巳",
  dayMaster: "甲", monthCommand: "卯",
  fiveElementBalance: "木2 火2 土2 金1 水1",
  tenGodBalance: "비견1 식신2 재성2 관성2 인성1",
  strengthAnalysis: "신강",
  temperatureBalance: "조후 보통",
  eokbuYongshin: "金", johuYongshin: "水", finalYongshin: "金",
  supportiveGodCandidates: "土", eokbuKijishin: "木", johuKijishin: "火",
  finalKijishin: "木", jongAnalysis: "종격 특이 신호 없음",
  usefulGodCandidates: "金", unfavorableGodCandidates: "木",
  recommendedNameElements: "金·土", avoidNameElements: "木·火",
});

describe("작명 프롬프트 로케일 분기", () => {
  test("ko 프롬프트는 분기 도입 전과 바이트 단위로 같다", () => {
    const golden = readFileSync(GOLDEN, "utf8");
    expect(buildGeneratedPrompt(INPUT, SAJU, "ko")).toBe(golden);
  });

  test("로케일을 안 넘기면 ko 로 떨어진다 — 조용히 영어로 새지 않는다", () => {
    expect(NAMING_DEFAULT_LOCALE).toBe("ko");
    expect(buildGeneratedPrompt(INPUT, SAJU)).toBe(buildGeneratedPrompt(INPUT, SAJU, "ko"));
    expect(buildGeneratedPrompt(INPUT, SAJU, "kl-KL")).toBe(buildGeneratedPrompt(INPUT, SAJU, "ko"));
  });

  test("12개 로케일이 전부 프로파일을 갖는다", () => {
    // 손으로 적은 목록이 아니라 NAMING_LOCALES 전수. 로케일을 늘리고 프로파일을 빠뜨리면 여기서 죽는다.
    const missing = NAMING_LOCALES.filter((locale) => !NAMING_LOCALE_PROFILES[locale]);
    expect(missing).toEqual([]);
    expect(Object.keys(NAMING_LOCALE_PROFILES).sort()).toEqual([...NAMING_LOCALES].sort());
  });

  test("프로파일마다 프롬프트가 참조하는 필드가 전부 채워져 있다", () => {
    const REQUIRED = [
      "id", "language", "persona", "society", "nameLayers", "layerTiebreak",
      "genderScope", "genderAvoid", "legalCharRule", "modernBalanceRule", "uncertaintyRule",
      "principleAxes", "finalExample", "avoidAxes", "criteriaHeading", "criteriaBody", "promptContract",
      "candidateAxes", "candidateHeading", "candidateItems", "registrationChapter",
    ];
    for (const locale of NAMING_LOCALES) {
      const profile = NAMING_LOCALE_PROFILES[locale];
      for (const field of REQUIRED) {
        expect([locale, field, typeof profile[field]]).not.toEqual([locale, field, "undefined"]);
      }
      expect(typeof profile.promptContract).toBe("string");
    }
  });

  test("🔴 출력 언어 지시문을 프롬프트가 다시 넣지 않는다 — 이미 파이프가 두 번 넣는다", () => {
    // worker/index.js runWithAiLocale → gemini.js getAmbientAiLocale → llm-client applyOutputLocale 이
    // systemPrompt 와 프롬프트 꼬리 양쪽에 지시문을 붙인다. 여기서 또 붙이면 같은 지시가 세 번 간다.
    for (const locale of NAMING_LOCALES) {
      const prompt = buildGeneratedPrompt(INPUT, SAJU, locale);
      expect([locale, prompt.includes("[OUTPUT LANGUAGE — HIGHEST PRIORITY]")]).toEqual([locale, false]);
      const directive = buildOutputLanguageDirective(locale);
      if (directive) expect([locale, prompt.includes(directive)]).toEqual([locale, false]);
    }
  });

  test("비-ko 로케일에는 작명첩 구조 계약이 붙고, ko 는 붙지 않는다", () => {
    // 언어가 바뀌어도 고정이어야 하는 둘: 장 번호와 카드 라벨. 둘 다 화면이 기계로 읽는다.
    expect(buildGeneratedPrompt(INPUT, SAJU, "ko")).not.toContain("NAMING BOOKLET CONTRACT");
    for (const locale of NAMING_LOCALES.filter((item) => item !== "ko")) {
      const prompt = buildGeneratedPrompt(INPUT, SAJU, locale);
      expect(prompt).toContain("[NAMING BOOKLET CONTRACT");
      expect(prompt).toContain('Keep the chapter numbering "## 1."');
      expect(prompt).toContain("Keep the name-card block labels");
    }
  });

  test("로케일 목록과 기본값이 AI 출력 정본과 갈리지 않는다", () => {
    // 두 목록이 갈라지면 새 로케일이 조용히 ko 프로파일로 떨어져 한국어 작명첩을 받는다.
    expect([...NAMING_LOCALES]).toEqual([...AI_OUTPUT_LOCALES]);
    expect(NAMING_DEFAULT_LOCALE).toBe(AI_OUTPUT_FALLBACK);
  });

  test("획수 체계가 없는 로케일에는 한국식 수리가 새어 나오지 않는다", () => {
    // 라틴 계열에 원형이정·81수리가 들어가면 없는 근거를 권위 있게 말하게 된다.
    // 🔴 "쓰지 마세요" 같은 금지 문장에는 그 낱말이 나와야 정상이므로, 낱말의 유무가 아니라
    //    **그 낱말이 놓인 줄이 금지문인지**를 본다. 금지문이 아닌 자리에 나오면 실패다.
    const KOREAN_ONLY = ["원형이정", "원격", "형격", "이격", "정격", "인명용 한자", "대법원", "81수리"];
    const FORBIDS = /쓰지 마세요|적용하지 않습니다|없습니다|들지 마세요/;
    for (const locale of ["en", "es", "fr", "de", "nl", "ms", "vi", "hi"]) {
      const prompt = buildGeneratedPrompt(INPUT, SAJU, locale);
      for (const line of prompt.split("\n")) {
        const hit = KOREAN_ONLY.filter((marker) => line.includes(marker));
        if (!hit.length) continue;
        expect([locale, hit.join(","), FORBIDS.test(line)]).toEqual([locale, hit.join(","), true]);
      }
      expect(prompt).toContain("획수 수리는 적용하지 않습니다");
      // 서구식 수비학으로 갈아 끼우는 것도 막는다 — 계보가 다른 숫자가 권위 있게 보인다.
      expect(prompt).toContain("수비학");
    }
  });

  test("CJK 로케일은 자기 문화권의 격 체계를 쓴다", () => {
    const ja = buildGeneratedPrompt(INPUT, SAJU, "ja");
    expect(ja).toContain("姓名判断 五格");
    expect(ja).toContain("人名用漢字");
    expect(ja).not.toContain("원형이정");
    expect(ja).not.toContain("대법원");

    for (const locale of ["zh-CN", "zh-TW"]) {
      const prompt = buildGeneratedPrompt(INPUT, SAJU, locale);
      expect(prompt).toContain("三才五格");
      expect(prompt).toContain("谐音");
      expect(prompt).not.toContain("원형이정");
      expect(prompt).not.toContain("대법원");
    }
    // 간체/번체는 글자 표준이 다르므로 같은 프롬프트가 나오면 분기가 죽은 것이다.
    expect(buildGeneratedPrompt(INPUT, SAJU, "zh-CN")).not.toBe(buildGeneratedPrompt(INPUT, SAJU, "zh-TW"));
  });

  test("카드 블록 라벨은 어떤 출력 언어에서도 한국어로 남고, 예시가 실제로 파싱된다", () => {
    // 🔴 라벨은 파서의 키다. 본문을 일본어로 쓰라고 지시하면 모델이 라벨까지 번역하기 쉬운데,
    //    그러면 parseNamingResultCards 가 조용히 빈 결과를 내고 이름 카드 UI 가 사라진다.
    //    계약문의 예시를 그대로 파서에 통과시켜, 라벨이 실제로 읽히는지 로케일마다 확인한다.
    // 🔴 프롬프트 전체를 그대로 넘긴다. 파서는 블록 앞에 본문이 있어야 결과를 돌려주므로
    //    (cleanText 가 비면 강등) 블록만 잘라 넣으면 통과할 수 있는 테스트가 헛돈다.
    for (const locale of NAMING_LOCALES) {
      const parsed = parseNamingResultCards(buildGeneratedPrompt(INPUT, SAJU, locale));
      expect([locale, parsed.cards.length > 0]).toEqual([locale, true]);
      expect([locale, parsed.finalPick !== null]).toEqual([locale, true]);
      expect([locale, parsed.cards[0].name.length > 0]).toEqual([locale, true]);
    }
  });

  test("비-ko 계약문은 라벨을 번역하지 말라고 명시한다", () => {
    for (const locale of NAMING_LOCALES.filter((item) => item !== "ko")) {
      const prompt = buildGeneratedPrompt(INPUT, SAJU, locale);
      expect(prompt).toContain("한국어 그대로 두세요");
      expect(prompt).toContain("이름 카드가 화면에서 사라집니다");
    }
  });

  test("로케일 표기 변형을 접는다", () => {
    expect(normalizeNamingLocale("zh")).toBe("zh-CN");
    expect(normalizeNamingLocale("zh_CN")).toBe("zh-CN");
    expect(normalizeNamingLocale("zh-Hans")).toBe("zh-CN");
    expect(normalizeNamingLocale("zh-Hant")).toBe("zh-TW");
    expect(normalizeNamingLocale("zh-HK")).toBe("zh-TW");
    expect(normalizeNamingLocale("en-US")).toBe("en");
    expect(normalizeNamingLocale("ja-JP")).toBe("ja");
    expect(normalizeNamingLocale("")).toBe("ko");
    expect(normalizeNamingLocale(null)).toBe("ko");
    expect(resolveNamingLocaleProfile("pt-BR").id).toBe("ko");
  });
});
