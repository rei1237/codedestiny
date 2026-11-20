import styles from "./PremiumCompatEntry.module.css";

// /saju/compatibility/ 소개 페이지의 고급 궁합 진입 카드. 결제·입력 화면(noindex)으로만 보낸다.
export default function PremiumCompatEntry() {
  return (
    <a className={styles.entry} href="/saju/compatibility/premium/">
      <img
        src="/images/service-introductions/tea-saju-compat-640.webp"
        srcSet="/images/service-introductions/tea-saju-compat-320.webp 320w, /images/service-introductions/tea-saju-compat-640.webp 640w, /images/service-introductions/tea-saju-compat-960.webp 960w"
        sizes="(max-width: 600px) 92vw, 336px"
        width={640}
        height={427}
        alt="연이의 사주 궁합 상담 장면"
        loading="lazy"
        decoding="async"
      />
      <div className={styles.copy}>
        <span className={styles.eyebrow}>달빛 아래 연이가 쓰는 두 사람의 이야기</span>
        <strong>사주 고급 궁합</strong>
        <span className={styles.description}>
          합과 충, 서로 채워 주는 오행, 상대의 이성 기질 지표와 전생 인연을 근거와 함께 계산하고 네 장의 풀이로 관계의 흐름과 실천을 정리해 드려요.
        </span>
        <ul className={styles.features}>
          <li>합충·오행 카드</li>
          <li>이성 기질 지표</li>
          <li>전생 인연</li>
          <li>보관함 저장</li>
        </ul>
        <b>고급 궁합 보기 · 10,000원 <span aria-hidden="true">→</span></b>
      </div>
    </a>
  );
}
