import Link from "next/link";

const approaches = [
  { name: "사주 궁합", input: "두 사람의 생년월일·출생 시각", scope: "일간과 오행의 관계, 서로 다른 반응과 생활 패턴", href: "/saju/compatibility/", label: "사주 궁합의 구성 보기" },
  { name: "숙요점 궁합", input: "두 사람의 출생정보와 계산 방식 확인", scope: "본명숙 사이의 관계와 대화·거리감에서 점검할 질문", href: "/sukuyo/", label: "본명숙과 궁합 기준 보기" },
  { name: "별자리 궁합", input: "생일로 찾는 별자리부터 확인", scope: "별자리의 기본 성향 비교. 태양 별자리만으로 개인 관계를 확정하지 않아요.", href: "/astrology/", label: "출생차트와 별자리 차이 보기" },
  { name: "관계 타로", input: "지금 고민하는 상황과 구체적인 질문", scope: "카드의 상징으로 감정과 선택지를 정리. 상대의 속마음을 사실로 확인하는 검사는 아니에요.", href: "/tarot/", label: "질문에 맞는 타로 고르기" },
];

export default function CompatibilityGuide() {
  return <section aria-labelledby="compatibility-guide-heading" className="mt-10">
    <h2 id="compatibility-guide-heading" className="font-[family-name:var(--font-serif)] text-[length:var(--cd-t-section)] font-bold">두 사람의 어떤 점이 궁금한가요?</h2>
    <p className="mt-4 max-w-[68ch] leading-relaxed text-[var(--cd-text-muted)]">오래 반복되는 관계의 방식과 지금의 감정은 서로 다른 질문이에요. 아래 비교표에서 필요한 정보를 확인하고, 내 질문에 맞는 관점부터 골라보세요.</p>
    <div className="mt-5 overflow-x-auto" tabIndex={0} role="region" aria-label="궁합 체계 비교표, 가로로 이동 가능">
      <table className="w-full border-collapse text-left text-[length:var(--cd-t-body)] leading-relaxed">
        <caption className="sr-only">궁합 체계별 입력정보, 해석 범위와 안내 페이지</caption>
        <thead><tr className="border-b border-[var(--cd-border)]">
          {['체계', '준비할 정보', '읽을 수 있는 범위', '자세한 안내'].map(label => <th key={label} scope="col" className="px-3 py-4 align-top font-semibold">{label}</th>)}
        </tr></thead>
        <tbody>{approaches.map(item => <tr key={item.name} className="border-b border-[var(--cd-border)]">
          <th scope="row" className="min-w-[6rem] px-3 py-4 align-top font-semibold">{item.name}</th>
          <td className="min-w-[9rem] px-3 py-4 align-top text-[var(--cd-text-muted)]">{item.input}</td>
          <td className="min-w-[14rem] px-3 py-4 align-top text-[var(--cd-text-muted)]">{item.scope}</td>
          <td className="min-w-[10rem] px-3 py-4 align-top"><Link href={item.href} className="inline-flex min-h-11 items-center text-[var(--cd-accent)] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">{item.label}</Link></td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="mt-4 max-w-[68ch] text-sm leading-relaxed text-[var(--cd-text-muted)]">이 표는 체계를 고르는 안내예요. 서로 다른 결과를 하나의 궁합 점수나 성공 확률로 합치지 않아요. 무료 기본 결과와 별도 유료 분석의 제공 범위는 각 페이지에서 확인하세요.</p>
  </section>;
}
