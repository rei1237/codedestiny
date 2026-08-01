"use client";

// 오늘의 운세 허브 — /today 의 실기능부.
//
// 이 페이지는 오래 "매일 갱신되는 하루 운세"로 푸터·검색·서비스섹션에서 안내됐지만
// 실제로는 날짜가 바뀌어도 아무것도 변하지 않는 SEO 랜딩이었다. 그 안내를 실물로 만든다.
//
// 계산은 lib/lock-screen-daily-fortune.ts 의 getDailyFortune() 을 그대로 읽어 쓴다(read-only).
// output:"export" 정적 빌드라 빌드 시점 날짜가 굳지 않도록 반드시 마운트 후에 계산한다.
// 그래서 이 컴포넌트의 텍스트는 SEO 텍스트 카운트에 잡히지 않으며,
// 하단의 SeoLandingTemplate 콘텐츠가 배포 게이트(광고 불가·색인 가능 라우트 최소 1800자)를 지탱한다.
//
// 무료다. 어떤 결제 게이트도 로그인 요구도 걸지 않는다.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getDailyFortune, type DailyFortune } from "@/lib/lock-screen-daily-fortune";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";

// 홈 허브와 같은 3종만 쓴다 — 자미두수(명반 미사용)·점성술(태양궁 고정)은
// 오늘 값이 실제로 움직이지 않으므로 카드로 만들지 않고 심화 페이지로 보낸다.
const HUB_SYSTEMS = ["saju", "sukuyo", "vedic"] as const;

const DEEPER_LINKS = [
  { href: "/ziwei/chart", emoji: "🟣", title: "자미두수 명반", desc: "오늘 하루가 아니라 타고난 12궁의 판을 봅니다." },
  { href: "/astrology-ai", emoji: "✦", title: "서양 점성술 리딩", desc: "태양궁 너머, 출생 차트 전체를 읽습니다." },
  { href: "/nakshatra", emoji: "🕉️", title: "나크샤트라 코덱스", desc: "달의 별자리로 보는 인도 점성술." },
] as const;

interface TodayMoon {
  date?: string;
  todayNakshatra: { nameKo: string | null; lordKo: string | null } | null;
  todaySukuyo: { nameKo: string; nameHan: string } | null;
}

function formatKstDate(now: Date): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${kst.getUTCFullYear()}년 ${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 ${days[kst.getUTCDay()]}요일`;
}

// 실제 천체 계산(Swiss Ephemeris)으로 오늘 달이 머무는 자리를 가져온다.
// 로그인·생년 정보 없이도 응답하며, 실패하면 조용히 사라진다 — 위의 카드 3장은 이미 떠 있다.
function TodayMoonStrip() {
  const [moon, setMoon] = useState<TodayMoon | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/nakshatra/today")
      .then((r) => r.json())
      .then((d) => {
        if (active && d && d.ok) setMoon(d as TodayMoon);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!moon?.todayNakshatra?.nameKo) return null;

  return (
    <p className="mt-4 break-keep rounded-2xl border border-indigo-200/70 bg-indigo-50/70 px-4 py-3 text-sm leading-7 text-indigo-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-indigo-50">
      <span className="font-semibold">🌙 오늘 달이 머무는 자리 </span>
      <span className="font-semibold text-indigo-700 dark:text-amber-100">{moon.todayNakshatra.nameKo}</span>
      {moon.todaySukuyo && (
        <>
          {" · "}
          <span className="font-semibold text-indigo-700 dark:text-blue-100">
            {moon.todaySukuyo.nameKo}({moon.todaySukuyo.nameHan})
          </span>
        </>
      )}
      {moon.todayNakshatra.lordKo && <span className="text-indigo-800/80 dark:text-indigo-100/70">{` · 지배성 ${moon.todayNakshatra.lordKo}`}</span>}
    </p>
  );
}

function FortuneCard({ fortune }: { fortune: DailyFortune }) {
  return (
    <article className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="text-lg">
          {fortune.emoji}
        </span>
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{fortune.label}</h3>
        {fortune.personalized && (
          <span className="ml-auto rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-400/15 dark:text-rose-200">
            내 생일 반영
          </span>
        )}
      </div>
      <p className="mt-3 text-xs font-semibold tracking-tight text-rose-700 dark:text-rose-200">{fortune.anchor}</p>
      <p className="mt-1 break-keep text-base font-bold leading-relaxed text-slate-900 dark:text-slate-50">{fortune.headline}</p>
      <p className="mt-2 break-keep text-sm leading-7 text-slate-600 dark:text-slate-300">{fortune.body}</p>
    </article>
  );
}

export default function TodayHubClient() {
  const { seed } = useAiProfileSeed();
  // 마운트 후에만 계산한다(정적 빌드에 날짜가 굳는 것을 막고, 자정을 넘겨도 새로고침이면 갱신된다).
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);

  const fortunes = useMemo<DailyFortune[]>(() => {
    if (!now) return [];
    const input = { birthDate: seed?.birthDate || null, birthTime: seed?.birthTime || null };
    return HUB_SYSTEMS.map((system) => getDailyFortune(system, input, now));
  }, [now, seed?.birthDate, seed?.birthTime]);

  const personalized = fortunes.some((f) => f.personalized);

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pt-8 md:pt-12" aria-labelledby="today-hub-heading">
      <p className="text-xs font-bold tracking-widest text-rose-600 dark:text-rose-300">TODAY&apos;S FORTUNE</p>
      <h2 id="today-hub-heading" className="mt-1 break-keep text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 md:text-3xl">
        오늘의 운세
      </h2>
      <p className="mt-2 break-keep text-sm leading-7 text-slate-600 dark:text-slate-300">
        {now ? formatKstDate(now) : " "} · 사주 일진, 숙요 27수, 베다 요일 지배성을 한자리에서 봅니다. 로그인 없이 무료입니다.
      </p>

      <TodayMoonStrip />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {fortunes.length > 0
          ? fortunes.map((fortune) => <FortuneCard key={fortune.system} fortune={fortune} />)
          : // 계산 전 한 프레임 동안의 자리맡이 — 카드 높이만큼 잡아 레이아웃이 튀지 않게 한다.
            HUB_SYSTEMS.map((system) => (
              <div key={system} aria-hidden="true" className="h-44 rounded-3xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]" />
            ))}
      </div>

      {!personalized && (
        <p className="mt-4 break-keep rounded-2xl border border-rose-200/80 bg-rose-50/70 px-4 py-3 text-sm leading-7 text-rose-950 dark:border-rose-300/20 dark:bg-rose-400/10 dark:text-rose-50">
          지금은 오늘 하루 전체의 흐름입니다. 프로필 카드에 생년월일을 넣어 두면 내 일간과 견주어 읽어 드려요.{" "}
          <Link href="/#dpMasterCard" className="font-bold text-rose-700 underline underline-offset-2 dark:text-rose-200">
            프로필 만들기
          </Link>
        </p>
      )}

      <h3 className="mt-10 break-keep text-lg font-extrabold text-slate-900 dark:text-slate-50">더 깊게 보기</h3>
      <p className="mt-1 break-keep text-sm leading-7 text-slate-600 dark:text-slate-300">
        오늘 하루가 아니라 타고난 판을 보고 싶다면 아래로 이어집니다.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {DEEPER_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-rose-300 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-rose-300/40"
          >
            <span aria-hidden="true" className="text-lg">
              {item.emoji}
            </span>
            <span className="mt-1 text-sm font-extrabold text-slate-900 dark:text-slate-100">{item.title}</span>
            <span className="mt-1 break-keep text-xs leading-6 text-slate-600 dark:text-slate-300">{item.desc}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
