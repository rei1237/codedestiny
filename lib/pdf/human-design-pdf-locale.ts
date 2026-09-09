// 휴먼 디자인 PDF의 문자권 경계.
//
// PDF는 현재 Mulmaru/Paperlogy 두 TTF만 임베드한다. 이 조합은 한글과 라틴 기반 본문은
// 조판할 수 있지만, CJK 통합 한자와 Devanagari 전체를 보장하지 않는다. 지원하지 않는
// 문자권을 jsPDF 기본 글꼴로 흘리면 빈 글리프가 섞인 유료 문서를 주게 되므로, 자산이
// 추가될 때까지 명시적으로 웹 리더에만 남긴다.

export const HUMAN_DESIGN_PDF_SUPPORTED_LOCALES = [
  "ko", "en", "vi", "es", "fr", "de", "nl", "ms",
] as const;

const supported = new Set<string>(HUMAN_DESIGN_PDF_SUPPORTED_LOCALES);

export function isHumanDesignPdfLocaleSupported(locale: string): boolean {
  return supported.has(locale);
}
