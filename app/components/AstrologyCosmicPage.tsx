import Link from "next/link";

export default function AstrologyCosmicPage() {
  return (
    <main className="min-h-[100dvh] bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-3xl rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-6">
        <h1 className="text-2xl font-semibold">점성술 코즈믹 차트 분석</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          태양, 달, 상승궁을 중심으로 한 서양 점성술 코즈믹 차트 서비스입니다. 이 페이지는 점성술
          기능의 검색 노출을 강화하면서 기존 메인 모달 동작은 유지하기 위한 SEO 랜딩 페이지입니다.
        </p>

        <section className="mt-5 space-y-3 text-sm leading-7 text-slate-200">
          <h2 className="text-lg font-semibold">주요 분석 포인트</h2>
          <p>- 태양궁: 기본 성향과 핵심 동력</p>
          <p>- 달궁: 정서 패턴과 관계 반응</p>
          <p>- 상승궁: 외부 표현 방식과 첫인상</p>
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/?action=openAstroModal" className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">
            점성술 기능 바로 실행
          </Link>
          <Link href="/insights/astrology-houses-quick-guide" className="rounded-lg border border-slate-600 px-4 py-2 text-sm">
            점성술 인사이트 읽기
          </Link>
        </div>
      </div>
    </main>
  );
}

