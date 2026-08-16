// 본문 위에 붙이는 편집자 노트 — "이 문서를 어떻게 읽으면 되는가" 를 사람이 직접 쓴 문단이다.
//
// ContentIntegrityNote 와 나란히 쓰이지만 계약이 반대라서 별도 컴포넌트로 둔다:
// 제작·검수 고지는 **모든 페이지가 같은 문장**이어야 정직하고(그래서 분기가 둘뿐이다),
// 편집자 노트는 **모든 페이지가 달라야** 값이 있다. 한 컴포넌트에 넣으면 가드가
// "노트 없음" 과 "props 안 넘김" 을 구분하지 못한다.
//
// 🔴 서버 컴포넌트로 유지할 것("use client" 금지). scripts/verify-adsense-readiness.mjs 의
//    getVisibleText 는 서버 렌더 텍스트만 세므로, 클라이언트로 내리면 이 노트는
//    콘텐츠 분량 계산에서 통째로 사라진다 — 붙이는 목적 자체가 없어진다.
//
// 🔴 루트의 data-cd-editor-note 마커는 장식이 아니다. scripts/verify-editor-notes.mjs 가
//    산출물 HTML 에서 이걸로 노트를 찾아 **제거한 뒤** 고유 본문을 잰다. 지우지 말 것.

function formatKoreanDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function EditorNote({ note, className = "" }) {
  if (!note || !note.lede || !Array.isArray(note.tips) || note.tips.length === 0) return null;

  const updated = formatKoreanDate(note.updatedAt);

  return (
    <aside
      data-cd-editor-note=""
      className={`rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm leading-7 text-slate-300 md:p-6 ${className}`}
      aria-label="편집자 노트"
    >
      <p className="font-semibold text-amber-100">편집자 노트</p>
      <p className="mt-2 break-keep">{note.lede}</p>

      <ul className="mt-4 space-y-2">
        {note.tips.map((tip) => (
          <li key={tip.label} className="break-keep">
            <span className="font-semibold text-slate-100">{tip.label}</span>
            {" — "}
            {tip.body}
          </li>
        ))}
      </ul>

      {updated ? <p className="mt-3 text-xs text-slate-400">노트 갱신 {updated}</p> : null}
    </aside>
  );
}
