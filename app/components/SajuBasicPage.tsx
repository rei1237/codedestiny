import Link from "next/link";

export default function SajuBasicPage() {
  return (
    <main className="min-h-[100dvh] bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-3xl rounded-2xl border border-indigo-500/30 bg-indigo-950/25 p-6">
        <h1 className="text-2xl font-semibold">사주 만세력 기본 해석</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          생년월일시를 기반으로 사주의 네 기둥(년주, 월주, 일주, 시주)을 해석하고 오행의 균형을 읽는
          서비스입니다. 이 페이지는 사주 기능의 SEO 인덱싱을 위한 안전한 랜딩 페이지입니다.
        </p>

        <section className="mt-5 space-y-3 text-sm leading-7 text-slate-200">
          <h2 className="text-lg font-semibold">무엇을 확인할 수 있나요?</h2>
          <p>- 오행 균형(목·화·토·금·수)과 과다/부족 경향</p>
          <p>- 십성 흐름과 일상, 관계, 진로에 대한 해석 포인트</p>
          <p>- 출생 시각/출생지 보정을 반영한 명식 기반 분석</p>
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/" className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white">
            사주 기능 바로 실행
          </Link>
          <Link href="/insights" className="rounded-lg border border-slate-600 px-4 py-2 text-sm">
            사주 인사이트 읽기
          </Link>
        </div>
      </div>
    </main>
  );
}

