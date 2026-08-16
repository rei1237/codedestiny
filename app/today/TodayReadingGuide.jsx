import { SEO_LANDING_PAGES } from "../../lib/seo-landing-pages";
import { FORTUNE_PERIOD_IDS, PERIOD_LABEL } from "../../lib/fortune/periods";
import { SIGN_PROFILES } from "../../lib/fortune/sign-profiles";

/**
 * /today 의 서버 렌더 해설 섹션.
 *
 * lib/seo-landing-pages.js 의 `today` 페이로드(intro/steps/resultItems/faqs)는
 * 이 라우트가 공용 SeoLandingTemplate 을 마운트하지 않는 탓에 오래 죽은 데이터였다.
 * 템플릿을 얹으면 서체 히어로·브레드크럼이 몰입형 화면 아래 두 번째 히어로로 붙으므로,
 * 같은 원문을 /today 자신의 다크 팔레트로 렌더해 되살린다.
 *
 * 서버 컴포넌트로 두는 이유: scripts/verify-adsense-readiness.mjs 는 서버 렌더 텍스트만
 * 세고 기준 미달이면 빌드를 실패시킨다. TodayHubClient 의 children 으로 넘어가므로
 * <main> 안에 남고, 기존 h1 → h3 사이의 빈 h2 자리를 이 섹션이 채운다.
 */
export default function TodayReadingGuide() {
  const page = SEO_LANDING_PAGES.today;
  if (!page) return null;

  return (
    <>
      <section aria-labelledby="today-guide-heading" className="mt-16">
        <h2 id="today-guide-heading" className="break-keep text-lg font-extrabold text-white">
          오늘의 운세는 무엇을 읽는 것인가
        </h2>
        <p className="mt-3 max-w-[62ch] break-keep text-sm leading-7 text-slate-300">{page.intro}</p>

        <h3 className="mt-10 break-keep text-base font-extrabold text-amber-200">이렇게 읽으면 도움이 됩니다</h3>
        <ol className="mt-3 space-y-2.5">
          {page.steps.map((step, index) => (
            <li key={step} className="flex gap-3 break-keep text-sm leading-7 text-slate-300">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-400/40 bg-amber-400/10 text-xs font-bold text-amber-300"
              >
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <h3 className="mt-10 break-keep text-base font-extrabold text-amber-200">확인할 수 있는 것</h3>
        <ul className="mt-3 space-y-2.5">
          {page.resultItems.map((item) => (
            <li key={item} className="flex gap-3 break-keep text-sm leading-7 text-slate-300">
              <span aria-hidden="true" className="mt-3 h-1 w-1 shrink-0 rounded-full bg-amber-300" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 🔴 /today 는 AppChrome.CHROMELESS_ROUTES 라 SiteFooterHub 가 붙지 않는다. 그래서
          푸터에 건 /fortune/* 기간 허브 링크가 이 라우트에는 도달하지 않는다. /today 는 홈이
          직접 링크하는 페이지이므로, 매일 재생성되는 별자리·띠 클러스터 96개를 여기서
          깊이 2로 끌어올린다(2026-08-16 이전에는 사이트맵이 유일한 진입이었다).
          목록은 lib/fortune/{periods,sign-profiles} 에서 전수 발견한다 — 손으로 적으면
          종수가 늘 때 사이트맵과 어긋난다(scripts/generate-sitemap.mjs 와 같은 규약). */}
      <section aria-labelledby="today-signs-heading" className="mt-16">
        <h2 id="today-signs-heading" className="break-keep text-lg font-extrabold text-white">
          별자리·띠로 보는 기간별 운세
        </h2>
        <p className="mt-3 max-w-[62ch] break-keep text-sm leading-7 text-slate-300">
          위 오늘의 운세가 생년월일시로 계산한 개인 운세라면, 아래는 별자리 12종과 띠 12종을 기준으로
          매일 새로 계산해 공개하는 무료 운세입니다. 기간마다 보는 축이 달라 오늘·내일은 일진을,
          이번 주는 한 주의 간지 흐름을, 이번 달은 월건과 절기 구간을 근거로 삼습니다.
        </p>

        <nav aria-label="기간별 운세 허브" className="mt-5 flex flex-wrap gap-2">
          {FORTUNE_PERIOD_IDS.map((period) => (
            <a
              key={period}
              href={`/fortune/${period}/`}
              className="rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-xs font-bold text-amber-200 transition-colors hover:border-amber-300 hover:bg-amber-400/20"
            >
              {PERIOD_LABEL[period]} 운세
            </a>
          ))}
        </nav>

        {[
          { kind: "zodiac", title: "별자리 12종 오늘의 운세" },
          { kind: "animal", title: "띠 12종 오늘의 운세" },
        ].map((group) => (
          <div key={group.kind}>
            <h3 className="mt-10 break-keep text-base font-extrabold text-amber-200">{group.title}</h3>
            <nav aria-label={group.title} className="mt-3 flex flex-wrap gap-2">
              {SIGN_PROFILES.filter((profile) => profile.kind === group.kind).map((profile) => (
                <a
                  key={profile.id}
                  href={`/fortune/today/${profile.id}/`}
                  className="rounded-xl border border-slate-700/60 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 transition-colors hover:border-amber-400/40 hover:text-amber-100"
                >
                  <span aria-hidden="true" className="mr-1.5 text-slate-400">
                    {profile.symbol}
                  </span>
                  {profile.nameKo}
                </a>
              ))}
            </nav>
          </div>
        ))}
      </section>

      <section aria-labelledby="today-faq-heading" className="mt-16">
        <h2 id="today-faq-heading" className="break-keep text-lg font-extrabold text-white">
          자주 묻는 질문
        </h2>
        <div className="mt-4 space-y-3">
          {page.faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-2xl border border-slate-700/60 bg-slate-900/80 px-5 py-4 transition-colors hover:border-amber-400/40"
            >
              <summary className="cursor-pointer list-none break-keep text-sm font-bold text-slate-100 marker:content-none">
                {faq.question}
              </summary>
              <p className="mt-3 break-keep text-sm leading-7 text-slate-300">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <p className="mt-10 max-w-[62ch] break-keep text-xs leading-6 text-slate-500">{page.disclaimer}</p>
    </>
  );
}
