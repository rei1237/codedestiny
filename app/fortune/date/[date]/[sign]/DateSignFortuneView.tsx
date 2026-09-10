import Link from "next/link";
import type { DateSignViewModel } from "@/lib/fortune/build-view";

const CARD = "rounded-2xl border border-[#f4bed1]/70 bg-white/85 p-5 dark:border-[rgba(244,190,209,0.30)] dark:bg-[#2e0a20]/60";
const MUTED = "text-[#70445c] dark:text-[rgba(255,214,232,0.86)]";
const ACCENT = "text-[#b31955] dark:text-[rgba(255,196,222,0.96)]";
const AXES = [
  { key: "love", label: "연애운" },
  { key: "money", label: "재물운" },
  { key: "work", label: "직장운" },
  { key: "health", label: "건강운" },
] as const;

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`w-14 shrink-0 text-xs font-bold ${MUTED}`}>{label}</span>
      <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[#f4bed1]/45 dark:bg-white/10">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-[#b31955] dark:bg-[rgba(255,196,222,0.9)]"
          style={{ width: `${Math.max(0, Math.min(100, score * 10))}%` }}
        />
      </span>
      <span className={`w-10 shrink-0 text-right text-xs font-bold tabular-nums ${ACCENT}`}>{score}/10</span>
    </div>
  );
}

export default function DateSignFortuneView({ vm }: { vm: DateSignViewModel }) {
  const { profile, entry, score } = vm;
  const [year, month, day] = vm.date.split("-").map(Number);
  const dateTitleLabel = `${year}년 ${month}월 ${day}일`;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffaf7_0%,#fff3f8_44%,#fffaf7_100%)] pb-24 text-[#3c1830] dark:bg-[linear-gradient(165deg,#3a0e28_0%,#2e0a20_55%,#24081a_100%)] dark:text-[#fff1f7]">
      <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 sm:pt-12">
        <nav aria-label="위치" className={`flex flex-wrap items-center gap-1.5 text-xs ${MUTED}`}>
          <Link href="/" className="hover:underline">홈</Link>
          <span aria-hidden="true">›</span>
          <Link href="/fortune/today" className="hover:underline">오늘의 운세</Link>
          <span aria-hidden="true">›</span>
          <Link href={`/fortune/today/${profile.id}`} className="hover:underline">{profile.nameKo} 오늘의 운세</Link>
          <span aria-hidden="true">›</span>
          <span className={ACCENT}>{dateTitleLabel}</span>
        </nav>

        <header className="mt-6">
          <p className={`text-xs font-bold tracking-wider ${ACCENT}`}>{vm.rangeLabel} · 날짜 보관 운세</p>
          <h1 className="mt-3 break-keep text-3xl font-black leading-tight sm:text-4xl">
            {dateTitleLabel} {profile.nameKo} 운세
          </h1>
          <p className={`mt-3 break-keep text-sm leading-7 ${MUTED}`}>
            {profile.nameKo}의 특정 날짜 운세를 일진·월건·절기 기준으로 확인하는 페이지입니다. 오늘 날짜가 바뀌어도
            이 페이지의 날짜와 결과는 보관되며, 최근 30일 범위에서 해당 날짜의 흐름을 다시 읽을 수 있습니다.
          </p>
        </header>

        <section className={`mt-8 ${CARD}`} aria-labelledby="date-facts-heading">
          <h2 id="date-facts-heading" className={`text-sm font-extrabold ${ACCENT}`}>이 날짜의 운세 기준</h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
            {vm.facts.map((fact) => (
              <div key={fact.label}>
                <dt className={`text-xs ${MUTED}`}>{fact.label}</dt>
                <dd className="mt-1 break-keep text-sm font-bold">{fact.value}</dd>
              </div>
            ))}
          </dl>
          <p className={`mt-5 break-keep text-sm leading-7 ${MUTED}`}>
            이 페이지의 일진은 {vm.facts.find((fact) => fact.label === "일진")?.value}이며, 월건은
            {" "}{vm.facts.find((fact) => fact.label === "월건")?.value}입니다. 띠의 상징만 나열하지 않고 날짜에서 나온 값을
            {profile.nameKo}의 기질에 대입해 총운·재물운·연애운·직장운·건강운으로 나누었습니다.
          </p>
        </section>

        <section className="mt-8" aria-labelledby="score-heading">
          <h2 id="score-heading" className="break-keep text-lg font-extrabold">{profile.nameKo} 날짜 운세 점수</h2>
          <div className={`mt-4 ${CARD}`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[#b31955]/10 px-3 py-1 text-xs font-bold text-[#b31955] dark:bg-white/10 dark:text-[rgba(255,196,222,0.96)]">
                {entry.keyword.kr}
              </span>
              <span className={`text-2xl font-black tabular-nums ${ACCENT}`}>{score.overall}<span className={`text-sm font-bold ${MUTED}`}>/10</span></span>
            </div>
            <div className="mt-5 space-y-2.5">
              {AXES.map((axis) => <ScoreBar key={axis.key} label={axis.label} score={score[axis.key]} />)}
            </div>
            <h3 className={`mt-6 text-xs font-extrabold ${ACCENT}`}>산출 근거</h3>
            <ul className="mt-2 space-y-1.5">
              {vm.basis.map((axis) => (
                <li key={axis.label} className={`flex flex-wrap items-baseline gap-x-2 break-keep text-xs leading-6 ${MUTED}`}>
                  <span className="font-bold">{axis.label}</span>
                  <span>{axis.value}</span>
                  <span className={axis.delta > 0 ? "font-bold text-[#0f766e] dark:text-emerald-300" : axis.delta < 0 ? "font-bold text-[#b31955] dark:text-rose-300" : "font-bold"}>
                    {axis.delta > 0 ? `+${axis.delta}` : axis.delta}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="reading-heading">
          <h2 id="reading-heading">{vm.rangeLabel} {profile.nameKo}의 흐름</h2>
          <p className={`mt-3 break-keep text-sm leading-8 ${MUTED}`}>{entry.sections.overall.kr}</p>
          {entry.saju_insight ? <p className={`mt-3 break-keep text-sm leading-8 ${MUTED}`}>{entry.saju_insight}</p> : null}
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2" aria-label="영역별 날짜 운세">
          <article className={CARD}><h2 className="text-base">재물운</h2><p className={`mt-3 break-keep text-sm leading-8 ${MUTED}`}>{entry.sections.money.kr}</p></article>
          <article className={CARD}><h2 className="text-base">연애운</h2><p className={`mt-3 break-keep text-sm leading-8 ${MUTED}`}>{entry.sections.love.kr}</p></article>
          <article className={CARD}><h2 className="text-base">직장운</h2><p className={`mt-3 break-keep text-sm leading-8 ${MUTED}`}>{entry.sections.work.kr}</p></article>
          <article className={CARD}><h2 className="text-base">건강운</h2><p className={`mt-3 break-keep text-sm leading-8 ${MUTED}`}>{entry.sections.health.kr}</p></article>
        </section>

        <section className={`mt-8 ${CARD}`} aria-labelledby="advice-heading">
          <h2 id="advice-heading">이 날짜에 해볼 행동</h2>
          <p className={`mt-3 break-keep text-sm leading-8 ${MUTED}`}>{entry.sections.advice.kr}</p>
          <p className={`mt-3 break-keep text-sm leading-8 ${MUTED}`}>
            날짜 운세는 정해진 결과를 통보하는 문장이 아니라, 이 날짜에 확인·정리·대화를 어디부터 시작할지 고르는 참고입니다.
            총운이 낮게 느껴져도 계획을 포기하기보다 확인 절차를 하나 더 두고, 높은 날에도 과도한 확장보다 현재 가능한 범위를 지키는 편이 안전합니다.
          </p>
        </section>

        {vm.relation ? (
          <section className="mt-8 rounded-2xl border border-[#ead089]/60 bg-[#fff8dc]/50 p-5 dark:border-[#ead089]/25 dark:bg-[#ead089]/[0.06]" aria-labelledby="relation-heading">
            <h2 id="relation-heading" className={`text-sm font-extrabold ${ACCENT}`}>{profile.nameKo}와 이 날짜 일진의 관계</h2>
            <p className="mt-2 inline-block rounded-full border border-[#b31955]/35 px-3 py-1 text-xs font-bold text-[#b31955] dark:border-[rgba(255,196,222,0.4)] dark:text-[rgba(255,196,222,0.96)]">{vm.relation.badge}</p>
            <p className="mt-3 break-keep text-sm leading-7">{vm.relation.detail}</p>
          </section>
        ) : null}

        <section className="mt-8" aria-labelledby="more-date-heading">
          <h2 id="more-date-heading">다른 기간의 {profile.nameKo} 운세</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/fortune/today/${profile.id}`} className="inline-flex min-h-11 items-center rounded-full border border-[#b31955]/35 bg-[#b31955]/[0.06] px-4 text-sm font-bold text-[#b31955] dark:text-[rgba(255,196,222,0.96)]">오늘의 {profile.nameKo}</Link>
            <Link href={`/fortune/monthly/${profile.id}`} className="inline-flex min-h-11 items-center rounded-full border border-[#b31955]/35 bg-[#b31955]/[0.06] px-4 text-sm font-bold text-[#b31955] dark:text-[rgba(255,196,222,0.96)]">이번 달 {profile.nameKo}</Link>
            <Link href="/fortune/monthly" className="inline-flex min-h-11 items-center rounded-full border border-[#b31955]/35 bg-[#b31955]/[0.06] px-4 text-sm font-bold text-[#b31955] dark:text-[rgba(255,196,222,0.96)]">월간 운세 허브</Link>
            <Link href="/saju/monthly/2026-09" className="inline-flex min-h-11 items-center rounded-full border border-[#b31955]/35 bg-[#b31955]/[0.06] px-4 text-sm font-bold text-[#b31955] dark:text-[rgba(255,196,222,0.96)]">일간별 월간 사주 운세</Link>
          </div>
        </section>

        <p className={`mt-12 break-keep text-xs leading-6 ${MUTED}`}>
          운세 콘텐츠는 오락과 자기성찰을 위한 참고 자료입니다. 의료·법률·재무 판단을 대신하지 않으며, 중요한 선택은 실제 조건과 전문가의 조언을 함께 확인하세요.
        </p>
      </div>
    </main>
  );
}
