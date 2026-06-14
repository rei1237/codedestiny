export const metadata = {
  title: "✨ 자존감 레벨업 - 5카드 RPG 퀘스트 타로",
  description:
    "5카드 RPG 퀘스트 스프레드로 자존감 상태를 점검하고 회복 전략을 확인하세요. 완전 무료 서비스입니다.",
};

export default function TarotSelfEsteemLandingPage() {
  const questSteps = [
    {
      title: "과거 디버프 확인",
      desc: "자존감을 떨어뜨린 사건과 패턴을 카드로 확인합니다.",
      icon: "📜",
      color: "from-blue-600 to-blue-400",
    },
    {
      title: "내면 몬스터 진단",
      desc: "불안, 비교, 자기비난 같은 핵심 방해 요인을 정리합니다.",
      icon: "👹",
      color: "from-purple-600 to-purple-400",
    },
    {
      title: "현재 데미지 측정",
      desc: "지금 내 마음의 체력과 감정 상태를 단계별로 읽어줍니다.",
      icon: "💔",
      color: "from-red-600 to-pink-400",
    },
    {
      title: "마인드 실드 획득",
      desc: "오늘 바로 쓸 수 있는 회복 행동 루틴을 제안합니다.",
      icon: "🛡️",
      color: "from-green-600 to-emerald-400",
    },
    {
      title: "레벨업 마스터리",
      desc: "지속 가능한 자존감 성장 전략으로 최종 정리합니다.",
      icon: "⭐",
      color: "from-yellow-600 to-amber-400",
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100">
      {/* Animated Background Gradients */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(251,191,36,0.25),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(236,72,153,0.2),transparent_42%),radial-gradient(circle_at_85%_80%,rgba(59,130,246,0.2),transparent_48%)]" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-r from-emerald-400/20 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-l from-pink-400/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <section className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="mb-16 text-center lg:mb-20">
          <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-emerald-300/50 bg-gradient-to-r from-emerald-300/15 to-emerald-400/10 px-5 py-2 text-xs font-extrabold tracking-widest text-emerald-200 shadow-lg shadow-emerald-500/20 backdrop-blur-sm">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300 animate-pulse" />
            무료 서비스 · FREE QUEST
          </div>

          <h1 className="bg-gradient-to-r from-emerald-200 via-pink-200 to-amber-200 bg-clip-text text-5xl font-black leading-tight text-transparent sm:text-6xl lg:text-7xl">
            자존감 레벨업
          </h1>
          <p className="mt-6 text-xl font-semibold text-slate-200">5카드 RPG 퀘스트 타로</p>
          
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-300/90">
            내 감정의 현재 좌표를 정확히 파악하고,<br />
            자존감을 회복하는 실전 미션까지 안내하는 완전 무료 타로 리딩
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-start mb-16">
          {/* Left: Features */}
          <div className="space-y-8">
            {/* Key Benefits */}
            <div className="rounded-2xl border border-slate-200/20 bg-gradient-to-br from-slate-900/80 to-slate-800/80 p-8 backdrop-blur-xl shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">이 타로가 알려주는 것</h2>
              <ul className="space-y-4">
                {[
                  "내 자존감의 현재 체력 레벨",
                  "자신감을 떨어뜨리는 진짜 패턴",
                  "오늘 당장 실천할 미션과 루틴",
                  "앞으로의 성장 플랜과 코칭",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-4">
                    <div className="mt-1 flex-shrink-0 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 p-2">
                      <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-slate-200 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <a
                href="/?action=openTarotSelfEsteemModal"
                className="group relative inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 px-8 py-4 text-base font-extrabold text-white shadow-lg shadow-emerald-500/40 transition duration-300 hover:shadow-emerald-500/60 hover:-translate-y-0.5 active:translate-y-0"
              >
                <span className="relative z-10">무료로 퀘스트 시작</span>
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 opacity-0 transition group-hover:opacity-100" />
              </a>
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-xl border-2 border-slate-300/30 bg-slate-900/40 px-8 py-4 text-base font-bold text-slate-100 transition hover:border-slate-200/50 hover:bg-slate-800/60"
              >
                홈으로 돌아가기
              </a>
            </div>

            {/* Info Box */}
            <div className="rounded-xl border-l-4 border-emerald-400 bg-gradient-to-r from-emerald-400/15 to-emerald-300/5 p-4">
              <p className="text-sm font-semibold text-emerald-100">
                ✨ <span className="text-emerald-200">100% 무료</span> — 코인 차감 없이 모든 기능 이용 가능
              </p>
            </div>
          </div>

          {/* Right: Image */}
          <div className="group relative overflow-hidden rounded-3xl border border-slate-200/20 bg-slate-900/50 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-transparent to-pink-400/10 opacity-0 transition group-hover:opacity-100" />
            <img
              src="/fuctionassets/jajongam.webp"
              alt="자존감 레벨업 타로 대표 이미지"
              className="h-full min-h-[320px] w-full object-cover transition group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            
            {/* Badge */}
            <div className="absolute top-4 left-4 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 px-4 py-2 text-xs font-black tracking-widest text-slate-950 shadow-lg">
              무료 배지
            </div>

            {/* Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-6">
              <p className="text-lg font-black text-emerald-200">5카드 성장 퀘스트</p>
              <p className="mt-2 text-sm text-slate-300">
                📜 디버프 확인 → 👹 몬스터 진단 → 💔 데미지 측정<br/>
                🛡️ 실드 획득 → ⭐ 레벨업 완성
              </p>
            </div>
          </div>
        </div>

        {/* Quest Steps Grid */}
        <div className="mb-8">
          <h2 className="text-3xl font-black text-white mb-8 text-center">5단계 퀘스트 방식</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {questSteps.map((step, idx) => (
              <div
                key={step.title}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/15 bg-gradient-to-br from-slate-900/80 to-slate-800/60 p-6 transition hover:border-slate-200/40 hover:shadow-xl hover:shadow-slate-900/50 duration-300 hover:-translate-y-1"
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 transition group-hover:opacity-10`} />
                
                {/* Content */}
                <div className="relative z-10">
                  <div className="mb-4 text-4xl">{step.icon}</div>
                  <p className={`mb-2 text-xs font-black tracking-widest bg-gradient-to-r ${step.color} bg-clip-text text-transparent uppercase`}>
                    단계 {idx + 1}
                  </p>
                  <h3 className="text-sm font-extrabold text-white leading-tight mb-2">{step.title}</h3>
                  <p className="text-xs leading-6 text-slate-300">{step.desc}</p>
                </div>

                {/* Hover Line */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${step.color} opacity-0 transition group-hover:opacity-100`} />
              </div>
            ))}
          </div>
        </div>

        {/* Additional Info Section */}
        <div className="rounded-2xl border border-slate-200/15 bg-gradient-to-br from-slate-900/70 to-slate-800/70 p-8 lg:p-12">
          <h2 className="text-2xl font-bold text-white mb-8">이런 분께 추천합니다</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: "😔", text: "최근 자신감이 떨어졌고 회복하고 싶은 분" },
              { icon: "🎯", text: "내 감정 상태를 객관적으로 파악하고 싶은 분" },
              { icon: "💪", text: "지금 당장 실천할 구체적인 액션을 원하는 분" },
              { icon: "🔄", text: "반복되는 자존감 저하 패턴을 깨고 싶은 분" },
              { icon: "🌱", text: "장기적인 성장 플랜을 세우고 싶은 분" },
              { icon: "🎭", text: "타로의 상징성으로 깊이 있게 이해하고 싶은 분" },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <span className="text-3xl flex-shrink-0">{item.icon}</span>
                <p className="text-slate-200">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
