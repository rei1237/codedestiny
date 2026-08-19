"use client";

// 오늘의 운세 전용 화면 — /today 의 실기능부.
//
// 예전에는 lib/lock-screen-daily-fortune.ts(잠금화면용 오프라인 문구 풀)를 읽어 5장을 그렸다.
// 그 모듈은 네트워크 없이도 절대 백지가 되지 않는 것이 목적이라 날짜 해시로 문장을 고르는데,
// 그래서 **홈 위젯보다 얕았다** — 홈은 /api/fortune/today-hub 로 진짜 엔진(사주 일진 십성·
// 숙요 27수 격각·베다 판창가)을 돌리고 있었기 때문이다. 이제 이 화면도 같은 엔진을 쓴다.
// (그 모듈은 /lock-screen-fortune 이 계속 쓰므로 지우지 않는다.)
//
// 몰입형이다 — AppChrome 의 CHROMELESS_ROUTES·FEATURE_NAV_SELF_MANAGED_ROUTES 에 /today 가
// 있어 전역 헤더·푸터·공용 나브가 붙지 않는다. 상단바는 이 화면이 직접 그린다.
//
// 무료다. 어떤 결제 게이트도 로그인 요구도 걸지 않는다. 프로필 카드가 없으면 개인 판정
// (등급·점수)만 감추고 날짜만으로 참인 값은 그대로 보여 준다.
//
// output:"export" 정적 빌드라 날짜가 굳지 않도록 계산은 반드시 마운트 후에 한다.
// 배포 게이트(광고 불가·색인 가능 라우트 최소 1800자)를 지탱하는 것은 children 으로 들어오는
// 서버 렌더 해설(TodaySystemPrimer + TodayReadingGuide)이다 — 아래 카드는 한 글자도 안 센다.

import Link from "next/link";
import { FusionCrossSell } from "../components/FusionCrossSell";
import { ArrowLeft, Home } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getApiUrl } from "@/app/_lib/api-config";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { hardNavigateToShellHome } from "@/lib/navigation/shellHome";

interface DetailItem {
  label: string;
  value: string;
  note?: string;
}

interface DetailSection {
  key: string;
  title: string;
  items?: DetailItem[];
  lines?: string[];
}

interface SystemCard {
  system: TodaySystem;
  label: string;
  anchor: string;
  headline: string;
  body: string;
  tier: string | null;
  tierLabel: string | null;
  score: number | null;
  detail: string;
  personalized: boolean;
  highlights: string[];
  sections?: DetailSection[];
}

interface HubResponse {
  ok: boolean;
  date: string;
  personalized: boolean;
  systems: Partial<Record<TodaySystem, SystemCard | null>>;
}

type TodaySystem = "saju" | "sukuyo" | "vedic";

const TABS: readonly { key: TodaySystem; label: string; emoji: string; blurb: string }[] = [
  { key: "saju", label: "사주", emoji: "🎴", blurb: "오늘 일진의 천간·지지가 내 일간에 만드는 결" },
  { key: "sukuyo", label: "숙요점", emoji: "🌙", blurb: "달이 머무는 27수가 내 본명수에게 갖는 자리" },
  { key: "vedic", label: "베다점", emoji: "✨", blurb: "실제 달의 시데리얼 위치로 보는 오늘의 판창가" },
];

// 셸 렌더러(index.html)와 같은 등급→톤 매핑. 두 화면이 다른 색으로 같은 등급을 말하면 안 된다.
const TIER_TONE: Record<string, "good" | "pivot" | "warn"> = {
  "great-auspicious": "good",
  auspicious: "good",
  pivotal: "pivot",
  caution: "warn",
  "great-caution": "warn",
};

const TONE_CLASS: Record<string, string> = {
  good: "border-emerald-300/40 bg-emerald-400/12 text-emerald-100",
  pivot: "border-amber-300/40 bg-amber-400/12 text-amber-100",
  warn: "border-rose-300/40 bg-rose-400/12 text-rose-100",
};

const TONE_MARK: Record<string, string> = { good: "●", pivot: "◐", warn: "○" };

const DEEPER_LINKS = [
  { href: "/sukuyo/calendar", emoji: "🌙", title: "숙요 달력", desc: "이번 달 27수의 흐름을 한눈에 봅니다." },
  { href: "/nakshatra", emoji: "🕉️", title: "나크샤트라 코덱스", desc: "내 본명 별자리를 동양·인도 두 체계로 읽습니다." },
  { href: "/ziwei/chart", emoji: "🟣", title: "자미두수 명반", desc: "오늘 하루가 아니라 타고난 12궁의 판을 봅니다." },
] as const;

function formatKstDate(now: Date): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${kst.getUTCFullYear()}년 ${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 ${days[kst.getUTCDay()]}요일`;
}

function TopNav() {
  const goBack = useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.history.length <= 1) {
      hardNavigateToShellHome();
      return;
    }
    const startPath = `${window.location.pathname}${window.location.search}`;
    window.history.back();
    // SPA 라우팅이라 back 이 먹히지 않는 경우가 있어 짧게 확인 후 홈으로 폴백한다.
    window.setTimeout(() => {
      if (`${window.location.pathname}${window.location.search}` === startPath) hardNavigateToShellHome();
    }, 240);
  }, []);

  const buttonClass =
    "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-white/16 bg-white/[0.06] px-4 text-[13px] font-bold text-slate-100 backdrop-blur-md transition-colors hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70";

  return (
    <nav aria-label="오늘의 운세 내비게이션" className="flex items-center gap-2">
      <button type="button" onClick={goBack} className={`${buttonClass} min-w-11 px-3`} aria-label="이전 페이지로 이동">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        <span className="hidden sm:inline">뒤로</span>
      </button>
      <button type="button" onClick={() => hardNavigateToShellHome()} className={buttonClass}>
        <Home aria-hidden="true" className="h-4 w-4" />홈
      </button>
    </nav>
  );
}

function VerdictBadge({ card }: { card: SystemCard }) {
  if (!card.tierLabel || card.score == null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/16 bg-white/[0.06] px-3 py-1 text-xs font-bold text-slate-200">
        <span aria-hidden="true">◇</span>
        오늘 하루의 흐름
      </span>
    );
  }
  const tone = TIER_TONE[card.tier || ""] || "pivot";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${TONE_CLASS[tone]}`}>
      <span aria-hidden="true">{TONE_MARK[tone]}</span>
      {card.tierLabel}
      <span className="opacity-80">{card.score}점</span>
    </span>
  );
}

function SectionBlock({ section }: { section: DetailSection }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <h3 className="break-keep text-sm font-extrabold tracking-tight text-amber-200">{section.title}</h3>
      {section.items && section.items.length > 0 && (
        <dl className="mt-3 space-y-3">
          {section.items.map((item) => (
            <div key={`${item.label}-${item.value}`} className="grid gap-1 sm:grid-cols-[8.5rem_1fr] sm:gap-3">
              <dt className="break-keep text-xs font-bold leading-6 text-slate-400">{item.label}</dt>
              <dd className="break-keep text-sm leading-7 text-slate-100">
                <span className="font-semibold">{item.value}</span>
                {item.note && <span className="mt-0.5 block text-[13px] leading-6 text-slate-400">{item.note}</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {section.lines && section.lines.length > 0 && (
        <ul className="mt-3 space-y-2">
          {section.lines.map((line) => (
            <li key={line} className="flex gap-2.5 break-keep text-sm leading-7 text-slate-200">
              <span aria-hidden="true" className="mt-3 h-1 w-1 shrink-0 rounded-full bg-amber-300/70" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CardPanel({ card, tab }: { card: SystemCard | null | undefined; tab: (typeof TABS)[number] }) {
  if (!card) {
    return (
      <p className="break-keep rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-6 text-sm leading-7 text-slate-300">
        {tab.label} 계산이 잠시 지연되고 있습니다. 다른 점술은 그대로 보실 수 있고, 새로고침하면 다시 시도합니다.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/12 bg-white/[0.05] p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-bold tracking-tight text-rose-200">{card.anchor}</p>
          <span className="ml-auto">
            <VerdictBadge card={card} />
          </span>
        </div>
        <h2 className="mt-3 break-keep text-lg font-black leading-8 text-white sm:text-xl">{card.headline}</h2>
        <p className="mt-2 max-w-[64ch] break-keep text-sm leading-7 text-slate-200">{card.body}</p>
        {card.detail && <p className="mt-3 break-keep text-xs leading-6 text-slate-400">{card.detail}</p>}
        {card.highlights.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {card.highlights.map((highlight) => (
              <li
                key={highlight}
                className="break-keep rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-xs font-semibold leading-5 text-amber-100"
              >
                {highlight}
              </li>
            ))}
          </ul>
        )}
      </div>
      {(card.sections || []).map((section) => (
        <SectionBlock key={section.key} section={section} />
      ))}
    </div>
  );
}

export default function TodayHubClient({ children }: { children?: ReactNode }) {
  const { seed, seedVersion } = useAiProfileSeed();
  // 마운트 후에만 계산한다(정적 빌드에 날짜가 굳는 것을 막고, 자정을 넘겨도 새로고침이면 갱신된다).
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);

  const [data, setData] = useState<HubResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState<TodaySystem>("saju");
  const [reloadToken, setReloadToken] = useState(0);

  const query = useMemo(() => {
    const params = new URLSearchParams({ detail: "1" });
    if (seed?.birthDate) {
      params.set("birth", seed.birthDate);
      if (seed.birthTime && !seed.birthTimeUnknown) params.set("time", seed.birthTime);
      params.set("cal", seed.calendarType === "lunar" ? "lunar" : "solar");
      params.set("gender", seed.gender === "male" ? "male" : "female");
    }
    return params.toString();
  }, [seed?.birthDate, seed?.birthTime, seed?.birthTimeUnknown, seed?.calendarType, seed?.gender]);

  useEffect(() => {
    if (!now) return undefined;
    let active2 = true;
    setFailed(false);
    fetch(getApiUrl(`/api/fortune/today-hub?${query}`), { credentials: "omit" })
      .then((res) => {
        if (!res.ok) throw new Error(`http_${res.status}`);
        return res.json();
      })
      .then((payload: HubResponse) => {
        if (!active2) return;
        if (!payload?.ok) throw new Error("not_ok");
        setData(payload);
      })
      .catch(() => {
        if (active2) setFailed(true);
      });
    return () => {
      active2 = false;
    };
    // seedVersion 은 프로필 카드가 뒤늦게 도착했을 때(로그인 사용자의 서버 동기화) 다시 계산하려고 둔다.
  }, [now, query, seedVersion, reloadToken]);

  // 탭 화살표 이동 — 홈 셸의 허브와 같은 WAI-ARIA roving tabindex 규칙.
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const moveTab = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const index = TABS.findIndex((tab) => tab.key === active);
    const next = TABS[(index + step + TABS.length) % TABS.length];
    setActive(next.key);
    tabRefs.current[next.key]?.focus();
  }, [active]);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const [sharing, setSharing] = useState(false);
  const share = useCallback(async () => {
    const node = panelRef.current;
    if (!node || sharing) return;
    setSharing(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(node, { backgroundColor: "#070A11", scale: 2, useCORS: true });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("capture failed");
      const file = new File([blob], "today-fortune.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: "오늘의 운세", text: "오늘의 운세를 확인해 보세요." });
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "today-fortune.png";
        anchor.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // 사용자가 공유 시트를 닫은 경우까지 오류로 알리지 않는다
    } finally {
      setSharing(false);
    }
  }, [sharing]);

  const personalized = Boolean(data?.personalized);
  const activeTab = TABS.find((tab) => tab.key === active) || TABS[0];

  return (
    <main className="relative min-h-[100dvh] bg-[#070A11] pb-28 text-slate-100 selection:bg-purple-500 selection:text-white">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[600px] w-[1100px] -translate-x-1/2 bg-gradient-to-b from-purple-900/25 via-indigo-900/15 to-transparent opacity-80 blur-3xl" />
        <div className="absolute right-0 top-[500px] h-[600px] w-[600px] rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 pt-[calc(env(safe-area-inset-top,0px)+14px)] sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <TopNav />
          <p className="break-keep text-right text-xs font-bold leading-5 text-amber-300 sm:text-sm">
            {now ? formatKstDate(now) : " "}
          </p>
        </div>

        <header className="mt-8 text-center sm:mt-12">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/15 px-4 py-1.5 text-xs font-bold tracking-wider text-amber-300 backdrop-blur-md">
            ✨ CODE : DESTINY DAILY ORACLE
          </p>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-white drop-shadow-md sm:text-5xl">오늘의 운세</h1>
          <p className="mx-auto mt-4 max-w-2xl break-keep text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">
            사주 일진, 숙요 27수, 베다 판창가 — 세 체계가 각자의 방식으로 오늘 하루를 읽습니다. 로그인 없이 무료입니다.
          </p>
        </header>

        {/* 탭 */}
        <div role="tablist" aria-label="오늘의 운세 점술 전환" className="mt-8 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5">
          {TABS.map((tab) => {
            const selected = tab.key === active;
            return (
              <button
                key={tab.key}
                ref={(node) => {
                  tabRefs.current[tab.key] = node;
                }}
                type="button"
                role="tab"
                id={`today-tab-${tab.key}`}
                aria-selected={selected}
                aria-controls={`today-panel-${tab.key}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(tab.key)}
                onKeyDown={moveTab}
                className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-bold transition-colors ${
                  selected ? "bg-amber-400/20 text-amber-100" : "text-slate-300 hover:bg-white/[0.06]"
                }`}
              >
                <span aria-hidden="true">{tab.emoji}</span>
                {tab.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2.5 break-keep text-center text-xs leading-6 text-slate-400">{activeTab.blurb}</p>

        {/* 결과 */}
        <div
          ref={panelRef}
          role="tabpanel"
          id={`today-panel-${active}`}
          aria-labelledby={`today-tab-${active}`}
          aria-live="polite"
          className="mt-5"
        >
          {failed ? (
            <div className="rounded-3xl border border-rose-300/25 bg-rose-400/10 px-5 py-6">
              <p className="break-keep text-sm leading-7 text-rose-50">
                오늘의 운세를 계산하지 못했습니다. 잠시 후 다시 시도해 주세요.
              </p>
              <button
                type="button"
                onClick={() => setReloadToken((token) => token + 1)}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-rose-200/40 bg-rose-400/15 px-5 text-sm font-bold text-rose-50 transition-colors hover:bg-rose-400/25"
              >
                다시 시도
              </button>
            </div>
          ) : data ? (
            <CardPanel card={data.systems[active]} tab={activeTab} />
          ) : (
            <div aria-hidden="true" className="min-h-[16rem] rounded-3xl border border-white/8 bg-white/[0.03]" />
          )}
        </div>

        {/* 프로필 유도 — 날짜 기반 값은 이미 위에 나와 있고, 여기서 개인 판정을 권한다. */}
        {data && !personalized && (
          <p className="mt-6 break-keep rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm leading-7 text-rose-50">
            지금 보시는 것은 <strong className="font-bold">날짜만으로 정해지는 하루 전체의 흐름</strong>입니다. 프로필 카드에 생년월일을 넣으면 내 일간·본명수와 견주어 오늘이 대길일인지 주의일인지까지 짚어 드려요.{" "}
            <Link href="/#dpMasterCard" className="font-bold text-rose-200 underline underline-offset-2">
              프로필 만들기
            </Link>
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={share}
            disabled={!data || sharing}
            aria-busy={sharing}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-6 text-sm font-bold text-amber-200 transition-colors hover:border-amber-400/70 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sharing ? "이미지 만드는 중…" : `📸 ${activeTab.label} 결과 공유하기`}
          </button>
        </div>

        {children}

        <h2 className="mt-16 break-keep text-lg font-extrabold text-white">더 깊게 보기</h2>
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

        <FusionCrossSell fromPath="/today" tone="neo" />
      </div>
    </main>
  );
}
