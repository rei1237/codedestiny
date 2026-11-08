export type KarmaPdfChapter = { kicker: string; title: string; body: string; speaker: string };

type SourceChapter = { id?: string; order?: number; title?: string; content?: string; summary?: string; keyTakeaways?: string[] };
export type KarmaPdfSource = {
  chapters?: SourceChapter[] | null;
  /** 보관함에 장 배열이 없을 때 쓰는 assistant 본문("## N장. 제목" 마크다운). */
  messages?: Array<{ role: string; content?: string }> | null;
};

export const KARMA_PDF_BYLINE = "네오 · 서한비";
export const KARMA_PDF_FALLBACK_TITLE = "운명의 업";
const TAKEAWAY_HEADING = "이번 장의 핵심";
const NEO = "네오";
const HANBI = "서한비";
const BOTH = `${NEO} · ${HANBI}`;

// 장 id → 부 이름·화자. 관계·사랑(05·06)은 서한비, 질문·전략·종합·문장·편지는 둘이 함께, 나머지는 네오.
// id 가 없는 예전 마크다운도 붙도록 정본 제목을 함께 둔다(V1·V2 모두 같은 id·제목이다).
const CHAPTER_META: Record<string, { title: string; kicker: string; speaker: string }> = {
  "chapter-00": { title: "타고난 기질과 마음의 결", kicker: "타고난 결", speaker: NEO },
  "chapter-01": { title: "운명의 핵심 주제", kicker: "이번 삶의 질문", speaker: BOTH },
  "chapter-02": { title: "운명의 근원", kicker: "업의 뿌리", speaker: NEO },
  "chapter-03": { title: "현재 삶의 흐름", kicker: "업의 뿌리", speaker: NEO },
  "chapter-04": { title: "업의 핵심 과제", kicker: "업의 뿌리", speaker: NEO },
  "chapter-05": { title: "인간관계의 업", kicker: "인연의 업", speaker: HANBI },
  "chapter-06": { title: "사랑의 업", kicker: "인연의 업", speaker: HANBI },
  "chapter-07": { title: "돈의 업", kicker: "삶의 자리", speaker: NEO },
  "chapter-08": { title: "직업의 업", kicker: "삶의 자리", speaker: NEO },
  "chapter-09": { title: "건강 에너지", kicker: "삶의 자리", speaker: NEO },
  "chapter-10": { title: "숨겨진 재능", kicker: "삶의 자리", speaker: NEO },
  "chapter-11": { title: "운명의 전환점", kicker: "다음 걸음", speaker: NEO },
  "chapter-12": { title: "앞으로의 성장 전략", kicker: "다음 걸음", speaker: BOTH },
  "chapter-13": { title: "다섯 관점의 종합 결론", kicker: "종합", speaker: BOTH },
  "chapter-14": { title: "운명을 바꾸는 핵심 문장", kicker: "핵심 문장", speaker: BOTH },
  "chapter-15": { title: "최종 편지", kicker: "편지", speaker: BOTH },
};
const ID_BY_TITLE = new Map(Object.entries(CHAPTER_META).map(([id, meta]) => [meta.title, id]));

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

function metaOf(chapter: { id?: string; title?: string }) {
  return CHAPTER_META[text(chapter.id)] || CHAPTER_META[ID_BY_TITLE.get(text(chapter.title)) || ""] || null;
}

/** 장 머리의 부 이름. 모르는 장(구 16장 문서 등)은 빈 문자열이다. */
export function karmaChapterKicker(chapter: { id?: string; title?: string }): string {
  return metaOf(chapter)?.kicker || "";
}

/** 그 장을 쓰는 마스터 표시 이름("네오", "서한비", "네오 · 서한비"). 모르는 장은 둘이 함께 쓴 것으로 둔다. */
export function karmaChapterSpeaker(chapter: { id?: string; title?: string }): string {
  return metaOf(chapter)?.speaker || BOTH;
}

// 화면용 굵은 소제목 줄은 PDF 소제목(●)으로, 문장 속 굵게 표시는 기호만 걷는다. 문장은 그대로다.
function toBookBody(value: string) {
  return value.replace(/\r\n/g, "\n").split("\n")
    .map((line) => {
      const heading = line.trim().match(/^(?:#{1,3}\s*)?\*\*([^*]+)\*\*[:：]?$/) || line.trim().match(/^#{1,3}\s+(.+)$/);
      return heading ? `● ${heading[1].replace(/\*\*/g, "").trim()}` : line.replace(/\*\*/g, "");
    })
    .join("\n");
}

function withTakeaways(body: string, items: unknown) {
  const list = Array.isArray(items) ? items.map(text).filter(Boolean) : [];
  return list.length ? `${body}\n\n● ${TAKEAWAY_HEADING}\n${list.map((item) => `- ${item}`).join("\n")}` : body;
}

/** "## N장. 제목" 마크다운을 장으로 나눈다. "이번 장의 핵심" 아래 목록은 그대로 본문 끝에 남는다. */
function splitMarkdown(answer: string): SourceChapter[] {
  const normalized = answer.replace(/\r\n/g, "\n");
  const matches = [...normalized.matchAll(/(?:^|\n)#{1,3}\s*(\d{1,2})장\.\s*([^\n]+)/g)];
  return matches.map((match, index) => {
    const start = (match.index || 0) + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index || normalized.length : normalized.length;
    const content = normalized.slice(start, end).trim()
      .replace(new RegExp(`\\n${TAKEAWAY_HEADING}\\n`), `\n**${TAKEAWAY_HEADING}**\n`);
    return { order: Number(match[1]), title: match[2].trim(), content };
  });
}

/**
 * 받은 운명의 업 전체를 조판 PDF 장 목록으로 바꾼다. 장 순서대로 싣고 본문 글자는 고치지 않는다.
 * 결과 화면과 보관함이 같은 빌더를 쓴다. 장 배열이 없으면 assistant 본문을 "## N장." 으로 나누고,
 * 그마저 없으면 본문 통째로 한 장이 된다.
 */
export function buildKarmaPdfChapters(source: KarmaPdfSource): KarmaPdfChapter[] {
  const stored = (Array.isArray(source.chapters) ? source.chapters : []).filter((chapter) => text(chapter?.content));
  const answer = text(source.messages?.find((message) => message.role === "assistant")?.content);
  const rows = stored.length ? stored : answer ? splitMarkdown(answer) : [];
  const chapters = [...rows]
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map((chapter) => {
      const title = text(chapter.title);
      const body = withTakeaways(text(chapter.content), chapter.keyTakeaways);
      return { kicker: karmaChapterKicker(chapter), title, body: toBookBody(body), speaker: karmaChapterSpeaker(chapter) };
    })
    .filter((chapter) => chapter.title && chapter.body.trim());
  if (!chapters.length && answer) {
    return [{ kicker: "", title: KARMA_PDF_FALLBACK_TITLE, body: toBookBody(answer), speaker: BOTH }];
  }
  return chapters;
}
