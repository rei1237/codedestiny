export const metadata = {
  title: "✨ 자존감 레벨업 - 5카드 RPG 퀘스트 타로 | Code Destiny",
  description:
    "5카드 RPG 퀘스트 스프레드로 자존감 상태를 점검하고 회복 전략을 확인하세요. 완전 무료 서비스입니다.",
};

export default function TarotSelfEsteemLandingPage() {
  const questSteps = [
    {
      title: "과거 디버프 확인",
      desc: "자존감을 떨어뜨린 사건과 패턴을 카드로 확인합니다.",
    },
    {
      title: "내면 몬스터 진단",
      desc: "불안, 비교, 자기비난 같은 핵심 방해 요인을 정리합니다.",
    },
    {
      title: "현재 데미지 측정",
      desc: "지금 내 마음의 체력과 감정 상태를 단계별로 읽어줍니다.",
    },
    {
      title: "마인드 실드 획득",
      desc: "오늘 바로 쓸 수 있는 회복 행동 루틴을 제안합니다.",
    },
    {
      title: "레벨업 마스터리",
      desc: "지속 가능한 자존감 성장 전략으로 최종 정리합니다.",
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(251,191,36,0.2),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(236,72,153,0.16),transparent_42%),radial-gradient(circle_at_85%_80%,rgba(59,130,246,0.16),transparent_48%)]" />

      <section className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-300/10 px-4 py-1.5 text-xs font-bold tracking-[0.2em] text-emerald-200">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-300" />
              FREE QUEST
            </div>

            <h1 className="text-balance text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
              자존감 레벨업 타로
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200/90 sm:text-base">
              5카드 RPG 퀘스트로 내 감정의 현재 좌표를 확인하고, 자존감을 회복하는 실전 루틴까지 안내합니다.
              시작부터 결과 해석까지 완전 무료로 이용할 수 있습니다.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="/?action=openTarotSelfEsteemModal"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-400 via-pink-400 to-fuchsia-500 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-[0_14px_34px_rgba(236,72,153,0.35)] transition hover:-translate-y-0.5"
              >
                무료로 퀘스트 시작하기
              </a>
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300/25 bg-slate-900/60 px-5 py-3 text-sm font-bold text-slate-100 transition hover:border-slate-200/45"
              >
                홈으로 이동
              </a>
            </div>

            <div className="mt-8 rounded-2xl border border-emerald-300/35 bg-emerald-300/10 p-4">
              <p className="text-sm font-semibold text-emerald-100">안내: 이 기능은 코인 차감 없는 무료 서비스입니다.</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-slate-200/20 bg-slate-900/70 shadow-2xl">
            <img
              src="/fuctionassets/jajongam.webp"
              alt="자존감 레벨업 타로 대표 이미지"
              className="h-full min-h-[250px] w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent" />
            <div className="absolute left-4 top-4 rounded-full border border-emerald-200/50 bg-emerald-200/20 px-3 py-1 text-xs font-black tracking-[0.18em] text-emerald-100">
              무료 배지
            </div>
            <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/15 bg-slate-900/70 p-3 backdrop-blur">
              <p className="text-sm font-bold text-white">5카드 성장 퀘스트</p>
              <p className="mt-1 text-xs text-slate-200/90">디버프 확인 → 실드 획득 → 마스터리 완성</p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {questSteps.map((step, idx) => (
            <article
              key={step.title}
              className="rounded-2xl border border-slate-200/15 bg-slate-900/65 p-4 backdrop-blur-sm"
            >
              <p className="mb-2 text-xs font-black tracking-[0.18em] text-amber-200">STEP {idx + 1}</p>
              <h2 className="text-sm font-extrabold text-white">{step.title}</h2>
              <p className="mt-2 text-xs leading-6 text-slate-200/85">{step.desc}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
