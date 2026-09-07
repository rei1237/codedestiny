import Image from 'next/image';
import Link from 'next/link';
import styles from './PolicyGuide.module.css';

export const policyPageClass = styles.page;
const guides = {
  terms: [['이용 기준', '서비스의 범위와 이용자의 권리', '#service'], ['유료 이용', '이용권·월정석·단건 결제', '#free-trial'], ['환불·취소', '청약철회와 환불 기준', '#refund-policy']],
  privacy: [['수집 목적', '어떤 정보를 왜 사용하는지', '#collected-data'], ['보관·삭제', '프로필 카드와 정보 보관 기준', '#retention'], ['내 정보 권리', '열람·정정·삭제 요청', '#user-rights']],
  refund: [['단건 결제', '제공·사용 상태별 기준', '#refund-policy'], ['이용권', '기간과 사용 내역 확인', '#refund-policy'], ['결제 오류', '반영 지연과 모바일 복귀 안내', '#payment-help']],
  contact: [['서비스 문의', '이용 방법과 오류 신고', '#support-contact'], ['결제 문의', '이용권·단건 결제와 환불', '/refund-policy'], ['개인정보', '권리행사와 삭제 안내', '/privacy#user-rights']],
  about: [['만드는 사람', '10년 경력 명리학자', '#author'], ['해석 기준', '고전 규칙과 AI의 역할', '#about-methods'], ['서비스 철학', '미래 확정보다 선택의 정리', '#about-purpose']],
  faq: [['처음이라면', '무료 운세와 시작 방법', '#faq-list'], ['유료 이용', '이용권과 단건 결제', '/refund-policy'], ['도움이 필요할 때', '결제·프로필·개인정보', '/contact']],
};
const pages = [['terms','이용약관','/terms'],['privacy','개인정보','/privacy'],['refund','환불·취소','/refund-policy'],['contact','고객센터','/contact'],['about','서비스 소개','/about'],['faq','FAQ','/faq']];

export function PolicyHero({ title, description, meta }) {
  return <header className={styles.hero}>
    <div><p className={styles.eyebrow}>안심하고 이용하기 위한 안내</p><h1>{title}</h1>{meta && <p className={styles.meta}>{meta}</p>}<p className={styles.description}>{description}</p></div>
    <Image src="/icons/app-logo-512.webp" alt="연꽃을 쓴 꽃돼지" width={512} height={512} sizes="(max-width: 600px) 72px, 112px" className={styles.pig} />
  </header>;
}
export function PolicySummaryCards({ kind }) {
  return <nav className={styles.summaries} aria-label="핵심 안내 바로가기">{guides[kind].map(([title, text, href]) => <Link href={href} className={styles.summary} key={title}><strong>{title}</strong><span>{text}</span><span aria-hidden="true">↗</span></Link>)}</nav>;
}
export function PolicyAccordion({ id, title, children }) {
  return <details id={id} className={styles.accordion}><summary>{title}</summary><div>{children}</div></details>;
}
export default function PolicyGuide({ kind, ...hero }) {
  return <><PolicyHero {...hero} /><nav className={styles.nav} aria-label="정책 및 도움말">{pages.map(([key,label,href]) => <Link key={key} href={href} aria-current={key === kind ? 'page' : undefined}>{label}</Link>)}</nav><PolicySummaryCards kind={kind}/></>;
}
