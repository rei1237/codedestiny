import Link from "next/link";
import MindScanTarot from "../../components/MindScanTarot";
import { buildSeoMetadata } from "../../../lib/seo";
import { SEO_LANDING_PAGES } from "../../../lib/seo-landing-pages";

export const metadata = buildSeoMetadata(SEO_LANDING_PAGES.tarotMindscan);

const relatedLabels: Record<string, string> = {
  "/tarot": "무료 타로 카드 리딩",
  "/tarot/reunion": "재회 타로 리딩",
  "/love": "연애운 무료 보기",
  "/high-value/how-tarot-actually-works": "타로 리딩 가이드",
};

export default function MindScanTarotPage() {
  const relatedLinks = SEO_LANDING_PAGES.tarotMindscan.relatedServices.map((path) => ({
    path,
    label: relatedLabels[path] || "관련 타로 서비스",
  }));

  return (
    <>
      <MindScanTarot />
      <section className="mx-auto max-w-4xl px-4 py-10 text-slate-100">
        <h2 className="text-2xl font-semibold">관계 마음 해석에서 살피는 것</h2>
        <p className="mt-3 leading-8 text-slate-300">
          말과 행동 사이 타로는 드러난 표현, 남은 감정, 현재 거리감, 다음 대화의 속도를 정리하는 관계 리딩입니다.
          결과는 확정 예언이 아니라 관계를 차분히 돌아보기 위한 자기성찰 자료로 제공됩니다.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {SEO_LANDING_PAGES.tarotMindscan.steps.map((step) => (
            <article key={step.title} className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-4">
              <h3 className="font-semibold text-slate-50">{step.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">{step.body}</p>
            </article>
          ))}
        </div>
        <nav className="mt-7 flex flex-wrap gap-3" aria-label="관련 타로 서비스">
          {relatedLinks.map((link) => (
            <Link key={link.path} href={link.path} className="rounded-md border border-violet-300/30 px-3 py-2 text-sm text-violet-100">
              {link.label}
            </Link>
          ))}
        </nav>
      </section>
    </>
  );
}
