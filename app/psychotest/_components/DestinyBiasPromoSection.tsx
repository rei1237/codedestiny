import Image from "next/image";
import Link from "next/link";

export default function DestinyBiasPromoSection() {
  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-fuchsia-200/45 bg-[radial-gradient(circle_at_14%_16%,rgba(255,79,216,0.28),transparent_34%),radial-gradient(circle_at_84%_20%,rgba(34,211,238,0.2),transparent_34%),linear-gradient(155deg,#120626,#180a34_50%,#0a112b)] p-5 shadow-[0_22px_55px_rgba(12,7,32,0.5)] md:p-7">
      <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-cyan-200">DESTINY BIAS WORLD</p>
          <h2 className="mt-2 text-xl font-black leading-tight text-white md:text-2xl">
            심리테스트 다음, 최애운명 포토카드 스테이지
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-100/90">
            내 사주와 최애 사주의 공명 점수를 계산하고, 탑꾸 스티커까지 붙인 한정판 포토카드를 받아보세요.
            계산은 내부 명식 엔진이 수행하고, 해석은 AI가 맡아 감성과 신뢰를 함께 챙깁니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-100/90">
            <span className="rounded-full border border-cyan-200/40 bg-cyan-200/10 px-3 py-1">내 사주 × 최애 사주</span>
            <span className="rounded-full border border-fuchsia-200/45 bg-fuchsia-300/15 px-3 py-1">스티커 탑꾸 포토카드</span>
          </div>
          <Link
            href="/saju/destiny-bias"
            className="mt-5 inline-flex items-center rounded-xl border border-fuchsia-200/60 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 px-4 py-2.5 text-sm font-black text-white transition hover:brightness-110"
          >
            최애운명 시작하기
          </Link>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute -inset-2 rounded-3xl bg-fuchsia-300/30 blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-black/20">
            <Image
              src="/fuctionassets/%EC%B5%9C%EC%95%A0%EC%9A%B4%EB%AA%85.webp"
              alt="최애운명 서비스 배너"
              width={960}
              height={640}
              className="h-full w-full object-cover"
              sizes="(max-width: 768px) 100vw, 40vw"
            />
            <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl border border-white/25 bg-black/40 px-3 py-2 text-[11px] font-semibold text-cyan-100/90 backdrop-blur-md">
              ✨ 1회 50코인 · 포토카드 포함
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
