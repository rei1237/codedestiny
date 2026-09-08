import Link from "next/link";
import { getContentReview } from "../../lib/content/editorial-review.mjs";

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

/**
 * @param {{ contentSource?: string; datePublished?: string | null; dateModified?: string | null; tone?: string; className?: string; author?: string | null; contentPath?: string }} props
 *   author — 기사 메타의 작성 책임. 검수자는 원고별 확인 기록에서만 읽는다.
 */
export default function ContentIntegrityNote({
  contentSource = "template",
  datePublished = null,
  dateModified = null,
  tone = "dark",
  className = "",
  author = null,
  contentPath = "",
}) {
  const palette = TONES[tone] || TONES.dark;
  const published = formatKoreanDate(datePublished);
  const modified = formatKoreanDate(dateModified);
  const showDates = Boolean(published || modified);
  const isAssembled = contentSource === "template";
  const review = getContentReview(contentPath);
  const writer = author ? String(author) : "Code Destiny 편집팀";

  return (
    <aside
      className={`mt-8 rounded-2xl border p-5 text-sm leading-7 md:p-6 ${palette.root} ${className}`}
      aria-label="콘텐츠 제작 및 검수 안내"
    >
      <p className={`font-semibold ${palette.heading}`}>제작·검수 안내</p>
      {isAssembled ? (
        <p className="mt-2">
          이 페이지는 편집팀이 정한 해석 규칙과 문장 틀에 공개된 정보를 대입해 자동으로 구성했습니다. 문장 틀과 금지 표현 기준은 사람이 정하지만, 완성된 페이지를 한 건씩 사람이 검토하지는 않습니다. 운세 해석은 미래를 단정하는 예언이 아니라 자기 성찰과 선택 정돈을 돕는 참고 자료입니다.
        </p>
      ) : (
        <p className="mt-2">
          이 글은 전통 상징 체계와 공개 정보를 바탕으로 구성한 해설입니다. 설명을 정리하는 과정에 인공지능이 활용될 수 있습니다. 원고의 제작 방식과 전문가의 개별 검수 여부는 구분하여 안내합니다. 운세 해석은 미래를 단정하는 예언이 아니라 자기 성찰과 선택 정돈을 돕는 참고 자료입니다.
        </p>
      )}
      <p className={`mt-2 text-xs ${palette.meta}`} data-editorial-review={review ? "verified" : "pending"}>
        작성 책임 <span data-cd-no-trans>{writer}</span> ·{" "}
        {review ? <>검수 <span data-cd-no-trans>{review.reviewer}</span> · 검수일 {review.reviewedAt}</> : "전문가 개별 검수 확인 전"}
        {" · "}<Link href="/about#author" className={palette.link}>운영자와 검수 기준</Link>
      </p>
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
