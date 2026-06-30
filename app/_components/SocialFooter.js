import styles from "../components/SiteFooterHub.module.css";

const SOCIAL_LINKS = [
  {
    href: "https://www.youtube.com/@CodeDestiny_Official",
    label: "유튜브",
    icon: "▶",
    tone: "Youtube",
    ariaLabel: "Code Destiny 공식 유튜브 새 창으로 열기",
  },
  {
    href: "https://www.threads.com/@codedestiny_official",
    label: "쓰레드",
    icon: "@",
    tone: "Threads",
    ariaLabel: "Code Destiny 공식 쓰레드 새 창으로 열기",
  },
  {
    href: "https://www.instagram.com/codedestiny_official/",
    label: "인스타그램",
    icon: "◎",
    tone: "Instagram",
    ariaLabel: "Code Destiny 공식 인스타그램 새 창으로 열기",
  },
  {
    href: "https://blog.naver.com/goodbyejieun",
    label: "블로그",
    icon: "N",
    tone: "Blog",
    ariaLabel: "Code Destiny 공식 블로그 새 창으로 열기",
  },
  {
    href: "https://x.com/sajuseongj97497",
    label: "X",
    icon: "X",
    tone: "X",
    ariaLabel: "Code Destiny 공식 X 새 창으로 열기",
  },
];

export default function SocialFooter() {
  return (
    <section className={styles.sfhSocialCard} aria-label="Code Destiny 공식 SNS 채널">
      <div className={styles.sfhSocialHeader}>
        <span className={styles.sfhSocialKicker}>Official Channels</span>
        <strong className={styles.sfhSocialTitle}>Code Destiny 공식 채널</strong>
      </div>
      <nav className={styles.sfhSocialGrid} aria-label="Code Destiny SNS 바로가기">
        {SOCIAL_LINKS.map((link) => (
          <a
            key={link.href}
            className={`${styles.sfhSocialLink} ${styles[`sfhSocialLink${link.tone}`]}`}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.ariaLabel}
          >
            <span className={styles.sfhSocialIcon} aria-hidden="true">{link.icon}</span>
            <span className={styles.sfhSocialText}>{link.label}</span>
          </a>
        ))}
      </nav>
    </section>
  );
}
