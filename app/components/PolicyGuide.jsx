import Image from "next/image";
import Link from "next/link";
import styles from "./PolicyGuide.module.css";
import { trustDocumentLinks } from "../../lib/i18n/public-trust-copy.mjs";

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
    ["질문 찾아보기", "시작 방법부터 결과 확인까지", "#faq-list"],
    ["유료 이용", "이용권과 단건 결제", "/refund-policy"],
    ["도움이 필요할 때", "결제·프로필·개인정보", "/contact"],
  ],
};

const POLICY_PAGES = [
  ["faq", "자주 묻는 질문", "/faq/"],
  ["about", "서비스 소개", "/about/"],
  ["contact", "문의하기", "/contact/"],
  ["terms", "이용약관", "/terms"],
  ["privacy", "개인정보", "/privacy"],
  ["refund", "환불·취소", "/refund-policy"],
  ...trustDocumentLinks().map(({ key, label, href }) => [key, label, href]),
];

function PolicyHero({ title, description, meta }) {
  return (
    <header className={styles.hero}>
      <div className={styles.heroCopy}>
        <h1>{title}</h1>
        {meta ? <p className={styles.meta}>{meta}</p> : null}
        <p className={styles.description}>{description}</p>
        <div className={styles.heroActions}>
          {/* 정적 셸은 RSC 경로가 아니므로 문서 이동을 유지합니다. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/ggulggul/" className="cd-yehwa-button cd-yehwa-button--primary">운세 둘러보기</a>
          <Link href="/records/" className={styles.returnLink}>내 결과 다시 보기</Link>
        </div>
      </div>
      <Image
        src="/icons/app-logo-512.webp"
        alt="연꽃을 쓴 꿀꿀운세 꽃돼지"
        width={512}
        height={512}
        sizes="(max-width: 720px) 96px, 160px"
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
      <summary><span>{title}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path className={styles.toggleVertical} d="M12 5v14" /></svg></summary>
      <div>{children}</div>
    </details>
  );
}

export default function PolicyGuide({ kind, ...hero }) {
  return (
    <>
      <nav className={styles.breadcrumb} aria-label="현재 위치"><Link href="/">꿀꿀 운세</Link><span aria-hidden="true">/</span><span>{hero.title}</span></nav>
      <PolicyHero {...hero} />
      <nav className={styles.nav} aria-label="정책 및 도움말">
        {POLICY_PAGES.slice(0, 6).map(([key, label, href]) => (
          <Link key={key} href={href} aria-current={key === kind ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      <details className={styles.moreDocs}>
        <summary><span>해석 기준·콘텐츠 정책 더 보기</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path className={styles.toggleVertical} d="M12 5v14" /></svg></summary>
        <nav aria-label="콘텐츠와 운영 기준">{POLICY_PAGES.slice(6).map(([key, label, href]) => <Link key={key} href={href}>{label}</Link>)}</nav>
      </details>
      {kind !== "faq" && <PolicySummaryCards kind={kind} />}
    </>
  );
}
