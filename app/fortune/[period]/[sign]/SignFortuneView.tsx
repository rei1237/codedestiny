/**
 * 별자리·띠 하루 운세 본문 — 서버 컴포넌트.
 *
 * 🔴 클라이언트 컴포넌트로 바꾸지 말 것. scripts/verify-adsense-readiness.mjs 는 서버 렌더
 *    텍스트만 세고 기준 미달이면 배포를 실패시킨다. 이 라우트가 광고 게재 대상이므로 기준은
 *    1200자다. 예전 fortune/*.html 이 색인에서 사라진 이유가 정확히 "본문을 브라우저에서
 *    그렸다"는 것이었다.
 */
import Link from "next/link";
import type { DailyPackage, DailySignEntry, FortunePeriod } from "@/lib/fortune/daily-data";
import { formatKoreanDate } from "@/lib/fortune/daily-data";
import type { SignProfile } from "@/lib/fortune/sign-profiles";
import { getSignProfile, getSiblingProfiles } from "@/lib/fortune/sign-profiles";
import { animalDayRelation, zodiacDayRelation } from "@/lib/fortune/day-relation";

const PERIOD_LABEL: Record<FortunePeriod, string> = {
  today: "오늘",
  tomorrow: "내일",
};

const SCORE_AXES = [
  { key: "love", label: "애정운", section: "love" },
  { key: "money", label: "재물운", section: "money" },
  { key: "health", label: "건강운", section: "health" },
  { key: "work", label: "직장운", section: "work" },
] as const;

/** 점수는 실측상 5~9 범위로 나온다. 10점 만점 막대로 그린다. */
function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = Math.max(0, Math.min(100, score * 10));
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-xs font-bold text-slate-400">{label}</span>
      <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-amber-300/80"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="w-10 shrink-0 text-right text-xs font-bold tabular-nums text-amber-200">
        {score}/10
      </span>
    </div>
  );
}

function SignLinkGrid({ profiles, period, currentId, heading }: {
  profiles: SignProfile[];
  period: FortunePeriod;
  currentId: string;
  heading: string;
}) {
  return (
    <>
      <h3 className="mt-8 break-keep text-sm font-extrabold text-amber-200">{heading}</h3>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {profiles.map((item) => {
          const isCurrent = item.id === currentId;
          return (
            <li key={item.id}>
              <Link
                href={`/fortune/${period}/${item.id}/`}
                aria-current={isCurrent ? "page" : undefined}
                className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                  isCurrent
                    ? "border-amber-400/60 bg-amber-400/15 text-amber-100"
                    : "border-slate-700/60 bg-slate-900/70 text-slate-300 hover:border-amber-400/40 hover:text-amber-100"
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

export default function SignFortuneView({
  profile,
  entry,
  pkg,
  period,
  date,
}: {
  profile: SignProfile;
  entry: DailySignEntry;
  pkg: DailyPackage;
  period: FortunePeriod;
  date: string;
}) {
  const periodLabel = PERIOD_LABEL[period];
  const otherPeriod: FortunePeriod = period === "today" ? "tomorrow" : "today";
  const relation =
    profile.kind === "animal"
      ? animalDayRelation(profile.id, pkg.calendar.ilchin)
      : zodiacDayRelation(profile, date, pkg.sky_today.moon_sign);

  const siblings = getSiblingProfiles(profile.kind);
  const others = getSiblingProfiles(profile.kind === "zodiac" ? "animal" : "zodiac");
  const compatible = profile.bestWith.map(getSignProfile).filter(Boolean) as SignProfile[];
  const tricky = profile.challengeWith.map(getSignProfile).filter(Boolean) as SignProfile[];

  return (
    <main className="min-h-screen bg-[#070A11] pb-24 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 sm:pt-12">
        <nav aria-label="위치" className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <Link href="/" className="hover:text-amber-200">홈</Link>
          <span aria-hidden="true">›</span>
          <Link href="/today/" className="hover:text-amber-200">오늘의 운세</Link>
          <span aria-hidden="true">›</span>
          <Link href={`/fortune/${period}/`} className="hover:text-amber-200">
            {periodLabel}의 {profile.kind === "zodiac" ? "별자리" : "띠"} 운세
          </Link>
          <span aria-hidden="true">›</span>
          <span className="text-slate-300">{profile.nameKo}</span>
        </nav>

        <header className="mt-6">
          <p className="text-xs font-bold tracking-wider text-amber-300">
            {formatKoreanDate(date)} · {pkg.calendar.lunar_date}
          </p>
          <h1 className="mt-3 break-keep text-3xl font-black leading-tight text-white sm:text-4xl">
            <span aria-hidden="true" className="mr-2">{profile.symbol}</span>
            {profile.nameKo} {periodLabel}의 운세
          </h1>
          <p className="mt-3 break-keep text-sm leading-7 text-slate-400">
            {profile.rangeLabel} · {profile.element} · {profile.ruler}
          </p>
        </header>

        {/* 그날의 실제 역법 값 — 매일 바뀐다 */}
        <section aria-labelledby="sky-heading" className="mt-8 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5">
          <h2 id="sky-heading" className="break-keep text-sm font-extrabold text-amber-200">
            {periodLabel}의 하늘과 일진
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-slate-500">일진</dt>
              <dd className="mt-0.5 font-bold text-slate-100">{pkg.calendar.ilchin}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">월건</dt>
              <dd className="mt-0.5 font-bold text-slate-100">{pkg.calendar.wolgeon}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">세운</dt>
              <dd className="mt-0.5 font-bold text-slate-100">{pkg.calendar.year_ganji}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">달의 위상</dt>
              <dd className="mt-0.5 font-bold text-slate-100">{pkg.sky_today.moon_phase}</dd>
            </div>
          </dl>
          <p className="mt-4 break-keep text-sm leading-7 text-slate-300">
            절기는 {pkg.calendar.current_jeolgi} 구간이고, 달은 {pkg.sky_today.moon_sign} 자리를 지납니다.
            이번 달 삭(신월)은 {pkg.sky_today.this_month_new_moon}, 망(보름)은 {pkg.sky_today.this_month_full_moon} 입니다.
          </p>
        </section>

        {relation && (
          <section aria-labelledby="relation-heading" className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-5">
            <h2 id="relation-heading" className="break-keep text-sm font-extrabold text-amber-200">
              {profile.nameKo}와 {periodLabel} 일진의 관계
            </h2>
            <p className="mt-2 inline-block rounded-full border border-amber-400/40 px-3 py-1 text-xs font-bold text-amber-100">
              {relation.badge}
            </p>
            <p className="mt-3 break-keep text-sm leading-7 text-amber-50/90">{relation.detail}</p>
          </section>
        )}

        {/* 총운 */}
        <section aria-labelledby="overall-heading" className="mt-8">
          <h2 id="overall-heading" className="break-keep text-lg font-extrabold text-white">
            {periodLabel}의 총운
          </h2>
          <div className="mt-4 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-200">
                {entry.keyword.kr}
              </span>
              <span className="text-2xl font-black tabular-nums text-amber-300">
                {entry.score.overall}
                <span className="text-sm font-bold text-slate-500">/10</span>
              </span>
            </div>
            <p className="mt-4 break-keep text-base leading-8 text-slate-100">{entry.sections.overall.kr}</p>
            <div className="mt-5 space-y-2.5">
              {SCORE_AXES.map((axis) => (
                <ScoreBar key={axis.key} label={axis.label} score={entry.score[axis.key]} />
              ))}
            </div>
          </div>
        </section>

        {/* 세부 4종 */}
        <section aria-labelledby="detail-heading" className="mt-8">
          <h2 id="detail-heading" className="break-keep text-lg font-extrabold text-white">
            영역별 풀이
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {SCORE_AXES.map((axis) => (
              <article key={axis.key} className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-extrabold text-amber-200">{axis.label}</h3>
                  <span className="text-sm font-bold tabular-nums text-slate-400">
                    {entry.score[axis.key]}/10
                  </span>
                </div>
                <p className="mt-2 break-keep text-sm leading-7 text-slate-300">
                  {entry.sections[axis.section].kr}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* 행운 요소 + 조언 */}
        <section aria-labelledby="lucky-heading" className="mt-8 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5">
          <h2 id="lucky-heading" className="break-keep text-lg font-extrabold text-white">
            {periodLabel}의 행운 포인트
          </h2>
          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500">행운의 색</dt>
              <dd className="mt-0.5 font-bold text-amber-200">{entry.lucky.color_kr}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">행운의 숫자</dt>
              <dd className="mt-0.5 font-bold tabular-nums text-amber-200">{entry.lucky.number}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">키워드</dt>
              <dd className="mt-0.5 font-bold text-amber-200">{entry.keyword.kr}</dd>
            </div>
          </dl>
          <p className="mt-4 break-keep text-sm leading-7 text-slate-300">{entry.sections.advice.kr}</p>
          {entry.planet_message?.kr && (
            <p className="mt-3 break-keep text-sm leading-7 text-slate-400">{entry.planet_message.kr}</p>
          )}
          {entry.saju_insight && (
            <p className="mt-3 break-keep text-sm leading-7 text-slate-400">{entry.saju_insight}</p>
          )}
        </section>

        {/* 상시 해설 — 페이지마다 고유 */}
        <section aria-labelledby="profile-heading" className="mt-12">
          <h2 id="profile-heading" className="break-keep text-lg font-extrabold text-white">
            {profile.nameKo}는 어떤 기질인가
          </h2>
          <p className="mt-3 break-keep text-sm leading-7 text-slate-300">{profile.essence}</p>

          <h3 className="mt-6 break-keep text-sm font-extrabold text-amber-200">강점</h3>
          <p className="mt-2 break-keep text-sm leading-7 text-slate-300">{profile.strength}</p>

          <h3 className="mt-5 break-keep text-sm font-extrabold text-amber-200">주의할 결</h3>
          <p className="mt-2 break-keep text-sm leading-7 text-slate-300">{profile.caution}</p>

          <h3 className="mt-5 break-keep text-sm font-extrabold text-amber-200">행운을 부르는 습관</h3>
          <p className="mt-2 break-keep text-sm leading-7 text-slate-300">{profile.luckyHabit}</p>

          <h3 className="mt-5 break-keep text-sm font-extrabold text-amber-200">이 운세를 읽는 법</h3>
          <p className="mt-2 break-keep text-sm leading-7 text-slate-300">{profile.reading}</p>
        </section>

        {/* 궁합 */}
        <section aria-labelledby="compat-heading" className="mt-12">
          <h2 id="compat-heading" className="break-keep text-lg font-extrabold text-white">
            {profile.nameKo}와 잘 맞는 상대
          </h2>
          <p className="mt-2 break-keep text-sm leading-7 text-slate-400">
            {profile.kind === "zodiac"
              ? "같은 원소끼리 이루는 삼각 관계와 마주 보는 대칭궁을 기준으로 봅니다."
              : "십이지의 삼합(三合)과 충(沖)을 기준으로 봅니다."}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-5">
              <h3 className="text-sm font-extrabold text-emerald-200">흐름이 맞는 쪽</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {compatible.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/fortune/${period}/${item.id}/`}
                      className="inline-flex min-h-[36px] items-center rounded-full border border-emerald-400/30 px-3 text-xs font-bold text-emerald-100 hover:bg-emerald-400/10"
                    >
                      {item.symbol} {item.nameKo}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-rose-400/25 bg-rose-400/[0.06] p-5">
              <h3 className="text-sm font-extrabold text-rose-200">조율이 필요한 쪽</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {tricky.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/fortune/${period}/${item.id}/`}
                      className="inline-flex min-h-[36px] items-center rounded-full border border-rose-400/30 px-3 text-xs font-bold text-rose-100 hover:bg-rose-400/10"
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
          <h2 id="faq-heading" className="break-keep text-lg font-extrabold text-white">
            자주 묻는 질문
          </h2>
          <div className="mt-4 space-y-3">
            {profile.faqs.map((faq) => (
              <details
                key={faq.question}
                className="rounded-2xl border border-slate-700/60 bg-slate-900/70 px-5 py-4"
              >
                <summary className="cursor-pointer list-none break-keep text-sm font-bold text-slate-100 marker:content-none">
                  {faq.question}
                </summary>
                <p className="mt-3 break-keep text-sm leading-7 text-slate-300">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 기간 전환 + 전체 목록 */}
        <section aria-labelledby="more-heading" className="mt-12">
          <h2 id="more-heading" className="break-keep text-lg font-extrabold text-white">
            다른 날짜와 다른 {profile.kind === "zodiac" ? "별자리" : "띠"}
          </h2>
          <p className="mt-3">
            <Link
              href={`/fortune/${otherPeriod}/${profile.id}/`}
              className="inline-flex min-h-[44px] items-center rounded-full border border-amber-400/40 bg-amber-400/10 px-5 text-sm font-bold text-amber-200 hover:bg-amber-400/20"
            >
              {profile.nameKo} {PERIOD_LABEL[otherPeriod]}의 운세 보기 →
            </Link>
          </p>

          <SignLinkGrid
            profiles={siblings}
            period={period}
            currentId={profile.id}
            heading={profile.kind === "zodiac" ? "별자리 12종" : "띠 12종"}
          />
          <SignLinkGrid
            profiles={others}
            period={period}
            currentId=""
            heading={profile.kind === "zodiac" ? "띠 12종" : "별자리 12종"}
          />
        </section>

        {/* 더 깊이 */}
        <section aria-labelledby="deeper-heading" className="mt-12">
          <h2 id="deeper-heading" className="break-keep text-lg font-extrabold text-white">
            하루 너머를 보고 싶다면
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link href="/today/" className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5 hover:border-amber-400/40">
              <span className="text-sm font-extrabold text-slate-100">오늘의 운세 허브</span>
              <span className="mt-1 block break-keep text-xs leading-6 text-slate-400">
                사주·숙요·베다·점성술·자미두수 다섯 체계를 한자리에서.
              </span>
            </Link>
            <Link href="/saju/" className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5 hover:border-amber-400/40">
              <span className="text-sm font-extrabold text-slate-100">사주 풀이</span>
              <span className="mt-1 block break-keep text-xs leading-6 text-slate-400">
                태어난 연·월·일·시로 보는 나만의 명식.
              </span>
            </Link>
            <Link href="/tarot/" className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5 hover:border-amber-400/40">
              <span className="text-sm font-extrabold text-slate-100">타로 리딩</span>
              <span className="mt-1 block break-keep text-xs leading-6 text-slate-400">
                지금 이 질문에 대한 카드의 답.
              </span>
            </Link>
          </div>
        </section>

        <p className="mt-12 break-keep text-xs leading-6 text-slate-500">
          이 페이지의 운세는 해당 날짜의 일진 간지·월건·절기·달 위상을 실제로 계산한 값을 각 별자리와 띠의
          기질에 대입해 만듭니다. 사람이 매일 손으로 쓰는 글이 아니므로 같은 날이면 언제 열어도 결과가 같습니다.
          결과는 참고 자료이며 의료·법률·투자 판단을 대신하지 않습니다.
        </p>
      </div>
    </main>
  );
}
