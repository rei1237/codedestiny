import Link from "next/link";

export default function ZiweiChartPage() {
  return (
    <main className="min-h-[100dvh] bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-3xl rounded-2xl border border-fuchsia-500/30 bg-fuchsia-950/20 p-6">
        <h1 className="text-2xl font-semibold">자미두수 12궁 명반 분석</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          자미두수(紫微斗數) 기반으로 명궁, 주요 성군, 12궁 배치를 읽어 성향과 인생 흐름을 해석하는
          서비스입니다. 본 페이지는 자미두수 기능의 SEO 노출을 강화하기 위한 안전한 랜딩 페이지입니다.
        </p>

        <section className="mt-5 space-y-3 text-sm leading-7 text-slate-200">
          <h2 className="text-lg font-semibold">핵심 해석 항목</h2>
          <p>- 명궁/신궁 중심 성향과 기질 분석</p>
          <p>- 재물, 관계, 직업, 이동운 등 12궁 포인트</p>
          <p>- 생년월일시 기반 개인화된 명반 리딩</p>
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/?action=openZiweiModal" className="rounded-lg bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-white">
            자미두수 기능 바로 실행
          </Link>
          <Link href="/insights/ziwei-doushu-stars-intro" className="rounded-lg border border-slate-600 px-4 py-2 text-sm">
            자미두수 가이드 읽기
          </Link>
        </div>
      </div>
    </main>
  );
}

