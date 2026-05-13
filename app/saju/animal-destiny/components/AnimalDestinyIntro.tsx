import CosmicSigil from "./CosmicSigil";

export default function AnimalDestinyIntro() {
  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden rounded-[1.8rem] border border-cyan-100/25 bg-[linear-gradient(140deg,rgba(2,10,30,0.75),rgba(12,30,64,0.72))] p-5 shadow-[0_18px_56px_rgba(2,8,28,0.48)]">
        <div className="pointer-events-none absolute -right-12 -top-10 h-48 w-48 opacity-70">
          <CosmicSigil className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-52 w-52 opacity-45">
          <CosmicSigil className="h-full w-full" />
        </div>

        <div className="relative grid gap-4 md:grid-cols-[1fr_230px] md:items-center">
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-100/85">Celestial Saju Observatory</p>
            <h1 className="text-3xl font-black leading-tight text-white md:text-[2.2rem]">
              십이운성 동물점
            </h1>
            <p className="max-w-[48ch] text-sm leading-relaxed text-cyan-50/90 md:text-[15px]">
              태어난 순간의 사주를 정밀 명식으로 읽어, 나를 지키는 수호 동물을 소환합니다.
              분위기만 보는 테스트가 아니라 일주 중심의 운성 흐름을 근거로 해석합니다.
            </p>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full border border-cyan-100/35 bg-cyan-50/10 px-3 py-1 font-semibold text-cyan-100">일주 정밀 계산</span>
              <span className="rounded-full border border-fuchsia-100/35 bg-fuchsia-50/10 px-3 py-1 font-semibold text-fuchsia-100">홀로그램 결과 카드</span>
              <span className="rounded-full border border-amber-100/35 bg-amber-50/10 px-3 py-1 font-semibold text-amber-100">궁합 공명 분석</span>
            </div>
          </div>

          <div className="relative mx-auto h-44 w-44 rounded-3xl border border-white/35 bg-white/10 p-3 backdrop-blur-sm md:h-48 md:w-48">
            <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_50%_35%,rgba(162,245,255,0.3),transparent_58%)]" />
            <CosmicSigil className="relative h-full w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}

