/**
 * 🔴 작명첩 장 분할 가드.
 *
 * 작명 프롬프트는 출력 언어를 로케일별로 바꾸되 장 번호(## N.)는 고정하라고 지시한다.
 * 그래서 비-ko 응답에는 한국어 제목 키워드가 없다. 그때 numberedHeadings 폴백이 없으면
 * parseAssistantSections 가 **문단 개수로 균등 분할**해 버려서, 내용이 엉뚱한 장 제목 아래로
 * 들어간 채 아무 에러 없이 렌더된다. 이 스위트는 그 조용한 오배치를 막는다.
 */
import fs from "node:fs";
import path from "node:path";
import { parseAssistantSections } from "../../lib/llm-text.js";

const KO_TITLES = [
  "작명가의 총평", "사주 풀이와 용신 검증", "이 아이의 작명 원칙", "이름 후보 상세",
  "세 이름을 나란히 놓고", "최종 추천", "피해야 할 이름", "이름을 올리기 전에",
];
const KEYWORDS = /작명가의 총평|사주 풀이|작명 원칙|이름 후보 상세|나란히 놓고|최종 추천|피해야 할 이름|올리기 전에/;
const OPTIONS = { titleKeywords: KEYWORDS, fallbackTitles: KO_TITLES, minHeadings: 5, numberedHeadings: true };

// 🔴 본문에 장 제목을 되풀이하지 않는다 — 헤딩 패턴은 "짧은 줄 + 빈 줄"이면 본문에도 걸리므로,
//    제목을 본문에 넣으면 경계가 붙어 빈 본문이 되고 섹션이 통째로 걸러진다(실제 응답과 다른 상황).
const booklet = (titles) =>
  titles.map((title, index) => `## ${index + 1}. ${title}\n\nThis is the body paragraph for section ${index + 1}, long enough to survive the split and unique per chapter.`).join("\n\n");

describe("parseAssistantSections — 번호 헤딩 폴백", () => {
  test("한국어 응답은 키워드 경로로 그대로 갈린다", () => {
    const sections = parseAssistantSections(booklet(KO_TITLES), OPTIONS);
    expect(sections).toHaveLength(8);
    expect(sections[0].title).toBe("작명가의 총평");
    expect(sections[7].title).toBe("이름을 올리기 전에");
  });

  test("일본어 응답도 8장으로 갈리고 제목이 응답의 것으로 남는다", () => {
    const ja = ["命名家の総評", "四柱の読み解きと用神の検証", "この子のための命名原則", "名前候補の詳細",
      "三つの名前を並べて", "最終のおすすめ", "避けたい名前", "名前を届け出る前に"];
    const sections = parseAssistantSections(booklet(ja), OPTIONS);
    expect(sections).toHaveLength(8);
    expect(sections.map((section) => section.title)).toEqual(ja);
  });

  test("영어 응답도 마찬가지다", () => {
    const en = ["The namer's overall reading", "Your chart, and the favourable element verified",
      "The naming principles for this child", "The candidate names in detail", "Three names side by side",
      "The final recommendation", "Names to avoid", "Before you register the name"];
    const sections = parseAssistantSections(booklet(en), OPTIONS);
    expect(sections).toHaveLength(8);
    expect(sections.map((section) => section.title)).toEqual(en);
  });

  test("🔴 폴백을 끄면 문단 균등 분할로 떨어져 제목과 내용이 어긋난다", () => {
    // 이 테스트가 존재하는 이유 — 폴백을 빼면 에러 없이 "그럴듯하게" 잘못 렌더된다.
    const ja = ["命名家の総評", "四柱の読み解き", "命名原則", "名前候補", "三つの名前", "最終のおすすめ", "避けたい名前", "届け出の前に"];
    const without = parseAssistantSections(booklet(ja), { ...OPTIONS, numberedHeadings: false });
    expect(without.map((section) => section.title)).toEqual(KO_TITLES);
    expect(without[0].body).not.toBe(parseAssistantSections(booklet(ja), OPTIONS)[0].body);
  });

  test("번호 헤딩이 최소 개수에 못 미치면 폴백하지 않는다", () => {
    const short = "## 1. はじめに\n\n本文。\n\n## 2. まとめ\n\n本文。";
    const sections = parseAssistantSections(short, OPTIONS);
    expect(sections.map((section) => section.title)).toEqual(KO_TITLES.slice(0, sections.length));
  });
});

/**
 * 🔴 위 폴백은 모델이 "## N." 번호를 지켰을 때만 듣는다. 번호를 흘린 비-ko 응답은 그대로
 *    문단 균등 분할로 떨어졌다 — 그래서 로케일별 제목 패턴을 1차 그물로 두었다.
 *    여기서는 소스에 적힌 패턴을 그대로 꺼내 **실제 파서에 통과시켜** 확인한다
 *    (docs/handoff/locale-service-optimization-2026-08-25.md "기계 계약" 항목의 확인 방법).
 */
describe("로케일별 장 제목 패턴 — 번호 없는 응답도 잡는다", () => {
  // 이 스위트는 ESM 이라 __dirname 이 없다. jest 의 roots 는 리포 루트이므로 cwd 기준으로 읽는다.
  const source = fs.readFileSync(
    path.join(process.cwd(), "app/naming-ai/result/resultCopy.ts"),
    "utf8",
  );
  const blockPattern = /chapterTitles:\s*\[([\s\S]*?)\],\s*chapterTitleKeywords:\s*\/((?:[^/\\\n]|\\.)+)\/([a-z]*),/g;
  const locales = [];
  for (let match = blockPattern.exec(source); match; match = blockPattern.exec(source)) {
    locales.push({
      titles: (match[1].match(/"((?:[^"\\]|\\.)*)"/g) || []).map((raw) => JSON.parse(raw)),
      pattern: new RegExp(match[2], match[3]),
    });
  }

  // 🔴 전수 발견 — 하나라도 패턴 없이 남으면 여기서 죽는다(손으로 쓴 목록을 두지 않는다).
  test("모든 장 제목 표에 패턴이 붙어 있다", () => {
    expect(locales.length).toBe((source.match(/chapterTitles:\s*\[/g) || []).length);
    expect(locales.length).toBeGreaterThanOrEqual(5);
  });

  test.each(locales.map((locale, index) => [index, locale]))(
    "로케일 #%i — 번호 없는 헤딩만으로 8장이 갈린다",
    (_index, locale) => {
      const unnumbered = locale.titles
        .map((title, index) => `## ${title}\n\nBody paragraph ${index + 1}, long enough to survive the split.`)
        .join("\n\n");
      const sections = parseAssistantSections(unnumbered, {
        titleKeywords: locale.pattern,
        fallbackTitles: KO_TITLES,
        minHeadings: 5,
        numberedHeadings: true,
      });
      expect(sections).toHaveLength(8);
      expect(sections.map((section) => section.title)).toEqual(locale.titles);
    },
  );
});
