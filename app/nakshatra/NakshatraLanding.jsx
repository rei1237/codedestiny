import Image from "next/image";
import NakshatraFormClient from "./NakshatraFormClient";
import { Taegeuk, Yantra, Spark, CornerMark } from "./NakshatraSymbols";
import styles from "./nakshatra.module.css";

const FUSION_IMAGE =
  "https://assets.code-destiny.com/%EC%97%90%EC%85%8B/%EC%88%99%EC%9A%94%EC%A0%90x%EB%B2%A0%EB%8B%A4%EC%A0%90.webp";

// 27수 ↔ 27 나크샤트라 대응(牛/Abhijit 제외). 결정성 정렬 오프셋.
const HANGUL = ["角","亢","氐","房","心","尾","箕","斗","女","虛","危","室","壁","奎","婁","胃","昴","畢","觜","參","井","鬼","柳","星","張","翼","軫"];
const NAKSHATRA = ["Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","P.Ashadha","U.Ashadha","Shravana","Dhanishta","Shatabhisha","P.Bhadra","U.Bhadra","Revati","Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","P.Phalguni","U.Phalguni","Hasta"];

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
  const headline = splitHeadline(page?.h1);
  const marquee = [...HANGUL.map((h, i) => ({ h, n: NAKSHATRA[i] })), ...HANGUL.map((h, i) => ({ h, n: NAKSHATRA[i] }))];

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
            <span className={styles.kicker}><Spark className="spark" /> 동양 27宿 × 인도 27 Nakshatra</span>
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
              <Spark className="spark" /> {page?.ctaLabel || "내 별의 두 이름 확인하기"}
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
                  width={640}
                  height={640}
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

      <div className={styles.footNote}>
        <span className={styles.fnSym}>
          <Taegeuk />
          <Yantra style={{ color: "var(--gold)" }} />
        </span>
        <span>나크샤트라 결정판 · 동양과 인도, 하나의 하늘 두 개의 언어</span>
      </div>
    </main>
  );
}
