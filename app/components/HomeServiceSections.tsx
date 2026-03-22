import Link from "next/link";
import { SERVICE_SECTIONS } from "../_lib/serviceSections";

type Props = {
  /** When legacy iframe is above, hide redundant “open legacy” CTA and shorten copy. */
  variant?: "default" | "belowLegacy";
};

/**
 * Native hub: crawlable links + visible copy. On home, usually shown below legacy iframe.
 */
export default function HomeServiceSections({ variant = "default" }: Props) {
  const belowLegacy = variant === "belowLegacy";

  return (
    <section className="mx-auto max-w-6xl px-4 py-8" aria-labelledby="home-hub-title">
      <header className="mb-6 rounded-2xl border border-slate-700 bg-slate-900/60 p-5 text-slate-100">
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
      </header>

      <div className="space-y-6">
        {SERVICE_SECTIONS.map((section) => (
          <article key={section.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{section.title}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 transition hover:border-slate-500 hover:bg-slate-900"
                >
                  <div className="text-sm font-semibold text-slate-100">{item.title}</div>
                  <div className="mt-1 text-xs text-slate-400">{item.desc}</div>
                </Link>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

