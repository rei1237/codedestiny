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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDailyFortune, type DailyFortune } from "@/lib/lock-screen-daily-fortune";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";

// 5종 전부 표시 — 사주·숙요·베다·점성술·자미두수
const HUB_SYSTEMS = ["saju", "sukuyo", "vedic", "astro", "ziwei"] as const;

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
// 로그인·생년 정보 없이도 응답하며, 실패하면 조용히 사라진다.
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
    <p className="mt-4 break-keep rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-7 text-indigo-50">
      <span className="font-semibold">🌙 오늘 달이 머무는 자리 </span>
      <span className="font-semibold text-amber-100">{moon.todayNakshatra.nameKo}</span>
      {moon.todaySukuyo && (
        <>
          {" · "}
          <span className="font-semibold text-blue-100">
            {moon.todaySukuyo.nameKo}({moon.todaySukuyo.nameHan})
          </span>
        </>
      )}
      {moon.todayNakshatra.lordKo && <span className="text-indigo-100/70">{` · 지배성 ${moon.todayNakshatra.lordKo}`}</span>}
    </p>
  );
}

function FortuneCard({ fortune }: { fortune: DailyFortune }) {
  return (
    <article className="flex min-h-[11.5rem] flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="text-lg">
          {fortune.emoji}
        </span>
        <h3 className="text-sm font-extrabold text-slate-100">{fortune.label}</h3>
        {fortune.personalized && (
          <span className="ml-auto rounded-full bg-rose-400/15 px-2 py-0.5 text-[11px] font-bold text-rose-200">
            내 생일 반영
          </span>
        )}
      </div>
      <p className="mt-3 text-xs font-semibold tracking-tight text-rose-200">{fortune.anchor}</p>
      <p className="mt-1 break-keep text-base font-bold leading-relaxed text-slate-50">{fortune.headline}</p>
      <p className="mt-2 max-w-[68ch] break-keep text-sm leading-7 text-slate-300">{fortune.body}</p>
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

  // fortunes 가 아직 비었을 때 안내 문구를 먼저 띄웠다 지우면 레이아웃이 튄다 — 계산 후에만 판단한다.
  const ready = fortunes.length > 0;
  const personalized = ready && fortunes.some((f) => f.personalized);

  // 카드 5장을 한 장의 이미지로 공유한다.
  const cardsRef = useRef<HTMLDivElement | null>(null);
  const [sharing, setSharing] = useState(false);
  const share = useCallback(async () => {
    const node = cardsRef.current;
    if (!node || sharing) return;
    setSharing(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(node, { backgroundColor: null, scale: 2, useCORS: true });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("capture failed");
      const file = new File([blob], "today-fortune.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: "오늘의 운세", text: "오늘의 운세를 확인해 보세요." });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "today-fortune.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // 사용자가 공유 시트를 닫은 경우까지 오류로 알리지 않는다
    } finally {
      setSharing(false);
    }
  }, [sharing]);

  return (
    <main
      style={{
        fontFamily: "'CodeDestinyBody', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
      className="min-h-screen bg-[#070A11] text-slate-100 pb-28 selection:bg-purple-500 selection:text-white"
    >
      {/* Background Decor Ambient Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] bg-gradient-to-b from-purple-900/25 via-indigo-900/15 to-transparent blur-3xl opacity-80" />
        <div className="absolute top-[500px] right-0 w-[600px] h-[600px] bg-amber-500/10 blur-3xl rounded-full" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16">
        {/* Navigation Header */}
        <div className="flex flex-col items-center text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 text-amber-300 text-xs sm:text-sm font-bold tracking-wider mb-5 backdrop-blur-md shadow-sm">
            <span>✨ CODE : DESTINY DAILY ORACLE</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-4 drop-shadow-md">
            오늘의 운세
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed sm:leading-loose">
            사주 일진, 숙요 27수, 베다 요일 지배성, 점성술, 자미두수 — 다섯 가지 운세를 한자리에서 봅니다. 로그인 없이 무료입니다.
          </p>
          {/* 날짜는 마운트 후에 채워진다 */}
          <p className="mt-3 min-h-[1.75rem] break-keep text-sm font-bold leading-7 text-amber-300">
            {now ? formatKstDate(now) : "\u00a0"}
          </p>
        </div>

        <TodayMoonStrip />

        {/* 5종 운세 카드 그리드 */}
        <div ref={cardsRef} className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {ready
            ? fortunes.map((fortune) => <FortuneCard key={fortune.system} fortune={fortune} />)
            : HUB_SYSTEMS.map((system) => (
                <div key={system} aria-hidden="true" className="min-h-[11.5rem] rounded-3xl border border-slate-700/50 bg-slate-900/60" />
              ))}
        </div>

        {ready && !personalized && (
          <p className="mt-6 break-keep rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm leading-7 text-rose-50">
            지금은 오늘 하루 전체의 흐름입니다. 프로필 카드에 생년월일을 넣어 두면 내 일간과 견주어 읽어 드려요.{" "}
            <Link href="/#dpMasterCard" className="font-bold text-rose-200 underline underline-offset-2">
              프로필 만들기
            </Link>
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={share}
            disabled={!ready || sharing}
            aria-busy={sharing}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-6 text-sm font-bold text-amber-200 transition-colors hover:border-amber-400/70 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sharing ? "이미지 만드는 중…" : "📸 오늘의 운세 공유하기"}
          </button>
        </div>

        {/* 더 깊게 보기 */}
        <h3 className="mt-16 break-keep text-lg font-extrabold text-white">더 깊게 보기</h3>
        <p className="mt-1 break-keep text-sm leading-7 text-slate-400">
          오늘 하루가 아니라 타고난 판을 보고 싶다면 아래로 이어집니다.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {DEEPER_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col rounded-2xl border border-slate-700/60 bg-slate-900/80 p-5 transition-colors hover:border-amber-400/40 hover:bg-slate-800/80"
            >
              <span aria-hidden="true" className="text-lg">
                {item.emoji}
              </span>
              <span className="mt-1 text-sm font-extrabold text-slate-100">{item.title}</span>
              <span className="mt-1 break-keep text-xs leading-6 text-slate-400">{item.desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}