"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { NAKSHATRA_RESULT_STORAGE_KEY } from "../NakshatraFormClient";
import { useNakshatraCopy } from "../_lib/copy";
import { getCurrentLoadingLocale } from "@/constants/loadingMessages";

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
  const { result: copy } = useNakshatraCopy();
  const [data, setData] = useState<ResolveResult | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<ViewMode>("both");

  const viewTabs: { key: ViewMode; label: string }[] = [
    { key: "both", label: copy.viewTabBoth },
    { key: "east", label: copy.viewTabEast },
    { key: "india", label: copy.viewTabIndia },
    { key: "unified", label: copy.viewTabUnified },
  ];

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
          <p className="text-lg font-bold text-slate-50">{copy.notFoundTitle}</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            {copy.notFoundBody}
          </p>
          <Link
            href="/nakshatra/calc"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-200 px-5 text-sm font-bold text-slate-950 transition hover:bg-amber-100"
          >
            {copy.notFoundLink}
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
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-100/70">{copy.headerEyebrow}</p>
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
            <Chip>{summary.pada ? copy.padaChipTemplate.replace("{pada}", String(summary.pada)) : copy.padaChipUnknown}</Chip>
            <Chip>가나 {india.ganaKo}</Chip>
          </div>
        </header>

        {/* 뷰 토글 */}
        <div className="mt-6 flex justify-center">
          <div role="tablist" aria-label={copy.viewSwitchAria} className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
            {viewTabs.map((tab) => (
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
                <span aria-hidden="true">☯</span> {copy.eastHeading} <span className="text-sm font-normal text-blue-200/80">{copy.eastHeadingSuffix}</span>
              </h2>
              <p className="mt-1 text-sm text-slate-200">{dongyang.archetypeTitle}</p>
              <dl className="mt-4">
                <Row label={copy.rowNatalName} value={`${dongyang.nameKo}(${dongyang.nameHan})`} />
                <Row label={copy.rowDirection} value={dongyang.direction} />
                <Row label={copy.rowSevenLuminary} value={dongyang.sevenLuminary} hint={copy.rowSevenLuminaryHint} />
                <Row label={copy.rowFourSymbol} value={dongyang.fourSymbol} />
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
                  <span className="font-semibold text-blue-100">{copy.strengthsLabel} </span>
                  {dongyang.strengths.join(" · ")}
                </p>
              )}
              {dongyang.shadows?.length > 0 && (
                <p className="mt-1 break-keep text-sm leading-7 text-slate-200">
                  <span className="font-semibold text-blue-200">{copy.shadowsLabel} </span>
                  {dongyang.shadows.join(" · ")}
                </p>
              )}
              {dongyang.easternExpert && (
                <div className="mt-4 rounded-xl border border-blue-400/20 bg-blue-500/[0.05] p-4">
                  <p className="text-xs font-semibold text-blue-200/90">{copy.easternExpertHeading}</p>
                  <p className="mt-1.5 break-keep text-sm leading-7 text-slate-100">{dongyang.easternExpert}</p>
                </div>
              )}
            </section>
          )}

          {showIndia && (
            <section className="rounded-2xl border border-amber-300/20 bg-amber-500/[0.05] p-5 md:p-6" aria-labelledby="india-h">
              <h2 id="india-h" className="flex items-center gap-2 text-lg font-bold text-amber-100">
                <span aria-hidden="true">🕉</span> {copy.indiaHeading} <span className="text-sm font-normal text-amber-200/80">{copy.indiaHeadingSuffix}</span>
              </h2>
              <p className="mt-1 break-keep text-sm text-slate-200">{india.deity} — {india.deityRole}</p>
              <dl className="mt-4">
                <Row label={copy.rowNakshatra} value={`${india.nameKo} (${india.nameEn})`} />
                <Row label={copy.rowLord} value={india.lordKo} hint={copy.rowLordHint} />
                <Row label={copy.rowGana} value={india.ganaKo} hint={copy.rowGanaHint} />
                <Row label={copy.rowYoni} value={india.yoni} hint={copy.rowYoniHint} />
                <Row label={copy.rowNadi} value={india.nadiKo} hint={copy.rowNadiHint} />
                <Row label={copy.rowMotive} value={india.motiveKo} hint={copy.rowMotiveHint} />
                {india.pada && india.padaDetail ? (
                  <Row label={copy.rowPada} value={`${india.pada} · ${india.padaDetail.navamsaSignKo}`} hint={copy.rowPadaHint} />
                ) : (
                  <Row label={copy.rowPada} value={copy.rowPadaUnknown} />
                )}
                {india.dasha && (
                  <Row label={copy.rowCurrentDasha} value={`${india.dasha.currentMahadashaKo} / ${india.dasha.currentAntardashaKo}`} hint={copy.rowCurrentDashaHint} />
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
                  <p className="text-xs font-semibold text-amber-200/90">{copy.indianExpertHeading}</p>
                  <p className="mt-1.5 break-keep text-sm leading-7 text-slate-100">{india.indianExpert}</p>
                </div>
              )}
            </section>
          )}
        </div>

        {/* 통합 */}
        {showUnified && (
          <section className="mt-6 rounded-2xl border border-rose-300/25 bg-rose-500/[0.06] p-6 md:p-8" aria-labelledby="unified-h">
            <h2 id="unified-h" className="text-lg font-bold text-rose-100">{copy.unifiedHeading}</h2>
            {unified.boundaryNote && (
              <p className="mt-3 rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm leading-7 text-amber-50">
                <span className="font-semibold">{copy.boundaryLabel} </span>
                {unified.boundaryNote}
              </p>
            )}
            {unified.convergence && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-rose-200">{copy.convergenceLabel}</p>
                <p className="mt-1.5 break-keep text-sm leading-7 text-slate-100">{unified.convergence}</p>
              </div>
            )}
            {unified.divergence && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-rose-200">{copy.divergenceLabel}</p>
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
          <p className="font-semibold text-slate-200">{copy.calcBasisHeading}</p>
          <p className="mt-1">
            {copy.ayanamsaLabel} {transparency.ayanamsa}
            {transparency.siderealMoonLongitude != null && ` · ${copy.siderealMoonLabel} ${transparency.siderealMoonLongitude}°`}
            {data.input && ` · ${copy.birthLabel} ${data.input.year}-${data.input.month}-${data.input.day}${data.input.timeUnknown ? ` ${copy.timeUnknownSuffix}` : ` ${String(data.input.hour).padStart(2, "0")}:${String(data.input.minute).padStart(2, "0")}`}`}
            {transparency.pada != null && ` · ${copy.padaFooterLabel} ${transparency.pada}`}
          </p>
          <p className="mt-3 border-t border-white/10 pt-3 text-slate-300">
            {copy.disclaimer}
          </p>
          <div className="mt-4">
            <Link href="/nakshatra/calc" className="font-semibold text-amber-100 transition hover:text-amber-50">
              {copy.backLink}
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
  const { result: copy } = useNakshatraCopy();
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
      <h2 id="today-h" className="text-base font-bold text-slate-100">{copy.todayMoonHeading}</h2>
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

function PaidUpsell() {
  const { result: copy } = useNakshatraCopy();
  const locale = getCurrentLoadingLocale();
  const products: { title: string; price: string; desc: string; href?: string }[] = [
    { title: copy.paidProducts.compat.title, price: locale === "ko" ? copy.paidProducts.compat.priceKo : copy.paidProducts.compat.priceOther, desc: copy.paidProducts.compat.desc, href: "/nakshatra/compat" },
    { title: copy.paidProducts.lordReport.title, price: locale === "ko" ? copy.paidProducts.lordReport.priceKo : copy.paidProducts.lordReport.priceOther, desc: copy.paidProducts.lordReport.desc, href: "/nakshatra/lord-report" },
    { title: copy.paidProducts.dashaMap.title, price: locale === "ko" ? copy.paidProducts.dashaMap.priceKo : copy.paidProducts.dashaMap.priceOther, desc: copy.paidProducts.dashaMap.desc, href: "/nakshatra/dasha-map" },
    { title: copy.paidProducts.muhurta.title, price: locale === "ko" ? copy.paidProducts.muhurta.priceKo : copy.paidProducts.muhurta.priceOther, desc: copy.paidProducts.muhurta.desc, href: "/nakshatra/muhurta" },
    { title: copy.paidProducts.ai.title, price: locale === "ko" ? copy.paidProducts.ai.priceKo : copy.paidProducts.ai.priceOther, desc: copy.paidProducts.ai.desc, href: "/nakshatra/ai" },
    { title: copy.paidProducts.vvip.title, price: locale === "ko" ? copy.paidProducts.vvip.priceKo : copy.paidProducts.vvip.priceOther, desc: copy.paidProducts.vvip.desc, href: "/nakshatra/vvip" },
  ];
  return (
    <section className="mt-6 rounded-2xl border border-amber-200/20 bg-white/[0.02] p-5 md:p-6" aria-labelledby="paid-h">
      <h2 id="paid-h" className="text-base font-bold text-amber-100">{copy.upsellHeading}</h2>
      <p className="mt-1 text-xs leading-6 text-slate-300">{copy.upsellIntro}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {products.map((p) => {
          const inner = (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <span className="break-keep text-sm font-bold text-slate-50">{p.title}</span>
                <span className="shrink-0 text-xs font-semibold text-amber-100">{p.price}</span>
              </div>
              <p className="mt-1.5 break-keep text-xs leading-6 text-slate-300">{p.desc}</p>
              <span className={`mt-2 inline-block text-xs font-semibold ${p.href ? "text-amber-100" : "text-slate-400"}`}>
                {p.href ? copy.viewNowLabel : copy.comingSoonLabel}
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
