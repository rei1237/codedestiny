import Image from "next/image";
import Link from "next/link";
import NakshatraFormClient from "./NakshatraFormClient";
import ContentIntegrityNote from "../components/ContentIntegrityNote";
import { Taegeuk, Yantra, Spark, CornerMark } from "./NakshatraSymbols";
import styles from "./nakshatra.module.css";
import { SUKUYO_MANSIONS } from "../../worker/lib/sukuyo-premium.js";
import { NAKSHATRA_CROSSWALK } from "../../constants/nakshatra-crosswalk.js";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildServiceJsonLd,
  buildWebPageJsonLd,
} from "../../lib/structured-data";

const RELATED_LABELS = {
  "/sukuyo": "숙요점 27수 궁합",
  "/vedic": "베다 점성술 무료 해석",
  "/astrology": "점성술 출생차트",
  "/ziwei": "자미두수 12궁 명반",
  "/guides": "운세 인사이트 가이드",
  "/saju": "무료 사주팔자 분석",
};

const FUSION_IMAGE =
  "https://assets.code-destiny.com/%EC%88%99%EC%9A%94%EC%A0%90x%EB%B2%A0%EB%8B%A4%EC%A0%90.webp";

const PERSPECTIVES = [
  { cls: "perspEast", title: "동양 · 숙요점", sub: "27수 · 칠요 · 사신" },
  { cls: "perspWest", title: "India · Nakshatra", sub: "지배성 · 파다 · 다샤" },
  { cls: "perspUnion", title: "통합 해석", sub: "수렴 · 경계일" },
];

// SEO h1(예: "나크샤트라 결정판 — 하나의 별, 두 개의 언어")을 앞부분/강조부로 분리.
function splitHeadline(h1) {
  const text = String(h1 || "");
  const index = text.indexOf("—");
  if (index === -1) return { lead: text, accent: "" };
  return { lead: text.slice(0, index + 1).trim() + " ", accent: text.slice(index + 1).trim() };
}

export default function NakshatraLanding({ page }) {
  const steps = Array.isArray(page?.steps) ? page.steps : [];
  const resultItems = Array.isArray(page?.resultItems) ? page.resultItems : [];
  const faqs = Array.isArray(page?.faqs) ? page.faqs : [];
  const sections = Array.isArray(page?.sections) ? page.sections.filter((item) => item?.heading) : [];
  // 본문을 고친 날은 SeoLandingTemplate 과 같이 검수 노트와 WebPage JSON-LD 에 같은 값으로 싣는다.
  const dateModified = typeof page?.dateModified === "string" ? page.dateModified : null;
  const headline = splitHeadline(page?.h1);
  const crosswalk = NAKSHATRA_CROSSWALK.map((entry) => ({ h: entry.sukuyoHan, n: entry.nakshatraEn }));
  const marquee = [...crosswalk, ...crosswalk];

  const related = (Array.isArray(page?.relatedServices) ? page.relatedServices : [])
    .filter((href) => href && href !== page?.path)
    .map((href) => ({ href, label: RELATED_LABELS[href] || "관련 별자리 리딩" }));

  // 구조화 데이터(JSON-LD): WebPage · Service · Breadcrumb · FAQPage(리치 스니펫)
  const breadcrumb = [
    { name: "꿀꿀 운세 홈", path: "/" },
    { name: "운세 서비스", path: "/guides" },
    { name: page?.h1 || page?.title, path: page?.path || "/nakshatra" },
  ];
  const jsonLd = [
    {
      ...buildWebPageJsonLd({ title: page?.title, description: page?.description, path: page?.path || "/nakshatra" }),
      ...(dateModified ? { dateModified } : {}),
    },
    buildServiceJsonLd({ name: page?.title, description: page?.description, path: page?.path || "/nakshatra", serviceType: "운세 해석 서비스" }),
    buildBreadcrumbJsonLd(breadcrumb),
    ...(faqs.length > 0 ? [buildFaqPageJsonLd(faqs)] : []),
  ];

  return (
    <main className={`${styles.vars} ${styles.shell}`}>
      <div className={styles.sky} aria-hidden="true" />
      <div className={styles.stars} aria-hidden="true" />
      <div className={styles.mandalaBg} aria-hidden="true">
        <Yantra />
      </div>

      {/* 히어로 */}
      <header className={styles.hero}>
        <div className={`${styles.wrap} ${styles.heroGrid}`}>
          <div>
            <span className={styles.kicker}><Spark className="spark" /> 동양 27宿 · 인도 27 Nakshatra</span>
            <h1 className={styles.title}>
              {headline.lead}
              {headline.accent && <span className={styles.accent}>{headline.accent}</span>}
            </h1>
            <p className={styles.lead}>{page?.intro || page?.description}</p>

            <div className={styles.emblem}>
              <div className={`${styles.em} ${styles.emEast}`}>
                <Taegeuk className={styles.emSym} title="태극 — 동양 숙요점" />
                <span className={styles.emLab}><b>동양 · 숙요점</b><small>27수 · 태극(太極)</small></span>
              </div>
              <span className={styles.emJoin}><span className="ln" /><Spark className="spark" /><span className="ln" /></span>
              <div className={`${styles.em} ${styles.emWest}`}>
                <Yantra className={styles.emSym} style={{ color: "var(--gold-soft)" }} title="스리 얀트라 — 인도 베다점" />
                <span className={styles.emLab}><b>인도 · 베다점</b><small>Nakshatra · Yantra</small></span>
              </div>
            </div>

            <a href="#nakshatra-form" className={styles.heroCta}>
              <Spark className="spark" /> {page?.ctaLabel || "내 달 좌표의 두 해석 확인하기"}
            </a>
          </div>

          <figure className={styles.art}>
            <div className={styles.artFrame}>
              <CornerMark className={`${styles.corner} ${styles.cornerTl}`} />
              <CornerMark className={`${styles.corner} ${styles.cornerTr}`} />
              <CornerMark className={`${styles.corner} ${styles.cornerBl}`} />
              <CornerMark className={`${styles.corner} ${styles.cornerBr}`} />
              <div className={styles.artInner}>
                <Image
                  src={FUSION_IMAGE}
                  alt="숙요점과 베다점이 결합된 나크샤트라 결정판 — 동양 별자리 문양과 인도 만다라가 교차하는 이미지"
                  width={1672}
                  height={941}
                  priority
                  unoptimized
                />
              </div>
            </div>
            <span className={styles.seal}><Spark className="spark" /> 나크샤트라 <b>결정판</b> · 무료 공개</span>
          </figure>
        </div>

        <div className={styles.wrap}>
          <div className={styles.marquee}>
            <div className={styles.mqRow}>
              {marquee.map((item, index) => (
                <span key={`${item.h}-${index}`}><span className="h">{item.h}</span><span className="n">{item.n}</span></span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* 임베드 입력폼 */}
      <section id="nakshatra-form" className={styles.formShell}>
        <div className={styles.wrap}>
          <NakshatraFormClient />
        </div>
      </section>

      {/* 결과 미리보기 — 동양 / 인도 / 통합 */}
      {resultItems.length > 0 && (
        <section className={styles.section}>
          <div className={styles.wrap}>
            <div className={styles.secHead}>
              <div className={styles.eyebrow}>What you&apos;ll read</div>
              <h2>세 개의 관점을 한 화면에</h2>
            </div>
            <div className={styles.trio}>
              {resultItems.map((text, index) => {
                const meta = PERSPECTIVES[index] || PERSPECTIVES[0];
                const Symbol = index === 1 ? Yantra : Taegeuk;
                return (
                  <article key={index} className={`${styles.persp} ${styles[meta.cls]}`}>
                    <div className={styles.halo} />
                    <Symbol className={styles.pSym} />
                    <h3>{meta.title}</h3>
                    <div className={styles.sub}>{meta.sub}</div>
                    <p>{text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 진행 방식 */}
      {steps.length > 0 && (
        <section className={`${styles.section} ${styles.sectionTop}`}>
          <div className={styles.wrap}>
            <div className={styles.secHead}>
              <div className={styles.eyebrow}>How it works</div>
              <h2>이렇게 진행돼요</h2>
            </div>
            <div className={styles.steps}>
              {steps.map((text, index) => (
                <div key={index} className={styles.step}>
                  <div className={styles.stepNum}>{index + 1}</div>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 체계 비교·계산 예시 — page.sections(lib/seo-landing-pages.js). 예시 값은
          __tests__/ui/core-landing-calculation-examples.test.mjs 가 엔진 결과와 맞춰 본다. */}
      {sections.map((section) => (
        <section key={section.heading} className={`${styles.section} ${styles.sectionTop}`}>
          <div className={styles.wrap}>
            <div className={styles.secHead}>
              <h2>{section.heading}</h2>
            </div>
            {(section.paragraphs || []).map((text) => (
              <p key={text} className={styles.lead}>{text}</p>
            ))}
          </div>
        </section>
      ))}

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className={`${styles.section} ${styles.sectionTop}`}>
          <div className={styles.wrap}>
            <div className={styles.secHead}>
              <div className={styles.eyebrow}>Q &amp; A</div>
              <h2>자주 묻는 질문</h2>
            </div>
            <div className={styles.faq}>
              {faqs.map((faq, index) => (
                <details key={index} open={index === 0}>
                  <summary>{faq.question}</summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {dateModified && (
        <div className={styles.wrap}>
          <ContentIntegrityNote contentSource="authored" contentPath={page?.path || ""} dateModified={dateModified} tone="dark" className="mx-auto mb-10 max-w-[780px]" />
        </div>
      )}

      {/* 관련 별자리 리딩 — 내부 링크(SEO·탐색성) */}
      {related.length > 0 && (
        <section className={`${styles.section} ${styles.sectionTop}`}>
          <div className={styles.wrap}>
            <div className={styles.secHead}>
              <div className={styles.eyebrow}>Explore more</div>
              <h2>이어서 볼 만한 별자리 리딩</h2>
            </div>
            <div className={styles.relatedGrid}>
              {related.map((item) => (
                <Link key={item.href} href={item.href} className={styles.relatedLink}>
                  <span>{item.label}</span>
                  <span className="arr" aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/*
        27수 도감(/nakshatra/codex/0~26)은 별마다 손으로 쓴 고유 해설을 갖고 있는데도
        2026-07 실측에서 인바운드가 서로 간의 이전/다음 링크뿐이라 사실상 도달 불가였다.
        허브에서 27개를 전부 열어 준다.
      */}
      <section className={`${styles.section} ${styles.sectionTop}`}>
        <div className={styles.wrap}>
          <div className={styles.secHead}>
            <div className={styles.eyebrow}>Nakshatra Codex</div>
            <h2>27수 도감 — 별 하나하나의 두 이름</h2>
          </div>
          <p className={styles.lead}>
            숙요와 나크샤트라는 달의 길을 나누어 읽는 역사적 접점이 있지만, 이름과 경계가 같은 단일
            체계는 아닙니다. 아래 표는 같은 항성 달 황경을 현재 서비스의 두 계산 배열에 적용한 결과를
            고정 오프셋으로 정렬합니다. 역사 문헌의 대표 별 대응표와 구분해 비교해 보세요.
          </p>
          <p className={styles.lead}>
            근거는 <a href="https://doi.org/10.3390/rel14101276">중국 월수와 인도 나크샤트라 비교 연구</a>와{" "}
            <a href="https://eco.mtk.nao.ac.jp/koyomi/wiki/C6F3BDBDC8ACBDC9.html">일본 국립천문대의 27수·28수 해설</a>을 참고했습니다.
          </p>
          <div className={styles.relatedGrid}>
            {SUKUYO_MANSIONS.map((mansion, index) => (
              <Link key={mansion.nameHan} href={`/nakshatra/codex/${index}`} className={styles.relatedLink}>
                <span>
                  {mansion.nameKo}수({mansion.nameHan})
                </span>
                <span className="arr" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className={styles.footNote}>
        <span className={styles.fnSym}>
          <Taegeuk />
          <Yantra style={{ color: "var(--gold)" }} />
        </span>
        <span>나크샤트라 결정판 · 같은 달 좌표를 두 체계로 비교하는 읽기</span>
      </div>

      {jsonLd.map((data, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
      ))}
    </main>
  );
}
