import { generatePageMetadata } from "../../lib/generate-page-metadata";
import styles from "./page.module.css";

export function generateMetadata() {
  return generatePageMetadata({
    path: "/methodology",
    title: "무료 사주 · 자미두수 운세 분석 콘텐츠 방법론 | CODE DESTINY",
    description:
      "CODE DESTINY 인사이트의 작성 원칙, 자료 검증 방식, 업데이트 정책, 면책 고지를 안내합니다.",
    keywords: [
      "Code Destiny 방법론",
      "운세 콘텐츠 작성 기준",
      "사주 타로 면책 고지",
      "E-E-A-T",
      "콘텐츠 검증",
    ],
  });
}

export default function MethodologyPage() {
  return (
    <main className={styles.methodRoot}>
      <div className={`${styles.methodNebula} ${styles.methodNebulaLeft}`} aria-hidden />
      <div className={`${styles.methodNebula} ${styles.methodNebulaRight}`} aria-hidden />
      <div className={`${styles.methodStars} ${styles.methodStarsNear}`} aria-hidden />
      <div className={`${styles.methodStars} ${styles.methodStarsFar}`} aria-hidden />

      <header className={styles.methodHero}>
        <p className={styles.methodKicker}>Editorial Constellation Protocol</p>
        <h1 className={styles.methodTitle}>무료 사주 · 자미두수 운세 분석 콘텐츠 방법론 및 면책 고지</h1>
        <p className={styles.methodIntro}>
          CODE DESTINY 인사이트 콘텐츠가 어떤 기준으로 작성되고 어떻게 갱신되는지,
          그리고 결과 해석을 안전하게 활용하기 위한 핵심 원칙을 안내합니다.
        </p>
      </header>

      <section className={styles.methodGrid} aria-label="콘텐츠 방법론 상세 항목">
        <article className={styles.methodCard}>
          <p className={styles.methodStep}>01</p>
          <h2>1) 작성 원칙</h2>
          <ul className={styles.methodList}>
            <li>사주, 타로, 점성술, 자미두수 등 전통 해석 체계를 교차 검토해 핵심 맥락을 정리합니다.</li>
            <li>결과 텍스트는 오락성만 강조하지 않고 실생활 의사결정에 도움이 되는 실행 포인트를 포함합니다.</li>
            <li>각 아티클에는 작성자, 최종 수정일, 참고자료(있는 경우)를 함께 제공합니다.</li>
          </ul>
        </article>

        <article className={styles.methodCard}>
          <p className={styles.methodStep}>02</p>
          <h2>2) 자료 검증 및 업데이트</h2>
          <ul className={styles.methodList}>
            <li>콘텐츠는 내부 편집 가이드에 따라 초안 작성 후 문장 명확성, 해석 일관성, 과장 표현 여부를 검토합니다.</li>
            <li>핵심 아티클은 주기적으로 재검토하며 변경 시 최종 수정일을 갱신합니다.</li>
            <li>서비스 정책 변경이나 사용자 피드백이 누적되면 설명 문구와 안내 문서를 즉시 보완합니다.</li>
          </ul>
        </article>

        <article className={styles.methodCard}>
          <p className={styles.methodStep}>03</p>
          <h2>3) 면책 고지</h2>
          <p className={styles.methodCopy}>
            본 서비스의 운세, 사주, 타로, 점성술 콘텐츠는 자기성찰과 참고를 위한 정보이며,
            법률, 세무, 의료, 투자 자문을 대체하지 않습니다. 중요한 결정은 반드시 해당 분야의
            전문 자격을 갖춘 전문가와 상담한 뒤 진행하시기 바랍니다.
          </p>
        </article>

        <article className={styles.methodCard}>
          <p className={styles.methodStep}>04</p>
          <h2>4) 문의 및 정정 요청</h2>
          <p className={styles.methodCopy}>
            콘텐츠 오류, 표현 정정, 출처 보완 요청은 문의 페이지를 통해 접수할 수 있습니다.
            확인 후 필요한 경우 수정 이력을 반영합니다.
          </p>
          <p className={`${styles.methodCopy} ${styles.methodCopyCompact}`}>
            문의: <a className={styles.methodLink} href="/contact">/contact</a>
          </p>
        </article>
      </section>
    </main>
  );
}
