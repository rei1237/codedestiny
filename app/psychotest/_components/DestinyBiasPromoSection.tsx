import Image from "next/image";
import Link from "next/link";

export default function DestinyBiasPromoSection() {
  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-amber-200/45 bg-[radial-gradient(circle_at_16%_18%,rgba(251,191,36,0.2),transparent_35%),radial-gradient(circle_at_84%_20%,rgba(125,211,252,0.18),transparent_36%),linear-gradient(155deg,#0b1327,#1a213f_52%,#2a1d4c)] p-5 shadow-[0_20px_45px_rgba(9,12,30,0.38)] md:p-7">
      <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-amber-200">NEW FANDOM SAAJU</p>
          <h2 className="mt-2 text-xl font-black leading-tight text-white md:text-2xl">
            심리테스트 다음은 최애운명
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-100/90">
            내 사주와 최애 사주의 공명 점수를 계산해 오늘의 덕질 액션 카드까지 받아보세요.
            계산은 내부 명식 엔진이, 해석은 AI가 맡아 신뢰성과 몰입감을 함께 챙깁니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-100/90">
            <span className="rounded-full border border-cyan-200/40 bg-cyan-200/10 px-3 py-1">내 사주 × 최애 사주</span>
            <span className="rounded-full border border-amber-200/40 bg-amber-200/10 px-3 py-1">팬덤 공명 카드</span>
          </div>
          <Link
            href="/saju/destiny-bias"
            className="mt-5 inline-flex items-center rounded-xl bg-gradient-to-r from-amber-300 to-orange-300 px-4 py-2.5 text-sm font-black text-slate-900 transition hover:brightness-105"
          >
            최애운명 시작하기
          </Link>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute -inset-2 rounded-3xl bg-amber-300/25 blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-black/20">
            <Image
              src="/fuctionassets/%EC%B5%9C%EC%95%A0%EC%9A%B4%EB%AA%85.webp"
              alt="최애운명 서비스 배너"
              width={960}
              height={640}
              className="h-full w-full object-cover"
              sizes="(max-width: 768px) 100vw, 40vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
