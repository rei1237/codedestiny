"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { stripLocalePrefix } from "../_lib/localePath";

type ServiceLike = {
  title?: string;
  h1?: string;
  description?: string;
  landingPoints?: string[];
};

export default function FeatureLandingPage({ service }: { service?: ServiceLike }) {
  const pathname = usePathname() || "/";
  const basePath = stripLocalePrefix(pathname);
  const actionMap: Record<string, string> = {
    "/animal/physio": "openPhysiognomyApp",
    "/animal/mbti": "openMbtiModal",
    "/animal/totem": "openAnimalTotemModal",
    "/tarot/self-esteem": "openTarotSelfEsteemModal",
    "/tarot/reunion": "openTarotReunionModal",
    "/tarot/year": "openTarotYearFortuneModal",
    "/oracle/hwatu": "openHwatuModal",
    "/oracle/kemet": "openKemetModal",
    "/oracle/juyuk": "openJuyukModal",
    "/oracle/sukuyo": "openSukuyoModal",
    "/vedic/jyotish": "navigateToVedic",
    "/flower/destiny": "openDestinyFlowerStudio",
    "/flower/astrology": "openAstrologyFlowerStudio",
    "/flower/jamidusu": "openJamidusuFlowerStudio",
    "/flower/sukuyo": "openSukuyoFlowerStudio",
    "/dream/tarot": "openDreamModal",
    "/dream/psycho": "openPsychoDreamModal",
  };
  const action = actionMap[basePath];
  const runHref = action
    ? `/?action=${encodeURIComponent(action)}`
    : "/";

  const title = service?.h1 || service?.title || "운세 서비스";
  const description =
    service?.description || "Code Destiny 메인 기능으로 연결되는 SEO 랜딩 페이지입니다.";
  const points = Array.isArray(service?.landingPoints) ? service!.landingPoints! : [];

  return (
    <main className="min-h-[100dvh] bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-700 bg-slate-900/55 p-6">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">{description}</p>

        {points.length ? (
          <section className="mt-5 space-y-2 text-sm leading-7 text-slate-200">
            <h2 className="text-lg font-semibold">핵심 포인트</h2>
            {points.map((p, idx) => (
              <p key={idx}>- {p}</p>
            ))}
          </section>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={runHref} className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900">
            기능 바로 실행
          </Link>
          <Link href="/insights" className="rounded-lg border border-slate-600 px-4 py-2 text-sm">
            관련 인사이트 보기
          </Link>
        </div>
      </div>
    </main>
  );
}

