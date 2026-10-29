import Link from "next/link";
import styles from "./HelpDesk.module.css";

const LINKS = [
  ["/faq/", "처음이라면, 이용 안내", "운세를 보는 방법과 자주 묻는 질문"],
  ["/records/", "내 결과 다시 보기", "꿀꿀 운세에서 저장한 결과 확인"],
  ["/contact/", "도움이 필요해요", "이용 중 궁금한 점과 오류 문의"],
];

export default function HelpDesk() {
  return (
    <section className={styles.desk} aria-label="꿀꿀 운세 이용 길잡이">
      <div className={styles.intro}><h2>마음 놓고 시작하는 운세</h2><p>처음 방문하셨나요? 이용 방법부터 차근차근 안내해 드릴게요.</p><Link href="/about/">꿀꿀 운세 알아보기</Link></div>
      <nav className={styles.links} aria-label="이용 안내와 도움">{LINKS.map(([href, title, description]) => <Link key={href} href={href}><span><strong>{title}</strong><small>{description}</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg></Link>)}</nav>
    </section>
  );
}
