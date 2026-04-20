import Link from "next/link";
import { SAJU_BASIC_METHOD_COPY } from "../_content/seo-copy";

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

        <section className="mt-6 rounded-xl border border-cyan-300/30 bg-cyan-500/10 p-4 text-sm text-cyan-50">
          <h2 className="text-base font-semibold">{SAJU_BASIC_METHOD_COPY.heading}</h2>
          <p className="mt-2 leading-7 text-cyan-50/95">
            {SAJU_BASIC_METHOD_COPY.paragraphs[0]}
          </p>
          <p className="mt-2 leading-7 text-cyan-50/95">
            {SAJU_BASIC_METHOD_COPY.paragraphs[1]}
          </p>
        </section>

        <section className="mt-6 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          <h2 className="text-base font-semibold">시크릿 하우스 연동 콘텐츠</h2>
          <p className="mt-2 leading-7 text-rose-100/90">
            사주 결과 화면에서 바로 이어서 즐길 수 있는 선택형 연애 시뮬레이션입니다.
            사주 정보 입력 없이도 자동 일간 캐치 후 멀티 엔딩으로 분기됩니다.
          </p>
          <Link
            href="/secret-house-final.html"
            className="mt-3 inline-flex rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white"
          >
            나는 솔로 시크릿 하우스 입장
          </Link>
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

