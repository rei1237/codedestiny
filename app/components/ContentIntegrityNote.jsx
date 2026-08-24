import Link from "next/link";

// AI 생성 콘텐츠 페이지(운세 인사이트·유명인 사주 등) 하단에 붙이는 제작·검수 고지.
// Google "scaled content abuse" 정책 대응 — 사람 검수·AI 활용 범위·제작 기준을 투명하게 밝히고
// 편집 정책/방법론/문의로 연결한다. 발행·수정일로 페이지별 고유성 신호도 함께 제공한다.

function formatKoreanDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

// contentSource 기본값이 "template" 인 것은 의도적이다. 사람이 검토했다는 주장은
// 그렇게 만든 페이지만 해야 하므로, 명시하지 않으면 보수적인 쪽으로 떨어진다.
// 이 고지는 어두운 인사이트 지면과 밝은 심리테스트 지면 양쪽에 붙는다. className 으로
// 색을 덮으면 Tailwind 유틸리티끼리 우선순위가 생성 순서에 좌우돼 반쪽 오버라이드가 되므로,
// 지면 색은 tone 으로 갈라 둔다(본문 대비는 두 톤 모두 4.5:1 이상).
const TONES = {
  dark: {
    root: "border-white/10 bg-white/[0.04] text-slate-300",
    heading: "text-slate-100",
    meta: "text-slate-400",
    link: "text-amber-100 underline",
  },
  light: {
    root: "border-slate-200 bg-slate-50 text-slate-700",
    heading: "text-slate-900",
    meta: "text-slate-600",
    link: "text-violet-700 underline",
  },
};

export default function ContentIntegrityNote({
  contentSource = "template",
  datePublished = null,
  dateModified = null,
  tone = "dark",
  className = "",
}) {
  const palette = TONES[tone] || TONES.dark;
  const published = formatKoreanDate(datePublished);
  const modified = formatKoreanDate(dateModified);
  const showDates = Boolean(published || modified);
  const isAssembled = contentSource === "template";

  return (
    <aside
      className={`mt-8 rounded-2xl border p-5 text-sm leading-7 md:p-6 ${palette.root} ${className}`}
      aria-label="콘텐츠 제작 및 검수 안내"
    >
      <p className={`font-semibold ${palette.heading}`}>제작·검수 안내</p>
      {isAssembled ? (
        <p className="mt-2">
          이 페이지는 편집팀이 정한 해석 규칙과 문장 틀에 공개된 정보를 대입해 자동으로 구성했습니다. 문장 틀과 금지 표현 기준은 사람이 정하지만, 완성된 페이지를 한 건씩 사람이 검토하지는 않습니다. 그래서 이 페이지는 검색 색인 대상에서 제외해 두었습니다. 운세 해석은 미래를 단정하는 예언이 아니라 자기 성찰과 선택 정돈을 돕는 참고 자료입니다.
        </p>
      ) : (
        <p className="mt-2">
          이 글은 사주·자미두수·점성술·타로 같은 전통 상징 체계의 해석 규칙과 공개된 정보를 바탕으로 편집팀이 직접 작성했으며, 게시 전 표현과 사실 관계, 과장·불안 조장 여부를 검토했습니다. 계산 결과를 읽기 쉬운 해설로 옮기는 과정에는 인공지능의 도움을 받되, 방향과 문장은 사람이 다듬습니다. 운세 해석은 미래를 단정하는 예언이 아니라 자기 성찰과 선택 정돈을 돕는 참고 자료입니다.
        </p>
      )}
      {showDates ? (
        <p className={`mt-2 text-xs ${palette.meta}`}>
          {published ? `발행 ${published}` : ""}
          {published && modified && modified !== published ? " · " : ""}
          {modified && modified !== published ? `최종 수정 ${modified}` : ""}
        </p>
      ) : null}
      <p className="mt-3 text-xs">
        제작 기준은 <Link href="/editorial-policy" className={palette.link}>콘텐츠 제작 및 AI 활용 고지</Link><span data-cd-trans="common.andBetweenLinks">와</span>{" "}
        <Link href="/methodology" className={palette.link}>운세 콘텐츠 방법론</Link>에서 확인할 수 있습니다. 부정확한 내용을 발견하면{" "}
        <Link href="/contact" className={palette.link}>문의</Link>로 알려 주시면 검토 후 수정합니다.
      </p>
    </aside>
  );
}
