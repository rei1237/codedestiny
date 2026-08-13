import { SEO_LANDING_PAGES } from "../../lib/seo-landing-pages";

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
