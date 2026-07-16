import Link from "next/link";
import { notFound } from "next/navigation";
import { getNakshatraAttributes } from "@/constants/nakshatra-attributes";
import { crosswalkFromSukuyo } from "@/constants/nakshatra-crosswalk";
import { getFusionBySukuyo } from "@/constants/nakshatra-fusion";
import { SUKUYO_MANSIONS } from "@/worker/lib/sukuyo-premium.js";
import { GRAHA_KO } from "@/worker/lib/vedic-derived-calculations.js";
import { siteSeo } from "@/lib/seo/siteSeo";

export const dynamicParams = false;

export function generateStaticParams() {
  return Array.from({ length: 27 }, (_, i) => ({ index: String(i) }));
}

function resolve(indexParam: string) {
  const idx = Number(indexParam);
  if (!Number.isInteger(idx) || idx < 0 || idx > 26) return null;
  const suk = SUKUYO_MANSIONS[idx];
  const cross = crosswalkFromSukuyo(idx);
  if (!suk || !cross) return null;
  const attrs = getNakshatraAttributes(cross.nakshatraIdx);
  const fusion = getFusionBySukuyo(idx);
  if (!attrs || !fusion) return null;
  return { idx, suk, cross, attrs, fusion };
}

export function generateMetadata({ params }: { params: { index: string } }) {
  const r = resolve(params.index);
  if (!r) return {};
  const title = `${r.suk.nameKo}수(${r.suk.nameHan}) · ${r.attrs.nameKo} | 나크샤트라 결정판 27수 도감`;
  const description = `동양 ${r.suk.nameKo}수(${r.suk.nameHan})와 인도 나크샤트라 ${r.attrs.nameKo}(${r.attrs.nameEn})의 통합 해설. ${r.fusion?.convergence?.slice(0, 90) || ""}`;
  const path = `/nakshatra/codex/${r.idx}`;
  return {
    metadataBase: new URL(siteSeo.siteUrl),
    title,
    description,
    alternates: { canonical: `${siteSeo.siteUrl}${path}` },
    openGraph: {
      type: "article",
      locale: "ko_KR",
      url: `${siteSeo.siteUrl}${path}`,
      title,
      description,
      siteName: "Code Destiny",
      images: [{ url: siteSeo.defaultOgImage, width: 1200, height: 630, alt: title }],
    },
    robots: { index: true, follow: true },
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <h2 className="text-lg font-bold text-slate-50">{title}</h2>
      <div className="mt-3 space-y-2 text-sm leading-7 text-slate-200">{children}</div>
    </section>
  );
}

export default function NakshatraCodexPage({ params }: { params: { index: string } }) {
  const r = resolve(params.index);
  if (!r) notFound();
  const { idx, suk, attrs, fusion } = r;
  const prev = (idx + 26) % 27;
  const next = (idx + 1) % 27;
  const lordKo = GRAHA_KO[attrs.lord] || attrs.lord;

  return (
    <main className="relative isolate min-h-[100dvh] overflow-hidden bg-[#070812] px-4 py-8 text-slate-100 md:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(212,175,55,0.1),transparent_38%),linear-gradient(160deg,#0a0818_0%,#12102a_55%,#070510_100%)]"
      />
      <div className="mx-auto w-full max-w-3xl">
        <nav className="mb-5 flex flex-wrap gap-2 text-sm text-slate-300">
          <Link href="/nakshatra" className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 transition hover:border-amber-200/60 hover:text-amber-100">
            나크샤트라 결정판
          </Link>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">27수 도감</span>
        </nav>

        <header className="border-b border-white/10 pb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100/70">Nakshatra Codex · {idx + 1} / 27</p>
          <h1 className="mt-3 break-keep text-3xl font-bold leading-tight text-slate-50 md:text-4xl">
            <span className="text-blue-100">{suk.nameKo}수({suk.nameHan})</span>
            <span className="mx-2 text-slate-500">·</span>
            <span className="text-amber-100">{attrs.nameKo}</span>
          </h1>
          {fusion?.fusionTitle && (
            <p className="mt-2 break-keep text-base font-medium text-slate-200">“{fusion.fusionTitle.split("—")[0].trim()}”</p>
          )}
        </header>

        <Section title="☯ 동양 — 숙요점 27수">
          <p>{suk.nameKo}수({suk.nameHan})는 {suk.direction} {suk.animalSymbol}에 속하는 별자리로, 그 원형은 “{suk.archetypeTitle}”입니다. 칠요(七曜)는 {suk.element}에 배속됩니다.</p>
          <p><strong className="text-blue-100">키워드</strong> {(suk.keywords || []).join(" · ")}</p>
          <p><strong className="text-blue-100">강점</strong> {(suk.strengths || []).join(" · ")}</p>
          {suk.shadows && suk.shadows.length > 0 && <p><strong className="text-blue-200">그림자</strong> {suk.shadows.join(" · ")}</p>}
        </Section>

        <Section title="🕉 인도 — 나크샤트라">
          <p>{attrs.nameKo}({attrs.nameEn})의 지배성은 {lordKo}, 주신은 {attrs.deity}입니다. {attrs.deityRole}.</p>
          <p><strong className="text-amber-100">가나</strong> {attrs.ganaKo} · <strong className="text-amber-100">요니</strong> {attrs.yoni} · <strong className="text-amber-100">나디</strong> {attrs.nadiKo}</p>
          <p><strong className="text-amber-100">근원 동기</strong> {attrs.motiveKo}</p>
          <p><strong className="text-amber-100">파다 나바암샤</strong> {attrs.padaSignsKo.map((s: string, i: number) => `${i + 1}파다 ${s}`).join(" · ")}</p>
          <p><strong className="text-amber-100">키워드</strong> {(attrs.deityKw || []).join(" · ")}</p>
        </Section>

        <Section title="⟡ 통합 해석">
          {fusion?.convergence && <p><strong className="text-rose-200">만나는 지점</strong> {fusion.convergence}</p>}
          {fusion?.divergence && <p><strong className="text-rose-200">갈라지는 지점</strong> {fusion.divergence}</p>}
          {fusion?.fusionReading && <p className="rounded-xl border border-white/10 bg-white/[0.04] p-4">{fusion.fusionReading}</p>}
        </Section>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href="/nakshatra/calc" className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-amber-200 px-5 text-sm font-bold text-slate-950 transition hover:bg-amber-100">
            내 별의 두 이름 확인하기
          </Link>
        </div>

        <nav className="mt-6 flex items-center justify-between text-sm">
          <Link href={`/nakshatra/codex/${prev}`} className="text-slate-300 transition hover:text-amber-100">← {SUKUYO_MANSIONS[prev].nameKo}수</Link>
          <Link href={`/nakshatra/codex/${next}`} className="text-slate-300 transition hover:text-amber-100">{SUKUYO_MANSIONS[next].nameKo}수 →</Link>
        </nav>

        <p className="mt-8 border-t border-white/10 pt-4 text-xs leading-6 text-slate-300">
          본 서비스는 전통 별자리 문화 콘텐츠이며, 의료·법률·투자 판단의 근거로 사용할 수 없습니다.
          나크샤트라 속성은 전통 문헌 기반이며, 통합 해석은 Code Destiny의 창작입니다.
        </p>
      </div>
    </main>
  );
}
