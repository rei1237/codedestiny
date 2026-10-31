import Link from "next/link";
import styles from "./HelpDesk.module.css";

const LINKS = [
  ["/faq/", "자주 묻는 질문", "시작 방법과 이용 안내를 찾아봐요.", "M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"],
  ["/records/", "내 결과 다시 보기", "꿀꿀 운세에 저장한 상담을 꺼내봐요.", "M5 5h14v15H5ZM3 2h18v3H3Zm6 7h6"],
  ["/contact/", "문의하기", "이용 중 궁금한 점이나 오류를 알려주세요.", "M4 4h16v12H9l-5 4Zm4 5h8m-8 3h5"],
];

export default function HelpDesk() {
  return (
    <section className={styles.desk} aria-label="꿀꿀 운세 이용 길잡이">
      <div className={styles.intro}>
        <img className={styles.mascot} src="/images/home/illustrated/yeoni-character-320.webp" srcSet="/images/home/illustrated/yeoni-character-320.webp 320w, /images/home/illustrated/yeoni-character-480.webp 480w" sizes="(max-width: 720px) 88px, 128px" width="320" height="320" alt="책과 찻잔 곁에서 안내하는 꽃돼지 연이" loading="lazy" decoding="async" />
        <div><h2>궁금한 순간에도,<br />길을 잃지 않도록</h2><p>시작 방법부터 저장한 결과까지,<br /> 연이와 함께 필요한 안내를 찾아봐요.</p><Link href="/about/">꿀꿀 운세 서비스 소개 <span aria-hidden="true">→</span></Link></div>
      </div>
      <nav className={styles.links} aria-label="이용 안내와 도움">{LINKS.map(([href, title, description, icon]) => <Link key={href} href={href}><svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true"><path d={icon} /></svg><span><strong>{title}</strong><small>{description}</small></span><svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg></Link>)}</nav>
    </section>
  );
}
