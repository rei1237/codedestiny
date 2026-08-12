"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { NAKSHATRA_RESULT_STORAGE_KEY } from "../NakshatraFormClient";

interface CrosswalkMatch {
  sukuyoIdx: number;
  nakshatraIdx: number;
  expectedNakshatraIdx: number;
  match: boolean;
  deltaSteps: number;
  boundary: boolean;
}
interface Dongyang {
  index: number;
  nameKo: string;
  nameHan: string;
  direction: string;
  sevenLuminary: string;
  fourSymbol: string;
  archetypeTitle: string;
  keywords: string[];
  strengths: string[];
  shadows: string[];
  easternExpert?: string | null;
}
interface PadaDetail {
  pada: number;
  navamsaSign: string;
  navamsaSignKo: string;
  navamsaLord: string;
}
interface India {
  index: number;
  nameEn: string;
  nameKo: string;
  lordKo: string;
  ganaKo: string;
  yoni: string;
  nadiKo: string;
  deity: string;
  deityRole: string;
  deityKw: string[];
  motiveKo: string;
  pada: number | null;
  padaDetail: PadaDetail | null;
  dasha: {
    currentMahadashaKo: string;
    currentAntardashaKo: string;
    current: { startDate?: string; endDate?: string } | null;
  } | null;
  indianExpert?: string | null;
}
interface Unified {
  fusionTitle: string;
  easternKeywords: string[];
  convergence: string;
  divergence: string;
  fusionReading: string;
  crosswalk: CrosswalkMatch;
  boundaryNote: string | null;
}
interface Transparency {
  ayanamsa: string;
  siderealMoonLongitude: number | null;
  pada: number | null;
  timeUnknown: boolean;
}
interface ResolveResult {
  ok: boolean;
  input?: { year: number; month: number; day: number; hour: number; minute: number; timeUnknown: boolean };
  summary: { sukuyoHan: string; nakshatraKo: string; nakshatraEn: string; fusionTitle: string; lordKo: string; pada: number | null; ganaKo: string };
  dongyang: Dongyang;
  india: India;
  unified: Unified;
  transparency: Transparency;
}

type ViewMode = "both" | "east" | "india" | "unified";

const VIEW_TABS: { key: ViewMode; label: string }[] = [
  { key: "both", label: "동시" },
  { key: "east", label: "☯ 동양" },
  { key: "india", label: "🕉 인도" },
  { key: "unified", label: "⟡ 통합" },
];

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-slate-100">
      {children}
    </span>
  );
}

function Row({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/10 py-2 last:border-0">
      <dt className="shrink-0 text-xs font-semibold text-slate-300" title={hint}>
        {label}
        {hint && <span className="ml-1 cursor-help text-slate-400">ⓘ</span>}
      </dt>
      <dd className="min-w-0 break-keep text-right text-sm font-medium text-slate-50">{value}</dd>
    </div>
  );
}

export default function NakshatraResultClient() {
  const [data, setData] = useState<ResolveResult | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<ViewMode>("both");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(NAKSHATRA_RESULT_STORAGE_KEY);
      if (raw) setData(JSON.parse(raw));
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  if (loaded && !data) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[#070812] px-5 text-center text-slate-100">
        <div className="max-w-sm">
          <p className="text-lg font-bold text-slate-50">결과를 찾을 수 없어요</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            생년월일을 다시 입력하면 내 별의 두 이름을 계산해 드릴게요.
          </p>
          <Link
            href="/nakshatra/calc"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-200 px-5 text-sm font-bold text-slate-950 transition hover:bg-amber-100"
          >
            다시 입력하기
          </Link>
        </div>
      </main>
    );
  }

  if (!data) {
    return <main className="min-h-[100dvh] bg-[#070812]" aria-busy="true" />;
  }

  const { dongyang, india, unified, summary, transparency } = data;
  const showEast = view === "both" || view === "east";
  const showIndia = view === "both" || view === "india";
  const showUnified = view === "both" || view === "unified";

  return (
    <main className="relative isolate min-h-[100dvh] overflow-hidden bg-[#070812] px-4 py-8 text-slate-100 md:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,rgba(179,25,85,0.14),transparent_34%),radial-gradient(circle_at_85%_10%,rgba(212,175,55,0.12),transparent_36%),linear-gradient(160deg,#0a0818_0%,#12102a_55%,#070510_100%)]"
      />
      <div className="mx-auto w-full max-w-4xl">
        {/* 요약 헤더 */}
        <header className="rounded-2xl border border-amber-200/20 bg-white/[0.03] p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.4)] md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-100/70">당신의 별자리</p>
          <h1 className="mt-3 break-keep text-3xl font-bold leading-tight text-slate-50 md:text-4xl">
            <span className="text-blue-100">{dongyang.nameHan}宿</span>
            <span className="mx-2 text-slate-500">·</span>
            <span className="text-amber-100">{summary.nakshatraKo}</span>
          </h1>
          {unified.fusionTitle && (
            <p className="mt-2 break-keep text-base font-medium text-slate-200">
              “{unified.fusionTitle.split("—")[0].trim()}”
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Chip>지배성 {india.lordKo}</Chip>
            <Chip>{summary.pada ? `파다 ${summary.pada}` : "파다 미상"}</Chip>
            <Chip>가나 {india.ganaKo}</Chip>
          </div>
        </header>

        {/* 뷰 토글 */}
        <div className="mt-6 flex justify-center">
          <div role="tablist" aria-label="관점 전환" className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
            {VIEW_TABS.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={view === tab.key}
                onClick={() => setView(tab.key)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition md:text-sm ${
                  view === tab.key ? "bg-amber-200 text-slate-950" : "text-slate-200 hover:text-amber-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 동양 / 인도 2열 */}
        <div className={`mt-6 grid gap-4 ${view === "both" ? "md:grid-cols-2" : ""}`}>
          {showEast && (
            <section className="rounded-2xl border border-blue-400/20 bg-blue-500/[0.06] p-5 md:p-6" aria-labelledby="east-h">
              <h2 id="east-h" className="flex items-center gap-2 text-lg font-bold text-blue-100">
                <span aria-hidden="true">☯</span> 숙요점 관점 <span className="text-sm font-normal text-blue-200/80">(동양)</span>
              </h2>
              <p className="mt-1 text-sm text-slate-200">{dongyang.archetypeTitle}</p>
              <dl className="mt-4">
                <Row label="본명수" value={`${dongyang.nameKo}(${dongyang.nameHan})`} />
                <Row label="방위" value={dongyang.direction} />
                <Row label="칠요(七曜)" value={dongyang.sevenLuminary} hint="일곱 빛(해·달·오행)의 배속" />
                <Row label="사신(四神)" value={dongyang.fourSymbol} />
              </dl>
              {dongyang.keywords?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {dongyang.keywords.map((k) => (
                    <Chip key={k}>{k}</Chip>
                  ))}
                </div>
              )}
              {dongyang.strengths?.length > 0 && (
                <p className="mt-4 break-keep text-sm leading-7 text-slate-100">
                  <span className="font-semibold text-blue-100">강점 </span>
                  {dongyang.strengths.join(" · ")}
                </p>
              )}
              {dongyang.shadows?.length > 0 && (
                <p className="mt-1 break-keep text-sm leading-7 text-slate-200">
                  <span className="font-semibold text-blue-200">그림자 </span>
                  {dongyang.shadows.join(" · ")}
                </p>
              )}
              {dongyang.easternExpert && (
                <div className="mt-4 rounded-xl border border-blue-400/20 bg-blue-500/[0.05] p-4">
                  <p className="text-xs font-semibold text-blue-200/90">宿曜 전문가의 해설</p>
                  <p className="mt-1.5 break-keep text-sm leading-7 text-slate-100">{dongyang.easternExpert}</p>
                </div>
              )}
            </section>
          )}

          {showIndia && (
            <section className="rounded-2xl border border-amber-300/20 bg-amber-500/[0.05] p-5 md:p-6" aria-labelledby="india-h">
              <h2 id="india-h" className="flex items-center gap-2 text-lg font-bold text-amber-100">
                <span aria-hidden="true">🕉</span> 베다점 관점 <span className="text-sm font-normal text-amber-200/80">(인도)</span>
              </h2>
              <p className="mt-1 break-keep text-sm text-slate-200">{india.deity} — {india.deityRole}</p>
              <dl className="mt-4">
                <Row label="나크샤트라" value={`${india.nameKo} (${india.nameEn})`} />
                <Row label="지배성" value={india.lordKo} hint="비쇼타리 다샤의 기준 행성" />
                <Row label="가나" value={india.ganaKo} hint="데바·마누샤·라크샤사 기질 분류" />
                <Row label="요니" value={india.yoni} hint="궁합에 쓰는 동물 본능 원형" />
                <Row label="나디" value={india.nadiKo} hint="바타·피타·카파 체질 분류" />
                <Row label="동기" value={india.motiveKo} hint="이번 생의 근원 동기(푸루샤르타)" />
                {india.pada && india.padaDetail ? (
                  <Row label="파다" value={`${india.pada} · ${india.padaDetail.navamsaSignKo}`} hint="나크샤트라의 4분할(나바암샤 라시)" />
                ) : (
                  <Row label="파다" value="시각 미상으로 생략" />
                )}
                {india.dasha && (
                  <Row label="현재 다샤" value={`${india.dasha.currentMahadashaKo} / ${india.dasha.currentAntardashaKo}`} hint="지금 흐르는 대운/안타르다샤" />
                )}
              </dl>
              {india.deityKw?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {india.deityKw.map((k) => (
                    <Chip key={k}>{k}</Chip>
                  ))}
                </div>
              )}
              {india.indianExpert && (
                <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-500/[0.05] p-4">
                  <p className="text-xs font-semibold text-amber-200/90">Jyotish 전문가의 해설</p>
                  <p className="mt-1.5 break-keep text-sm leading-7 text-slate-100">{india.indianExpert}</p>
                </div>
              )}
            </section>
          )}
        </div>

        {/* 통합 */}
        {showUnified && (
          <section className="mt-6 rounded-2xl border border-rose-300/25 bg-rose-500/[0.06] p-6 md:p-8" aria-labelledby="unified-h">
            <h2 id="unified-h" className="text-lg font-bold text-rose-100">⟡ 통합 해석</h2>
            {unified.boundaryNote && (
              <p className="mt-3 rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm leading-7 text-amber-50">
                <span className="font-semibold">⟢ 경계일 </span>
                {unified.boundaryNote}
              </p>
            )}
            {unified.convergence && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-rose-200">⟡ 두 전통이 만나는 지점 (수렴)</p>
                <p className="mt-1.5 break-keep text-sm leading-7 text-slate-100">{unified.convergence}</p>
              </div>
            )}
            {unified.divergence && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-rose-200">⟢ 갈라지는 지점</p>
                <p className="mt-1.5 break-keep text-sm leading-7 text-slate-100">{unified.divergence}</p>
              </div>
            )}
            {unified.fusionReading && (
              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p className="break-keep text-sm leading-7 text-slate-100">{unified.fusionReading}</p>
              </div>
            )}
          </section>
        )}

        {/* 오늘의 달 */}
        <TodayMoonCard sukuyoIndex={dongyang.index} />

        {/* 유료 심화 상품 CTA */}
        <PaidUpsell />


        {/* 계산 투명성 + 면책 */}
        <footer className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-xs leading-6 text-slate-300">
          <p className="font-semibold text-slate-200">계산 근거</p>
          <p className="mt-1">
            아야남샤 {transparency.ayanamsa}
            {transparency.siderealMoonLongitude != null && ` · 시데리얼 달 황경 ${transparency.siderealMoonLongitude}°`}
            {data.input && ` · 출생 ${data.input.year}-${data.input.month}-${data.input.day}${data.input.timeUnknown ? " (시각 미상)" : ` ${String(data.input.hour).padStart(2, "0")}:${String(data.input.minute).padStart(2, "0")}`}`}
            {transparency.pada != null && ` · 파다 ${transparency.pada}`}
          </p>
          <p className="mt-3 border-t border-white/10 pt-3 text-slate-300">
            본 서비스는 전통 별자리 문화 콘텐츠이며, 의료·법률·투자 판단의 근거로 사용할 수 없습니다.
            나크샤트라 속성은 전통 문헌 기반이며, 통합 해석은 Code Destiny의 창작입니다.
          </p>
          <div className="mt-4">
            <Link href="/nakshatra/calc" className="font-semibold text-amber-100 transition hover:text-amber-50">
              ← 다른 생일로 다시 보기
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

interface TodayMoon {
  ok: boolean;
  todayNakshatra: { nameKo: string };
  todaySukuyo: { nameKo: string; nameHan: string } | null;
  personal: {
    dayFortune: { headline: string; advice: string; tierLabel: string } | null;
    taraBala: { ko: string; desc: string } | null;
  } | null;
}

function TodayMoonCard({ sukuyoIndex }: { sukuyoIndex: number }) {
  const [today, setToday] = useState<TodayMoon | null>(null);
  const url = useMemo(() => `/api/nakshatra/today?sukuyoIndex=${sukuyoIndex}`, [sukuyoIndex]);

  useEffect(() => {
    let active = true;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (active && d && d.ok) setToday(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [url]);

  if (!today) return null;

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6" aria-labelledby="today-h">
      <h2 id="today-h" className="text-base font-bold text-slate-100">🌙 오늘의 달</h2>
      <p className="mt-2 break-keep text-sm leading-7 text-slate-200">
        오늘 달은 <span className="font-semibold text-amber-100">{today.todayNakshatra?.nameKo}</span>
        {today.todaySukuyo && (
          <> · <span className="font-semibold text-blue-100">{today.todaySukuyo.nameKo}({today.todaySukuyo.nameHan})</span></>
        )}
        에 머물러 있어요.
      </p>
      {today.personal?.dayFortune && (
        <p className="mt-2 break-keep text-sm leading-7 text-slate-200">
          <span className="font-semibold text-blue-100">동양(격각) </span>
          {today.personal.dayFortune.headline} — {today.personal.dayFortune.advice}
        </p>
      )}
      {today.personal?.taraBala && (
        <p className="mt-1 break-keep text-sm leading-7 text-slate-200">
          <span className="font-semibold text-amber-100">인도(타라 발라) </span>
          {today.personal.taraBala.ko} — {today.personal.taraBala.desc}
        </p>
      )}
    </section>
  );
}

const PAID_PRODUCTS: { title: string; price: string; desc: string; href?: string }[] = [
  { title: "동서 통합 궁합", price: "10,000원", desc: "인도 아쉬타쿠타 36점 × 동양 숙요 격각", href: "/nakshatra/compat" },
  { title: "지배성 심화 리포트", price: "10,000원", desc: "지배성·파다·나바암샤 성격/재능/그림자 심층", href: "/nakshatra/lord-report" },
  { title: "다샤 인생지도", price: "10,000원", desc: "비쇼타리 120년 타임라인 + 동양 대운 병렬", href: "/nakshatra/dasha-map" },
  { title: "택일(무후르타)", price: "5,000원", desc: "목적별 길일 — 무후르타 × 숙요 길흉 교집합", href: "/nakshatra/muhurta" },
  { title: "전문가 심화 상담", price: "30,000원", desc: "숙요·베다 두 대가가 각각 장문으로 (2관점 상담)", href: "/nakshatra/ai" },
  { title: "VVIP 결정판 통합서", price: "30,000원", desc: "전체 통합 + 서사 + PDF 소장본", href: "/nakshatra/vvip" },
];

function PaidUpsell() {
  return (
    <section className="mt-6 rounded-2xl border border-amber-200/20 bg-white/[0.02] p-5 md:p-6" aria-labelledby="paid-h">
      <h2 id="paid-h" className="text-base font-bold text-amber-100">✦ 더 깊이 보기</h2>
      <p className="mt-1 text-xs leading-6 text-slate-300">여기까지는 무료예요. 아래는 두 전통을 더 깊게 펼치는 심화 상품입니다.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {PAID_PRODUCTS.map((p) => {
          const inner = (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <span className="break-keep text-sm font-bold text-slate-50">{p.title}</span>
                <span className="shrink-0 text-xs font-semibold text-amber-100">{p.price}</span>
              </div>
              <p className="mt-1.5 break-keep text-xs leading-6 text-slate-300">{p.desc}</p>
              <span className={`mt-2 inline-block text-xs font-semibold ${p.href ? "text-amber-100" : "text-slate-400"}`}>
                {p.href ? "지금 보기 →" : "준비 중"}
              </span>
            </>
          );
          return p.href ? (
            <Link key={p.title} href={p.href} className="rounded-xl border border-amber-200/25 bg-amber-500/[0.05] p-4 transition hover:border-amber-200/50">
              {inner}
            </Link>
          ) : (
            <div key={p.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 opacity-80">
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
