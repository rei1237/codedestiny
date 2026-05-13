import Link from "next/link";
import { SERVICE_SECTIONS } from "../_lib/serviceSections";
import FeatureSymbol from "./icons/FeatureSymbol";
import DestinyIcon from "./icons/DestinyIcon";

type Props = {
  /** When legacy iframe is above, hide redundant “open legacy” CTA and shorten copy. */
  variant?: "default" | "belowLegacy";
};

/**
 * Native hub: crawlable links + visible copy. On home, usually shown below legacy iframe.
 */
export default function HomeServiceSections({ variant = "default" }: Props) {
  const belowLegacy = variant === "belowLegacy";
  const cleanTitle = (raw: string) => raw.replace(/^[^\p{L}\p{N}]+/u, "").trim();
  const mysticQuickLinks = [
    { href: "/oracle/ifa", label: "이파 오라클" },
    { href: "/oracle/royal-tea", label: "타세오그래피" },
    { href: "/oracle/sikojen-povailu", label: "핀란드 주석점" },
    { href: "/flower/destiny", label: "운명의 꽃" },
    { href: "/dream/tarot", label: "드림 타로" },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-8" aria-labelledby="home-hub-title">
      <header className="mb-6 rounded-3xl border border-violet-300/30 bg-[linear-gradient(140deg,rgba(45,25,85,0.72),rgba(22,30,70,0.86))] p-5 text-slate-100 shadow-[0_20px_44px_rgba(16,10,35,0.42)]">
        <h1 id="home-hub-title" className="text-2xl font-semibold">
          꿀꿀 만세력
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          {belowLegacy
            ? "위 화면에서 기존 메인과 동일하게 카드·모달로 이용할 수 있습니다. 검색·내부 링크용으로 서비스별 네이티브 페이지로 바로 갈 수 있는 목록입니다."
            : "무료 사주 만세력·자미두수·AI 타로·점성술·주역·숙요점·화투점·동물 관상·MBTI 궁합·운명의 꽃·드림 타로 등 운세 서비스를 한곳에서 이용할 수 있습니다. 아래 카테고리에서 원하는 항목을 눌러 네이티브 페이지로 이동하세요."}
        </p>
        {!belowLegacy ? (
          <p className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link
              href="/"
              className="inline-flex items-center rounded-lg bg-amber-500/90 px-4 py-2 font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              전체 기능 화면 열기 (레거시 메인)
            </Link>
            <span className="self-center text-xs text-slate-500">
              카드·모달이 한 화면에 모여 있는 기존 메인입니다.
            </span>
          </p>
        ) : null}

        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-violet-200/90">
            <DestinyIcon name="sparkleLine" size={14} className="text-violet-100" variant="soft" />
            사주 외 신비 운세 바로가기
          </p>
          <div className="flex flex-wrap gap-2">
            {mysticQuickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/35 bg-violet-900/35 px-3 py-1.5 text-xs font-semibold text-violet-100 transition hover:border-cyan-300/45 hover:text-cyan-100"
              >
                <FeatureSymbol route={item.href} size={14} className="text-violet-100" variant="soft" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <div className="space-y-6">
        {SERVICE_SECTIONS.map((section) => (
          <article key={section.id} className="rounded-3xl border border-violet-300/20 bg-[linear-gradient(170deg,rgba(10,18,48,0.92),rgba(22,14,40,0.86))] p-4 shadow-[0_14px_30px_rgba(8,10,24,0.35)]">
            <h2 className="mb-3 text-lg font-semibold text-violet-100">{section.title}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl border border-violet-300/20 bg-[linear-gradient(160deg,rgba(39,26,67,0.72),rgba(25,34,64,0.72))] p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/45 hover:shadow-[0_10px_24px_rgba(34,211,238,0.15)]"
                >
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-violet-50">
                    <FeatureSymbol route={item.href} size={15} className="text-violet-100" variant="soft" />
                    {cleanTitle(item.title)}
                  </div>
                  <div className="mt-1 text-xs text-violet-100/75">{item.desc}</div>
                </Link>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

