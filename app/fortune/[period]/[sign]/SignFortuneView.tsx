/**
 * 별자리·띠 운세 본문 — 기간 4종 공용. 서버 컴포넌트.
 *
 * 🔴 "use client" 를 붙이지 말 것. scripts/verify-adsense-readiness.mjs 는 서버 렌더 텍스트만
 *    세고 기준 미달이면 배포를 실패시킨다(이 라우트는 광고 게재 대상이라 1200자).
 *    구 fortune/*.html 이 색인에서 사라진 원인이 정확히 "본문을 브라우저에서 그렸다"였다.
 *
 * 팔레트는 같은 라우트 네임스페이스의 정본인 app/fortune/prompt-hub/page.tsx 를 따른다 —
 * 연이 크림(밝게) / 연이 딥 플럼(dark:), 강조는 로즈 하나, 골드는 테두리·글로우 보조.
 * DESIGN.md 의 One Accent Rule · Glow-Not-Shadow · Hue-Stays Rule 을 지킨다.
 */
import Link from "next/link";
import { FusionCrossSell } from "@/app/components/FusionCrossSell";
import type { SignViewModel } from "@/lib/fortune/build-view";
import { PERIOD_LABEL, PERIOD_TITLE, type FortunePeriodId } from "@/lib/fortune/periods";
import { getSignProfile, getSiblingProfiles, type SignProfile } from "@/lib/fortune/sign-profiles";
import { getPeriodReading } from "@/lib/fortune/period-readings";
import { buildPeriodFaqs } from "@/lib/fortune/period-faqs";
import { markerAttrs } from "@/lib/fortune/i18n-marker";
import { fortuneLocaleSegment, FORTUNE_COPY, langBoxText, getLocalizedProfile, type FortuneLocale } from "@/lib/fortune/localization";
import YeoniPortrait, { moodForScore } from "../YeoniPortrait";

const SCORE_AXES = [
  { key: "love", label: "애정운", section: "love" },
  { key: "money", label: "재물운", section: "money" },
  { key: "health", label: "건강운", section: "health" },
  { key: "work", label: "직장운", section: "work" },
] as const;
function axisLabel(key: string, locale: FortuneLocale) {
  const normalized = ({ "애정운": "love", "재물운": "money", "건강운": "health", "직장운": "work" } as Record<string, string>)[key] || key;
  if (locale === "ko") return ({ love: "애정운", money: "재물운", health: "건강운", work: "직장운" } as Record<string, string>)[normalized] || key;
  return ({ love: "Love", money: "Money", health: "Health", work: "Work" } as Record<string, string>)[normalized] || key;
}

const CARD = "rounded-2xl border border-[#f4bed1]/70 bg-white/85 dark:border-[rgba(244,190,209,0.30)] dark:bg-[#2e0a20]/60";
const TEXT = "text-[#3c1830] dark:text-[#fff1f7]";
const MUTED = "text-[#70445c] dark:text-[rgba(255,214,232,0.86)]";
const ACCENT = "text-[#b31955] dark:text-[rgba(255,196,222,0.96)]";

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

function SignLinkGrid({ profiles, period, currentId, heading, locale = "ko" }: {
  profiles: SignProfile[];
  period: FortunePeriodId;
  currentId: string;
  heading: string;
  locale?: FortuneLocale;
}) {
  const prefix = locale === "ko" ? "" : `/${fortuneLocaleSegment(locale)}`;
  return (
    <>
      <h3 className={`mt-8 break-keep text-sm font-extrabold ${ACCENT}`}>{heading}</h3>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {profiles.map((item) => {
          const isCurrent = item.id === currentId;
          return (
            <li key={item.id}>
              <Link
                href={`${prefix}/fortune/${period}/${item.id}/`}
                aria-current={isCurrent ? "page" : undefined}
                className={`flex min-h-[44px] items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition-colors ${
                  isCurrent
                    ? "border-[#b31955]/50 bg-[#b31955]/10 text-[#b31955] dark:border-[rgba(255,196,222,0.5)] dark:bg-white/10 dark:text-[rgba(255,196,222,0.96)]"
                    : `border-[#f4bed1]/70 bg-white/70 ${MUTED} hover:border-[#b31955]/40 hover:text-[#b31955] dark:border-[rgba(244,190,209,0.28)] dark:bg-[#2e0a20]/50 dark:hover:text-[rgba(255,196,222,0.96)]`
                }`}
              >
                <span aria-hidden="true">{item.symbol}</span>
                <span className="break-keep">{item.nameKo}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function localizeViewModel(source: SignViewModel, locale: FortuneLocale): SignViewModel {
  if (locale === "ko") return source;
  const profile = getLocalizedProfile(source.profile, locale);
  const box = (value: any) => ({ ...value, kr: langBoxText(value, locale) });
  const entry = {
    ...source.entry,
    keyword: box(source.entry.keyword),
    sections: Object.fromEntries(Object.entries(source.entry.sections).map(([key, value]) => [key, box(value)])),
    planet_message: source.entry.planet_message ? box(source.entry.planet_message) : undefined,
    lucky: { ...source.entry.lucky, color_kr: (source.entry.lucky as unknown as Record<string, string>)[`color_${locale === "ja" ? "ja" : locale === "zh-CN" ? "zh" : locale === "zh-TW" ? "zh_tw" : "en"}`] || source.entry.lucky.color_en || "" },
  } as SignViewModel["entry"];
  const copy = FORTUNE_COPY[locale];
  const facts = source.facts.map((fact) => ({ ...fact, label: ({ "일진": "Day pillar", "월건": "Month pillar", "음력": "Lunar date", "절기": "Solar term", "기간": "Period", "일진 흐름": "Day-pillar flow", "달의 이동": "Moon movement", "주 시작": "Week begins" } as Record<string, string>)[fact.label] || fact.label }));
  const highlights = source.highlights?.map((row) => ({ ...row, label: ({ "가장 좋은 날": "Best day", "조심할 날": "Day for care", "기운이 맞는 날": "Days in harmony", "부딪히는 날": "Days of friction", "시작하기 좋은 때": "Good time to begin", "매듭짓기 좋은 때": "Good time to complete", "기운이 바뀌는 날": "Turning point" } as Record<string, string>)[row.label] || row.label }));
  const narrative = locale === "en"
    ? `${profile.nameEn} is moving through ${source.period} with a pattern that rewards clear priorities. Read the scores as a prompt for pacing, not a fixed verdict.`
    : locale === "ja"
      ? `${profile.nameEn}の${source.period}は、優先順位を整えるほど流れが活きる時期です。スコアは断定ではなく、行動のペースを考える目安として読んでください。`
      : locale === "zh-CN"
        ? `${profile.nameEn}在${source.period}的走势适合先整理优先事项。请把评分当作调整行动节奏的参考，而不是固定的结论。`
        : `${profile.nameEn}在${source.period}的走勢適合先整理優先事項。請把評分當作調整行動節奏的參考，而不是固定的結論。`;
  const weekDays = source.weekDays?.map((day) => ({ ...day, weekdayKo: new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : locale === "zh-TW" ? "zh-TW" : locale === "zh-CN" ? "zh-CN" : "en-US", { weekday: "short" }).format(new Date(`${day.ymd}T12:00:00Z`)), badge: copy.relationship }));
  return { ...source, profile, entry: { ...entry, saju_insight: narrative }, facts, highlights, weekDays, narrative, narrativeI18n: undefined, relation: source.relation ? { ...source.relation, badge: copy.relationship, detail: narrative, badgeI18n: undefined, detailI18n: undefined } : null } as SignViewModel;
}

export default function SignFortuneView({ vm: sourceVm, locale = "ko" }: { vm: SignViewModel; locale?: FortuneLocale }) {
  const vm = localizeViewModel(sourceVm, locale);
  const { profile, entry, period, score } = vm;
  const copy = FORTUNE_COPY[locale];
  const periodLabel = locale === "ko" ? PERIOD_LABEL[period] : ({ today: locale === "en" ? "Today" : locale === "ja" ? "今日" : locale === "zh-CN" ? "今日" : "今日", tomorrow: locale === "en" ? "Tomorrow" : locale === "ja" ? "明日" : locale === "zh-CN" ? "明日" : "明日", weekly: locale === "en" ? "This week" : locale === "ja" ? "今週" : locale === "zh-CN" ? "本周" : "本週", monthly: locale === "en" ? "This month" : locale === "ja" ? "今月" : locale === "zh-CN" ? "本月" : "本月" } as Record<string, string>)[period];
  const kindLabel = profile.kind === "zodiac" ? copy.zodiac : copy.animal;
  const siblings = getSiblingProfiles(profile.kind).map((item) => getLocalizedProfile(item, locale));
  const others = getSiblingProfiles(profile.kind === "zodiac" ? "animal" : "zodiac").map((item) => getLocalizedProfile(item, locale));
  const compatible = profile.bestWith.map(getSignProfile).filter(Boolean).map((item) => getLocalizedProfile(item!, locale)) as SignProfile[];
  const tricky = profile.challengeWith.map(getSignProfile).filter(Boolean).map((item) => getLocalizedProfile(item!, locale)) as SignProfile[];
  const prefix = locale === "ko" ? "" : `/${locale === "zh-TW" ? "zh-tw" : locale}`;
  const otherPeriods = (["today", "tomorrow", "weekly", "monthly"] as FortunePeriodId[]).filter((p) => p !== period);

  return (
    <main
      className={`cd-yeoni-surface min-h-screen bg-[linear-gradient(180deg,#fffaf7_0%,#fff3f8_44%,#fffaf7_100%)] pb-24 ${TEXT} dark:bg-[linear-gradient(165deg,#3a0e28_0%,#2e0a20_55%,#24081a_100%)]`}
    >
      <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 sm:pt-12">
        <nav aria-label="위치" className={`flex flex-wrap items-center gap-1.5 text-xs ${MUTED}`}>
          <Link href={`${prefix || ""}/`} className="hover:underline" data-cd-trans="home.nav.home">{copy.home}</Link>
          <span aria-hidden="true">›</span>
          <Link href={`${prefix}/today/`} className="hover:underline">{copy.today}</Link>
          <span aria-hidden="true">›</span>
          <Link href={`${prefix}/fortune/${period}/`} className="hover:underline">{`${periodLabel} ${kindLabel} ${copy.fortune}`}</Link>
          <span aria-hidden="true">›</span>
          <span className={ACCENT}>{profile.nameKo}</span>
        </nav>

        {/* 히어로 — 연이가 브랜드를 든다 */}
        <header className="mt-6 flex items-start gap-4 sm:gap-6">
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-bold tracking-wider ${ACCENT}`}>{vm.rangeLabel}</p>
            <h1 className="mt-3 break-keep text-3xl font-black leading-tight sm:text-4xl">
              <span aria-hidden="true" className="mr-2">{profile.symbol}</span>
              {`${profile.nameKo} ${locale === "ko" ? PERIOD_TITLE[period] : periodLabel} ${copy.fortune}`}
            </h1>
            <p className={`mt-3 break-keep text-sm leading-7 ${MUTED}`}>
              {`${profile.rangeLabel} · ${profile.element} · ${profile.ruler}`}
            </p>
          </div>
          <YeoniPortrait mood={moodForScore(score.overall)} size={104} priority className="mt-1" />
        </header>

        {/* 기간별 기준 값 — 매 기간 실제로 다른 값이다 */}
        <section aria-labelledby="facts-heading" className={`mt-8 p-5 ${CARD}`}>
          <h2 id="facts-heading" className={`break-keep text-sm font-extrabold ${ACCENT}`}>
            {`${periodLabel}의 기준 값`}
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            {vm.facts.map((fact) => (
              <div key={fact.label}>
                <dt className={`text-xs ${MUTED}`}>{fact.label}</dt>
                <dd {...markerAttrs(fact.valueI18n)} className="mt-0.5 break-keep font-bold">{fact.value}</dd>
              </div>
            ))}
          </dl>
          <p {...markerAttrs(vm.narrativeI18n)} className={`mt-4 break-keep text-sm leading-7 ${MUTED}`}>{vm.narrative}</p>
        </section>

        {vm.relation && (
          <section aria-labelledby="relation-heading" className="mt-4 rounded-2xl border border-[#ead089]/60 bg-[#fff8dc]/50 p-5 dark:border-[#ead089]/25 dark:bg-[#ead089]/[0.06]">
            <h2 id="relation-heading" className={`break-keep text-sm font-extrabold ${ACCENT}`}>
            {`${profile.nameKo} · ${periodLabel} ${copy.relationship}`}
            </h2>
            <p
              {...markerAttrs(vm.relation.badgeI18n)}
              className="mt-2 inline-block rounded-full border border-[#b31955]/35 px-3 py-1 text-xs font-bold text-[#b31955] dark:border-[rgba(255,196,222,0.4)] dark:text-[rgba(255,196,222,0.96)]"
            >
              {vm.relation.badge}
            </p>
            <p {...markerAttrs(vm.relation.detailI18n)} className="mt-3 break-keep text-sm leading-7">{vm.relation.detail}</p>
          </section>
        )}

        {/* 점수 + 산출 근거 */}
        <section aria-labelledby="score-heading" className="mt-8">
          <h2 id="score-heading" className="break-keep text-lg font-extrabold">
            {`${periodLabel} ${copy.score}`}
          </h2>
          <div className={`mt-4 p-5 ${CARD}`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[#b31955]/10 px-3 py-1 text-xs font-bold text-[#b31955] dark:bg-white/10 dark:text-[rgba(255,196,222,0.96)]">
                {entry.keyword.kr}
              </span>
              <span className={`text-2xl font-black tabular-nums ${ACCENT}`}>
                {score.overall}
                <span className={`text-sm font-bold ${MUTED}`}>/10</span>
              </span>
            </div>
            <div className="mt-5 space-y-2.5">
              {SCORE_AXES.map((axis) => (
                <ScoreBar key={axis.key} label={axisLabel(axis.key, locale)} score={score[axis.key]} />
              ))}
            </div>

            {/* 숫자를 감추지 않는다 — 어떤 값에서 나왔는지 그대로 적는다 */}
            <h3 className={`mt-6 break-keep text-xs font-extrabold ${ACCENT}`}>{copy.basis}</h3>
            <ul className="mt-2 space-y-1.5">
              {vm.basis.map((axis) => (
                <li key={axis.label} className={`flex flex-wrap items-baseline gap-x-2 break-keep text-xs leading-6 ${MUTED}`}>
                  <span className="font-bold">{axisLabel(axis.label, locale)}</span>
                  <span>{axis.value}</span>
                  <span className={`font-bold tabular-nums ${axis.delta > 0 ? "text-[#0f766e] dark:text-emerald-300" : axis.delta < 0 ? "text-[#b31955] dark:text-rose-300" : ""}`}>
                    {axis.delta > 0 ? `+${axis.delta}` : axis.delta}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 주간 전용 — 요일별 지도 */}
        {vm.weekDays && (
          <section aria-labelledby="week-heading" className="mt-8">
            <h2 id="week-heading" className="break-keep text-lg font-extrabold">{locale === "ko" ? "요일별 흐름" : locale === "ja" ? "曜日ごとの流れ" : locale === "en" ? "Flow by day" : "每日走势"}</h2>
            <p className={`mt-2 break-keep text-sm leading-7 ${MUTED}`}>
              {`같은 주라도 띠와 별자리마다 이 배치가 전부 다릅니다. 일진의 지지가 이 ${kindLabel}와 어떤 관계를 맺는지로 판정합니다.`}
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className={`w-full min-w-[30rem] border-collapse text-sm ${CARD}`}>
                <caption className="sr-only">{vm.rangeLabel} 요일별 일진과 총운</caption>
                <thead>
                  <tr className={`text-xs ${MUTED}`}>
                    <th scope="col" className="px-4 py-3 text-left font-bold">{locale === "en" ? "Date" : locale === "ja" ? "日付" : locale === "ko" ? "날짜" : "日期"}</th>
                    <th scope="col" className="px-4 py-3 text-left font-bold">{locale === "en" ? "Day" : locale === "ja" ? "曜日" : locale === "ko" ? "요일" : "星期"}</th>
                    <th scope="col" className="px-4 py-3 text-left font-bold">{locale === "en" ? "Pillar" : locale === "ja" ? "日柱" : locale === "ko" ? "일진" : "日柱"}</th>
                    <th scope="col" className="px-4 py-3 text-left font-bold">{copy.relationship}</th>
                    <th scope="col" className="px-4 py-3 text-right font-bold">{copy.overall}</th>
                  </tr>
                </thead>
                <tbody>
                  {vm.weekDays.map((day) => (
                    <tr key={day.ymd} className="border-t border-[#f4bed1]/50 dark:border-[rgba(244,190,209,0.2)]">
                      <td className="px-4 py-3 tabular-nums">{day.ymd.slice(5)}</td>
                      <td className="px-4 py-3">{day.weekdayKo}</td>
                      <td className="px-4 py-3 font-bold">{day.ganji}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          day.kind === "clash"
                            ? "bg-[#b31955]/12 text-[#b31955] dark:bg-rose-400/15 dark:text-rose-200"
                            : day.kind === "neutral"
                              ? `bg-black/[0.04] ${MUTED} dark:bg-white/5`
                              : "bg-[#0f766e]/10 text-[#0f766e] dark:bg-emerald-400/15 dark:text-emerald-200"
                        }`}>
                          {day.badge}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-bold tabular-nums ${ACCENT}`}>{day.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {vm.highlights && (
          <section aria-labelledby="highlight-heading" className="mt-8">
            <h2 id="highlight-heading" className="break-keep text-lg font-extrabold">
            {`${periodLabel} · ${copy.highlights}`}
            </h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {vm.highlights.map((row) => (
                <div key={row.label} className={`p-5 ${CARD}`}>
                  <dt className={`text-xs font-extrabold ${ACCENT}`}>{row.label}</dt>
                  <dd {...markerAttrs(row.valueI18n)} className="mt-1.5 break-keep text-sm leading-7">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* 상시 톤 — 날짜와 무관한 값이므로 라벨을 그렇게 붙인다 */}
        <section aria-labelledby="tone-heading" className="mt-12">
          <h2 id="tone-heading" className="break-keep text-lg font-extrabold">
            {`${profile.nameKo} · ${copy.profile}`}
          </h2>
          <p className={`mt-2 break-keep text-sm leading-7 ${MUTED}`}>
            {`아래는 날짜와 무관하게 이 ${kindLabel}가 늘 지니는 성향입니다. 위의 점수·관계가 그날그날 달라지는 부분이고, 이 문단은 그 위에 깔리는 바탕입니다.`}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {SCORE_AXES.map((axis) => (
              <article key={axis.key} className={`p-5 ${CARD}`}>
                <h3 className={`text-sm font-extrabold ${ACCENT}`}>{axisLabel(axis.key, locale)}</h3>
                <p className={`mt-2 break-keep text-sm leading-7 ${MUTED}`}>{entry.sections[axis.section].kr}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 행운 포인트 + 연이 서명 */}
        <section aria-labelledby="lucky-heading" className={`mt-8 p-5 ${CARD}`}>
          <h2 id="lucky-heading" className="break-keep text-lg font-extrabold">{`${periodLabel} · ${copy.lucky}`}</h2>
          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <div>
              <dt className={`text-xs ${MUTED}`}>{copy.luckyColor}</dt>
              <dd className={`mt-0.5 font-bold ${ACCENT}`}>{entry.lucky.color_kr}</dd>
            </div>
            <div>
              <dt className={`text-xs ${MUTED}`}>{copy.luckyNumber}</dt>
              <dd className={`mt-0.5 font-bold tabular-nums ${ACCENT}`}>{entry.lucky.number}</dd>
            </div>
            <div>
              <dt className={`text-xs ${MUTED}`}>{copy.keyword}</dt>
              <dd className={`mt-0.5 font-bold ${ACCENT}`}>{entry.keyword.kr}</dd>
            </div>
          </dl>
          <div className="mt-5 flex items-end gap-3">
            <YeoniPortrait mood="cheer" size={64} />
            <div className="min-w-0 flex-1">
              <p className="break-keep text-sm leading-7">{entry.sections.advice.kr}</p>
              <p className={`mt-2 text-xs font-bold ${ACCENT}`}>— 연이</p>
            </div>
          </div>
          {entry.planet_message?.kr && (
            <p className={`mt-3 break-keep text-sm leading-7 ${MUTED}`}>{entry.planet_message.kr}</p>
          )}
          {entry.saju_insight && (
            <p className={`mt-3 break-keep text-sm leading-7 ${MUTED}`}>{entry.saju_insight}</p>
          )}
        </section>

        {/* 상시 해설 */}
        <section aria-labelledby="profile-heading" className="mt-12">
          <h2 id="profile-heading" className="break-keep text-lg font-extrabold">
            {`${profile.nameKo} · ${copy.profile}`}
          </h2>
          <p className={`mt-3 break-keep text-sm leading-7 ${MUTED}`}>{profile.essence}</p>

          <h3 className={`mt-6 break-keep text-sm font-extrabold ${ACCENT}`}>{copy.strength}</h3>
          <p className={`mt-2 break-keep text-sm leading-7 ${MUTED}`}>{profile.strength}</p>

          <h3 className={`mt-5 break-keep text-sm font-extrabold ${ACCENT}`}>{copy.caution}</h3>
          <p className={`mt-2 break-keep text-sm leading-7 ${MUTED}`}>{profile.caution}</p>

          <h3 className={`mt-5 break-keep text-sm font-extrabold ${ACCENT}`}>{copy.habit}</h3>
          <p className={`mt-2 break-keep text-sm leading-7 ${MUTED}`}>{profile.luckyHabit}</p>

          <h3 className={`mt-5 break-keep text-sm font-extrabold ${ACCENT}`}>{copy.reading}</h3>
          <p className={`mt-2 break-keep text-sm leading-7 ${MUTED}`}>
            {locale === "ko" ? getPeriodReading(profile.id, period, profile.reading) : profile.reading}
          </p>
        </section>

        {/* 궁합 */}
        <section aria-labelledby="compat-heading" className="mt-12">
          <h2 id="compat-heading" className="break-keep text-lg font-extrabold">
            {`${profile.nameKo} · ${copy.compatible}`}
          </h2>
          <p className={`mt-2 break-keep text-sm leading-7 ${MUTED}`}>
            {profile.kind === "zodiac"
              ? locale === "en" ? "This comparison uses elemental trines and opposite signs." : locale === "ja" ? "同じ元素のトラインと向かい合う宮を基準に見ます。" : locale === "zh-CN" ? "以同元素三分相和对宫关系作为参考。" : "以同元素三分相與對宮關係作為參考。"
              : locale === "en" ? "This comparison uses the three-harmony and clash relationships of the zodiac." : locale === "ja" ? "十二支の三合と冲を基準に見ます。" : locale === "zh-CN" ? "以十二生肖的三合与相冲关系作为参考。" : "以十二生肖的三合與相沖關係作為參考。"}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#0f766e]/25 bg-[#0f766e]/[0.05] p-5 dark:border-emerald-300/25 dark:bg-emerald-400/[0.07]">
              <h3 className="text-sm font-extrabold text-[#0f766e] dark:text-emerald-200">{copy.compatible}</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {compatible.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`${prefix}/fortune/${period}/${item.id}/`}
                      className="inline-flex min-h-11 items-center rounded-full border border-[#0f766e]/30 px-3 text-xs font-bold text-[#0f766e] hover:bg-[#0f766e]/10 dark:border-emerald-300/30 dark:text-emerald-100"
                    >
                      {item.symbol} {item.nameKo}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-[#b31955]/25 bg-[#b31955]/[0.05] p-5 dark:border-rose-300/25 dark:bg-rose-400/[0.07]">
              <h3 className="text-sm font-extrabold text-[#b31955] dark:text-rose-200">{copy.tricky}</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {tricky.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`${prefix}/fortune/${period}/${item.id}/`}
                      className="inline-flex min-h-11 items-center rounded-full border border-[#b31955]/30 px-3 text-xs font-bold text-[#b31955] hover:bg-[#b31955]/10 dark:border-rose-300/30 dark:text-rose-100"
                    >
                      {item.symbol} {item.nameKo}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-heading" className="mt-12">
          <h2 id="faq-heading" className="break-keep text-lg font-extrabold">{locale === "ko" ? "자주 묻는 질문" : locale === "en" ? "Frequently asked questions" : locale === "ja" ? "よくある質問" : "常见问题"}</h2>
          <div className="mt-4 space-y-3">
            {(locale === "ko" ? buildPeriodFaqs(profile, period) : profile.faqs).map((faq) => (
              <details key={faq.question} className={`px-5 py-4 ${CARD}`}>
                <summary className="cursor-pointer list-none break-keep text-sm font-bold marker:content-none">
                  {faq.question}
                </summary>
                <p className={`mt-3 break-keep text-sm leading-7 ${MUTED}`}>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 기간 전환 + 전체 목록 */}
        <section aria-labelledby="more-heading" className="mt-12">
          <h2 id="more-heading" className="break-keep text-lg font-extrabold">
            {locale === "en" ? `Other ${kindLabel} readings` : locale === "ja" ? `他の期間の${kindLabel}運勢` : locale === "ko" ? `다른 기간과 다른 ${kindLabel}` : `其他期間的${kindLabel}運勢`}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {otherPeriods.map((p) => (
              <li key={p}>
                <Link
                  href={`${prefix}/fortune/${p}/${profile.id}/`}
                  className="inline-flex min-h-[44px] items-center rounded-full border border-[#b31955]/35 bg-[#b31955]/[0.06] px-5 text-sm font-bold text-[#b31955] hover:bg-[#b31955]/12 dark:border-[rgba(255,196,222,0.35)] dark:bg-white/[0.06] dark:text-[rgba(255,196,222,0.96)]"
                >
                  {`${profile.nameKo} ${locale === "ko" ? PERIOD_LABEL[p] : p === "today" ? (locale === "en" ? "Today" : locale === "ja" ? "今日" : "今日") : p === "tomorrow" ? (locale === "en" ? "Tomorrow" : locale === "ja" ? "明日" : "明日") : p === "weekly" ? (locale === "en" ? "This week" : locale === "ja" ? "今週" : locale === "zh-CN" ? "本周" : "本週") : (locale === "en" ? "This month" : locale === "ja" ? "今月" : locale === "zh-CN" ? "本月" : "本月")} ${copy.fortune} →`}
                </Link>
              </li>
            ))}
          </ul>

          <SignLinkGrid
            profiles={siblings}
            period={period}
            currentId={profile.id}
            heading={profile.kind === "zodiac" ? `${copy.zodiac} 12` : `${copy.animal} 12`}
            locale={locale}
          />
          <SignLinkGrid
            profiles={others}
            period={period}
            currentId=""
            heading={profile.kind === "zodiac" ? `${copy.animal} 12` : `${copy.zodiac} 12`}
            locale={locale}
          />
        </section>

        {/* 더 깊이 */}
        <section aria-labelledby="deeper-heading" className="mt-12">
          <h2 id="deeper-heading" className="break-keep text-lg font-extrabold">{locale === "ko" ? "하루 너머를 보고 싶다면" : locale === "en" ? "Go beyond today" : locale === "ja" ? "今日の先を読む" : "看看今日之外"}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link href={`${prefix}/today/`} className={`p-5 transition-colors hover:border-[#b31955]/40 ${CARD}`}>
              <span className="text-sm font-extrabold">{copy.today}</span>
              <span className={`mt-1 block break-keep text-xs leading-6 ${MUTED}`}>
                {locale === "en" ? "Read five systems in one place." : locale === "ja" ? "五つの占術を一か所で読み解きます。" : locale === "ko" ? "사주·숙요·베다·점성술·자미두수 다섯 체계를 한자리에서." : "在同一处查看五种体系。"}
              </span>
            </Link>
            <Link href={`${prefix}/saju/`} className={`p-5 transition-colors hover:border-[#b31955]/40 ${CARD}`}>
              <span className="text-sm font-extrabold">{locale === "en" ? "Saju reading" : locale === "ja" ? "四柱推命リーディング" : locale === "ko" ? "사주 풀이" : "四柱推命解读"}</span>
              <span className={`mt-1 block break-keep text-xs leading-6 ${MUTED}`}>
                {locale === "en" ? "A personal chart from your birth details." : locale === "ja" ? "生年月日と時間から見る自分の命式。" : locale === "ko" ? "태어난 연·월·일·시로 보는 나만의 명식." : "根据出生年月日时查看自己的命盘。"}
              </span>
            </Link>
            <Link href={`${prefix}/tarot/`} className={`p-5 transition-colors hover:border-[#b31955]/40 ${CARD}`}>
              <span className="text-sm font-extrabold">{locale === "en" ? "Tarot reading" : locale === "ja" ? "タロットリーディング" : locale === "ko" ? "타로 리딩" : "塔羅牌解读"}</span>
              <span className={`mt-1 block break-keep text-xs leading-6 ${MUTED}`}>
                {locale === "en" ? "A card-based view of your question." : locale === "ja" ? "今の問いにカードが示す答え。" : locale === "ko" ? "지금 이 질문에 대한 카드의 답." : "看看牌面对当下问题的回答。"}
              </span>
            </Link>
          </div>
        </section>

        <FusionCrossSell fromPath={`/fortune/${period}/${profile.id}`} tone="yeoni" />

        <p className={`mt-12 break-keep text-xs leading-6 ${MUTED}`}>
          이 페이지의 점수는 해당 기간의 일진·월건·절기·달의 위치를 실제로 계산해 각 별자리와 띠의 기질에 대입한 값이며,
          산출 근거를 위에 그대로 표시하고 있습니다. 사람이 매일 손으로 쓰는 글이 아니므로 같은 기간이면 언제 열어도 결과가 같습니다.
          결과는 참고 자료이며 의료·법률·투자 판단을 대신하지 않습니다.
        </p>
      </div>
    </main>
  );
}
