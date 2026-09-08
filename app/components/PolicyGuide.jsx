import Image from "next/image";
import Link from "next/link";
import styles from "./PolicyGuide.module.css";

export const policyPageClass = styles.page;

const GUIDES = {
  terms: [
    ["이용 기준", "서비스 범위와 이용자의 권리", "#service"],
    ["유료 이용", "이용권·월정석·단건 결제", "#free-trial"],
    ["환불·취소", "청약철회와 환불 기준", "#refund-policy"],
  ],
  privacy: [
    ["수집 목적", "어떤 정보를 왜 사용하는지", "#collected-data"],
    ["보관·삭제", "프로필과 정보의 보관 기준", "#retention"],
    ["나의 권리", "열람·정정·삭제 요청", "#user-rights"],
  ],
  refund: [
    ["단건 결제", "제공·사용 상태별 기준", "#refund-policy"],
    ["이용권", "기간과 사용 내역 확인", "#refund-policy"],
    ["결제 오류", "반영 지연과 복귀 안내", "#payment-help"],
  ],
  contact: [
    ["서비스 문의", "이용 방법과 오류 신고", "#support-contact"],
    ["결제 문의", "이용권·단건 결제와 환불", "/refund-policy"],
    ["개인정보", "권리 행사와 삭제 안내", "/privacy#user-rights"],
  ],
  about: [
    ["만드는 사람", "콘텐츠 제작과 검수 책임", "#author"],
    ["해석 기준", "전통 체계와 AI의 역할", "#about-methods"],
    ["서비스 철학", "미래보다 선택을 정리하는 곳", "#about-purpose"],
  ],
  faq: [
    ["처음이라면", "무료 운세와 시작 방법", "#faq-list"],
    ["유료 이용", "이용권과 단건 결제", "/refund-policy"],
    ["도움이 필요할 때", "결제·프로필·개인정보", "/contact"],
  ],
};

const POLICY_PAGES = [
  ["terms", "이용약관", "/terms"],
  ["privacy", "개인정보", "/privacy"],
  ["refund", "환불·취소", "/refund-policy"],
  ["contact", "고객센터", "/contact"],
  ["about", "서비스 소개", "/about"],
  ["faq", "FAQ", "/faq"],
];

function PolicyHero({ title, description, meta }) {
  return (
    <header className={styles.hero}>
      <div className={styles.heroCopy}>
        <h1>{title}</h1>
        {meta ? <p className={styles.meta}>{meta}</p> : null}
        <p className={styles.description}>{description}</p>
        <p className={styles.reassurance}>필요한 내용부터 천천히 살펴보세요. 꽃돼지가 길을 안내할게요.</p>
      </div>
      <Image
        src="/icons/app-logo-512.webp"
        alt="연꽃을 쓴 Code Destiny 꽃돼지"
        width={512}
        height={512}
        sizes="(max-width: 600px) 88px, 120px"
        className={styles.pig}
        priority
      />
    </header>
  );
}

function PolicySummaryCards({ kind }) {
  return (
    <nav className={styles.summaries} aria-label="핵심 안내 바로가기">
      {GUIDES[kind].map(([title, text, href]) => (
        <Link href={href} className={styles.summary} key={title}>
          <strong>{title}</strong>
          <span>{text}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </Link>
      ))}
    </nav>
  );
}

export function PolicyAccordion({ id, title, children }) {
  return (
    <details id={id} className={styles.accordion}>
      <summary>{title}</summary>
      <div>{children}</div>
    </details>
  );
}

export default function PolicyGuide({ kind, ...hero }) {
  return (
    <>
      <PolicyHero {...hero} />
      <nav className={styles.nav} aria-label="정책 및 도움말">
        {POLICY_PAGES.map(([key, label, href]) => (
          <Link key={key} href={href} aria-current={key === kind ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      <PolicySummaryCards kind={kind} />
    </>
  );
}
