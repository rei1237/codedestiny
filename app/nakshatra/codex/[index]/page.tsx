import Link from "next/link";
import { notFound } from "next/navigation";
import { getNakshatraAttributes, getPadaDetail } from "@/constants/nakshatra-attributes";
import { crosswalkFromSukuyo } from "@/constants/nakshatra-crosswalk";
import { getFusionBySukuyo } from "@/constants/nakshatra-fusion";
import { SUKUYO_MANSIONS } from "@/worker/lib/sukuyo-premium.js";
import { GRAHA_KO } from "@/worker/lib/vedic-derived-calculations.js";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";
import { siteSeo } from "@/lib/seo/siteSeo";

export const dynamicParams = false;

// 결정성 앵커(대표 별이 물리적으로 정렬되는 5쌍) — 천문 사실. 숙요 한자 → 공통 기준별.
const ANCHOR_STARS: Record<string, string> = {
  "角": "스피카(처녀자리 α)",
  "亢": "아르크투루스 인근",
  "心": "안타레스(전갈자리 α)",
  "昴": "플레이아데스 성단",
  "畢": "알데바란(황소자리 α)",
};

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
  };
}

function padaNavamsaLine(nakIdx: number): string {
  const parts: string[] = [];
  for (let p = 1; p <= 4; p++) {
    const d = getPadaDetail(nakIdx, p);
    if (!d) continue;
    const lord = GRAHA_KO[d.navamsaLord] || d.navamsaLord;
    parts.push(`${p}파다 ${d.navamsaSignKo}(${lord})`);
  }
  return parts.join(" · ");
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
  const { idx, suk, cross, attrs, fusion } = r;
  const prev = (idx + 26) % 27;
  const next = (idx + 1) % 27;
  const lordKo = GRAHA_KO[attrs.lord] || attrs.lord;
  // 화면 빵부스러기(아래 nav: 나크샤트라 결정판 → 27수 도감)와 같은 계층을 구조화 데이터로도
  // 내보낸다. 이 페이지에는 그동안 사이트 공용 Organization·WebSite 말고는 아무 구조화
  // 데이터가 없었다(2026-08-24 dist/ 실측).
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "나크샤트라 결정판", path: "/nakshatra/" },
    { name: `${suk.nameKo}수 · ${attrs.nameKo}`, path: `/nakshatra/codex/${idx}/` },
  ]);

  return (
    <main className="relative isolate min-h-[100dvh] overflow-hidden bg-[#070812] px-4 py-8 text-slate-100 md:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(212,175,55,0.1),transparent_38%),linear-gradient(160deg,#0a0818_0%,#12102a_55%,#070510_100%)]"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
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

        <p className="mt-6 break-keep text-sm leading-7 text-slate-200">
          {`숙요 27수의 ${idx + 1}번째 자리 ${suk.nameKo}수(${suk.nameHan})는, 인도 27 나크샤트라 ${attrs.nameKo}(${attrs.nameEn})와 결정성(대표 별) 기준으로 이어집니다. 두 전통은 같은 황도 27분할에서 갈라져 나왔기에, 한 별을 동양의 방위·사신·칠요와 인도의 지배성·주신·샥티라는 두 언어로 겹쳐 읽을 수 있습니다.`}
        </p>

        <Section title="☯ 동양 — 숙요점 27수">
          <p>{`${suk.nameKo}수(${suk.nameHan})는 ${suk.direction} ${suk.animalSymbol}에 속하는 별자리로, 그 원형은 “${suk.archetypeTitle}”입니다. 칠요(七曜)는 ${suk.element}에 배속됩니다.`}</p>
          <p>{`${suk.animalSymbol} 칠성의 일원으로 ${suk.direction}을 지키며, 칠요 ${suk.element}의 기운이 이 별의 타고난 결을 이룹니다.`}</p>
          <p><strong className="text-blue-100">키워드</strong> {(suk.keywords || []).join(" · ")}</p>
          <p><strong className="text-blue-100">강점</strong> {(suk.strengths || []).join(" · ")}</p>
          {suk.shadows && suk.shadows.length > 0 && <p><strong className="text-blue-200">그림자</strong> {suk.shadows.join(" · ")}</p>}
          {fusion?.easternExpert && <p className="rounded-xl border border-blue-400/20 bg-blue-500/[0.05] p-4"><strong className="text-blue-200">宿曜 전문가 </strong>{fusion.easternExpert}</p>}
        </Section>

        <Section title="🕉 인도 — 나크샤트라">
          <p>{`${attrs.nameKo}(${attrs.nameEn})의 지배성은 ${lordKo}, 주신은 ${attrs.deity}입니다. ${attrs.deityRole}.`}</p>
          <p><strong className="text-amber-100">가나</strong> {attrs.ganaKo} · <strong className="text-amber-100">요니</strong> {attrs.yoni} · <strong className="text-amber-100">나디</strong> {attrs.nadiKo}</p>
          <p><strong className="text-amber-100">근원 동기</strong> {attrs.motiveKo}</p>
          <p>{`전통이 전하는 이 별의 상징은 “${attrs.symbol}”, 고유한 힘(샥티)은 “${attrs.shakti}”입니다.`}</p>
          <p><strong className="text-amber-100">파다 나바암샤</strong> {attrs.padaSignsKo.map((s: string, i: number) => `${i + 1}파다 ${s}`).join(" · ")}</p>
          <p><strong className="text-amber-100">파다 지배성</strong> {`${padaNavamsaLine(cross.nakshatraIdx)} — 태어난 시각의 파다에 따라 같은 별이라도 결이 갈라집니다.`}</p>
          <p>{`가나 ${attrs.ganaKo}는 세상과 관계 맺는 사회적 결을, 나디 ${attrs.nadiKo}는 몸과 감정이 흐르는 체질의 리듬을, 요니 ${attrs.yoni}는 본능과 궁합의 동물 상징을 말합니다. 세 결이 겹쳐 ${attrs.nameKo}만의 삶의 온도를 만듭니다.`}</p>
          <p><strong className="text-amber-100">키워드</strong> {(attrs.deityKw || []).join(" · ")}</p>
          {attrs.indianExpert && <p className="rounded-xl border border-amber-300/20 bg-amber-500/[0.05] p-4"><strong className="text-amber-200">Jyotish 전문가 </strong>{attrs.indianExpert}</p>}
        </Section>

        <Section title="⟡ 통합 해석">
          {fusion?.convergence && <p><strong className="text-rose-200">만나는 지점</strong> {fusion.convergence}</p>}
          {fusion?.divergence && <p><strong className="text-rose-200">갈라지는 지점</strong> {fusion.divergence}</p>}
          {fusion?.fusionReading && <p className="rounded-xl border border-white/10 bg-white/[0.04] p-4">{fusion.fusionReading}</p>}
        </Section>

        <Section title="✦ 살아가는 법 — 강점과 균형">
          <p>{`당신 안에는 ${(suk.strengths || []).join(" · ")} 같은 강점이 흐르지만, ${(suk.shadows && suk.shadows.length ? suk.shadows : ["조급함", "흔들림"]).slice(0, 2).join(" · ")} 같은 그림자도 함께 자랍니다. 인도의 ${(attrs.deityKw || []).slice(0, 2).join(" · ")} 기질이 그 위에 겹쳐 ${attrs.motiveKo}를 향해 나아가게 하지요.`}</p>
          <p>{`관계에서는 ${(suk.strengths || [""])[0]}이 신뢰를 주지만 ${(suk.shadows && suk.shadows[0]) || "조급함"}이 거리를 만들 수 있어요. ${(attrs.deityKw || [""])[0]}의 마음으로 한 사람, 한 일에 깊이 머물 때 이 별의 힘이 완성됩니다.`}</p>
          <p>{`두 별이 같은 곳을 가리킬 때 당신은 가장 당신다워집니다. 오늘은 ${(suk.keywords || [""])[0]} 하나에 힘을 모으고 나머지는 잠시 내려놓아, ${attrs.shakti}이 자연스럽게 흐르도록 두세요.`}</p>
        </Section>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href="/nakshatra/calc" className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-amber-200 px-5 text-sm font-bold text-slate-950 transition hover:bg-amber-100">
            내 별의 두 이름 확인하기
          </Link>
        </div>

        <nav className="mt-6 flex items-center justify-between text-sm">
          <Link href={`/nakshatra/codex/${prev}`} className="text-slate-300 transition hover:text-amber-100">{`← ${SUKUYO_MANSIONS[prev].nameKo}수`}</Link>
          <Link href={`/nakshatra/codex/${next}`} className="text-slate-300 transition hover:text-amber-100">{`${SUKUYO_MANSIONS[next].nameKo}수 →`}</Link>
        </nav>

        <p className="mt-7 break-keep rounded-2xl border border-amber-200/20 bg-amber-500/[0.04] p-5 text-sm leading-7 text-amber-50/90">
          {`한 문장으로 정리하면, 동양의 “${suk.archetypeTitle}” 기질과 인도의 “${attrs.shakti}”이 만나 “${fusion?.fusionTitle ? fusion.fusionTitle.split("—")[0].trim() : `${suk.nameKo}수`}”이라는 하나의 별을 이룹니다. 이 도감은 당신의 두 이름을 겹쳐 읽어, 타고난 결과 오늘의 균형점을 함께 비춰 줍니다.`}
        </p>

        <p className="mt-8 border-t border-white/10 pt-4 text-xs leading-6 text-slate-300">
          본 서비스는 전통 별자리 문화 콘텐츠이며, 의료·법률·투자 판단의 근거로 사용할 수 없습니다.
          나크샤트라 속성은 전통 문헌 기반이며, 통합 해석은 Code Destiny의 창작입니다.
        </p>
      </div>
    </main>
  );
}
