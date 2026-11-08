import { loveChapterKicker, resolveLoveSpeaker, splitLoveSecretAnswerByTitles, type LoveSectionInput, type LoveSpeaker } from "./love-secret-sections";

export type LoveSecretPdfChapter = { kicker: string; title: string; body: string; speaker: string };
export type LoveSecretPdfSource = {
  pdfSections?: LoveSectionInput[] | null;
  sections?: LoveSectionInput[] | null;
  messages?: Array<{ role: string; content?: string }> | null;
};

export const LOVE_SECRET_PDF_SPEAKERS: Record<LoveSpeaker, string> = { yeoni: "연이", hanbi: "서한비" };
export const LOVE_SECRET_PDF_BYLINE = "연이 · 서한비";
export const LOVE_SECRET_PDF_FALLBACK_TITLE = "연애 비책 상담";

const clean = (sections?: LoveSectionInput[] | null) =>
  (sections || []).filter((section) => String(section?.title || "").trim() && String(section?.body || "").trim());

/**
 * 받은 상담 전체를 조판 PDF 장 목록으로 바꾼다. 화면의 접힘·덱 페이지와 상관없이 모든 장이 들어가고,
 * 본문 글자는 한 자도 고치지 않는다. 원천 순서: pdfSections → sections → 첫 상담 답변을 장 제목으로 다시 나눈 것.
 * 알려진 장 제목이 없는 예전 답변은 통째로 한 장이 된다.
 */
export function buildLoveSecretPdfChapters(source: LoveSecretPdfSource, speakerNames: Record<LoveSpeaker, string> = LOVE_SECRET_PDF_SPEAKERS): LoveSecretPdfChapter[] {
  let sections = clean(source.pdfSections);
  if (!sections.length) sections = clean(source.sections);
  if (!sections.length) {
    const answer = String(source.messages?.find((message) => message.role === "assistant")?.content || "").trim();
    sections = splitLoveSecretAnswerByTitles(answer);
    if (!sections.length && answer) sections = [{ title: LOVE_SECRET_PDF_FALLBACK_TITLE, body: answer }];
  }
  return sections.map((section) => ({
    kicker: loveChapterKicker(section.title),
    title: section.title.trim(),
    body: section.body,
    speaker: speakerNames[resolveLoveSpeaker(section.title)] || "",
  }));
}
