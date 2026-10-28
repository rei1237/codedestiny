// 신년운세 답변 파싱. 서버 구조화 응답과 구버전 조립본(분야 마커 없는 텍스트)을 같은 분야 카드로 되돌린다.
// 이미 결제된 과거 상담이 안 열리는 회귀가 가장 비싼 실패라서 화면 없이 검증할 수 있게 컴포넌트에서 떼어 둔다.
import { extractReadableTextFromJsonLike, looksLikeRawJson } from "@/lib/llm-text";

// 서버가 분야별로 돌려주는 섹션 중 파싱에 쓰는 부분.
type ServerSection = { key: string; text: string };

export function isGenuineCustomQuestion(question: string) {
  const trimmed = question.trim();
  return trimmed.length >= 2;
}

export function splitAssistantSections(content: string) {
  let normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  // 구조화 파싱에 실패한 원시(잘린) JSON은 중괄호째 노출하지 않고 읽을 수 있는 문장만 복원한다.
  if (looksLikeRawJson(normalized)) {
    normalized = extractReadableTextFromJsonLike(normalized);
    if (!normalized) return [];
  }
  // Models may separate a Markdown heading and its first paragraph with a blank line.
  // Keep that heading attached so the question answer is not treated as an unnamed paragraph.
  normalized = normalized.replace(/(^|\n{2,})(\*\*[^*\n]{2,70}\*\*|#{1,3}[^\n]+)\n{2,}(?=\S)/g, "$1$2\n");
  const chunks = normalized.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean);
  return chunks.map((chunk, index) => {
    const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
    const first = lines[0] || "";
    const headingMatch = first.match(/^(?:#{1,3}\s*)?(?:\d+[.)]\s*)?(.{2,42}?)(?:[:：])?$/);
    const hasHeading = Boolean(headingMatch && lines.length > 1 && first.length <= 44);
    return {
      title: hasHeading ? headingMatch?.[1]?.replace(/\*\*/g, "").trim() || `새해 상담 편지 ${index + 1}` : `새해 상담 편지 ${index + 1}`,
      body: hasHeading ? lines.slice(1).join("\n") : chunk,
    };
  });
}

export type ParsedSection = { title: string; body: string };
export type MonthLetter = { ganji: string; keyword: string; body: string };

const QUESTION_ANSWER_TITLE = "질문에 대한 답변";
const MONTH_LETTER_HEADING_RE = /^(\d{1,2})월\s*[·∙・-]\s*(\S+)\s*[·∙・-]\s*(.+)$/;
const CATEGORY_TITLE_PREFIXES = ["연애·재회", "재물·수입", "직업·이직", "건강·멘탈", "가족·관계", "학업·성장"];

// 결과 화면의 네 장짜리 상담 카드. key는 서버 섹션 키(worker/routes/new-year-ai.js의
// NEW_YEAR_AI_SECTIONS)와 같아야 한다 — 구조화 응답이 오면 이 키로 곧장 매칭한다.
// marker는 구버전 세션(llmMeta.sections 없음)에서 조립본을 다시 가를 때 쓰는 굵은 소제목이다.
export const DOMAIN_CARDS: Array<{ key: string; label: string; marker: string; glyph: string; hint: string }> = [
  { key: "opening", label: "타고난 성향과 지금의 마음", marker: "타고난 성향과 지금의 마음", glyph: "命", hint: "나의 강점과 반복되는 부담, 고민을 이해하는 단서" },
  { key: "overview", label: "올해의 총운", marker: "올해의 총운", glyph: "運", hint: "세운이 일간에 만드는 조후와 억부의 변화" },
  { key: "wealth", label: "재물과 직업", marker: "재물과 직업", glyph: "財", hint: "재성·관성의 동태와 움직일 시기" },
  { key: "romance", label: "애정과 대인관계", marker: "애정과 대인관계", glyph: "緣", hint: "귀인과 인연, 조심해야 할 관계" },
  { key: "health", label: "건강과 개운법", marker: "건강과 개운법", glyph: "身", hint: "오행의 쏠림과 실생활 개운법" },
];
const DEFAULT_DOMAIN_KEY = DOMAIN_CARDS[0].key;
// 대기 화면의 진행 단계. 서버 NEW_YEAR_AI_SECTIONS와 같은 순서·같은 수다 — 열두 달 흐름(monthly)은
// 결과에서 분야 카드가 아니라 월별 편지로 보이지만 생성·저장 단위로는 한 섹션이다.
// 안내 문구의 "N개 분야"와 저장 진행 "x/N"의 폴백이 모두 이 길이를 써서 5와 6이 섞이지 않는다.
export const READING_STEPS: Array<{ key: string; label: string; glyph: string }> = [
  ...DOMAIN_CARDS.filter((card) => card.key !== "health"),
  { key: "monthly", label: "1월~12월 월별 흐름", glyph: "月" },
  ...DOMAIN_CARDS.filter((card) => card.key === "health"),
];
export const READING_SECTION_TOTAL = READING_STEPS.length;
// 구버전 조립본에는 분야 마커가 없고 6개 카테고리 소제목만 있다. 그 소제목을 새 분야로 흡수해
// 이미 결제된 과거 상담도 같은 네 장 카드로 열린다.
const LEGACY_CATEGORY_DOMAIN: Record<string, string> = {
  "재물·수입": "wealth",
  "직업·이직": "wealth",
  "연애·재회": "romance",
  "가족·관계": "romance",
  "건강·멘탈": "health",
  "학업·성장": "overview",
};

function stripBold(value: string) {
  return value.replace(/\*\*/g, "").trim();
}

// 문단의 제목 줄 또는 본문 첫 줄에서 분야 마커를 찾는다. LLM이 소제목을 자기 문단으로 떼어
// 쓸 때와 본문 첫 줄에 붙여 쓸 때가 모두 있어 두 자리를 함께 본다.
function domainKeyFromSection(section: ParsedSection) {
  const heads = [stripBold(section.title), stripBold(section.body.split("\n")[0] || "")];
  for (const card of DOMAIN_CARDS) {
    if (heads.some((head) => head === card.marker || head.startsWith(card.marker))) return card.key;
  }
  return "";
}

function legacyDomainFromTitle(title: string) {
  const head = stripBold(title);
  const prefix = CATEGORY_TITLE_PREFIXES.find((item) => head.startsWith(item));
  return prefix ? LEGACY_CATEGORY_DOMAIN[prefix] || "" : "";
}

// 조립본을 분야별로 되돌린다. 분야 마커는 경계라서 뒤 문단까지 끌고 가고(sticky),
// 6개 카테고리 소제목은 더 큰 절 안의 점 표시라서 그 문단 하나만 옮긴다.
function groupSectionsByDomain(sections: ParsedSection[]) {
  const buckets = new Map<string, ParsedSection[]>();
  const push = (key: string, section: ParsedSection) => {
    const list = buckets.get(key) || [];
    list.push(section);
    buckets.set(key, list);
  };
  let current = DEFAULT_DOMAIN_KEY;
  for (const section of sections) {
    const explicit = domainKeyFromSection(section);
    if (explicit) {
      current = explicit;
      push(current, section);
      continue;
    }
    const legacy = legacyDomainFromTitle(section.title);
    push(legacy || current, section);
  }
  return buckets;
}

export function classifySections(sections: ParsedSection[]) {
  const monthLetters = new Map<number, MonthLetter>();
  const restSections: ParsedSection[] = [];
  let questionAnswer: ParsedSection | null = null;
  let collectingQuestion = false;
  for (const section of sections) {
    if (!questionAnswer && section.title.includes(QUESTION_ANSWER_TITLE)) {
      questionAnswer = { ...section };
      collectingQuestion = true;
      continue;
    }
    if (collectingQuestion && questionAnswer && /^새해 상담 편지 \d+$/.test(section.title)) {
      questionAnswer.body += `\n\n${section.body}`;
      continue;
    }
    collectingQuestion = false;
    const monthMatch = section.title.match(MONTH_LETTER_HEADING_RE);
    const month = monthMatch ? Number(monthMatch[1]) : NaN;
    if (monthMatch && month >= 1 && month <= 12 && !monthLetters.has(month)) {
      monthLetters.set(month, { ganji: monthMatch[2], keyword: monthMatch[3], body: section.body });
      continue;
    }
    restSections.push(section);
  }
  // restSections의 원래 순서를 그대로 보존해야 분야 경계(sticky)가 어긋나지 않는다.
  // 구 정렬(카테고리 먼저)은 분야 그룹핑이 순서를 대신하므로 더 이상 필요 없다.
  return { questionAnswer, monthLetters, restSections, domains: groupSectionsByDomain(restSections) };
}

// 분야 카드 본문. 서버 구조화 응답이 있으면 그대로 쓰고, 없으면 조립본 그룹핑 결과를 쓴다.
// 분야 마커 줄만 남은 문단은 카드 제목과 중복이라 본문에서 걷어낸다.
export function buildDomainBodies(
  serverSections: ServerSection[],
  grouped: Map<string, ParsedSection[]>,
) {
  const bodies = new Map<string, string>();
  for (const card of DOMAIN_CARDS) {
    const rawServer = serverSections.find((section) => section.key === card.key)?.text || "";
    const fromServer = card.key === "opening" && rawServer.includes(QUESTION_ANSWER_TITLE)
      ? classifySections(splitAssistantSections(rawServer)).restSections
        .map(section => /^새해 상담 편지 \d+$/.test(section.title) ? section.body : `**${section.title}**\n${section.body}`).join("\n\n")
      : rawServer;
    if (fromServer) {
      bodies.set(card.key, stripLeadingMarker(fromServer, card.marker));
      continue;
    }
    const chunks = (grouped.get(card.key) || [])
      .map((section) => {
        const body = stripLeadingMarker(section.body, card.marker);
        const title = stripBold(section.title);
        const isMarkerTitle = title === card.marker || title.startsWith(card.marker);
        const isGeneratedTitle = /^새해 상담 편지 \d+$/.test(title);
        return !isMarkerTitle && !isGeneratedTitle && body ? `**${title}**\n${body}` : body;
      })
      .filter(Boolean);
    if (chunks.length) bodies.set(card.key, chunks.join("\n\n"));
  }
  return bodies;
}

function stripLeadingMarker(text: string, marker: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  while (lines.length && !stripBold(lines[0])) lines.shift();
  if (lines.length && stripBold(lines[0]) === marker) lines.shift();
  return lines.join("\n").trim();
}
