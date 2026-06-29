import styles from "../home-cosmic.module.css";

const SOCIAL_LINKS = [
  {
    href: "https://www.youtube.com/@CodeDestiny_Official",
    label: "유튜브",
    icon: "▶",
    ariaLabel: "Code Destiny 공식 유튜브 새 창으로 열기",
  },
  {
    href: "https://www.threads.com/@codedestiny_official",
    label: "쓰레드",
    icon: "@",
    ariaLabel: "Code Destiny 공식 쓰레드 새 창으로 열기",
  },
  {
    href: "https://www.instagram.com/codedestiny_official/",
    label: "인스타그램",
    icon: "◎",
    ariaLabel: "Code Destiny 공식 인스타그램 새 창으로 열기",
  },
  {
    href: "https://blog.naver.com/goodbyejieun",
    label: "블로그",
    icon: "B",
    ariaLabel: "Code Destiny 공식 블로그 새 창으로 열기",
  },
  {
    href: "https://x.com/sajuseongj97497",
    label: "X",
    icon: "X",
    ariaLabel: "Code Destiny 공식 X 새 창으로 열기",
  },
];

export default function SocialFooter() {
  return (
    <footer className={styles.socialFooter} role="contentinfo" aria-label="Code Destiny 공식 SNS 채널">
      <strong className={styles.socialTitle}>Code Destiny 공식 채널</strong>
      <nav className={styles.socialLinks} aria-label="Code Destiny SNS 바로가기">
        {SOCIAL_LINKS.map((link) => (
          <a
            key={link.href}
            className={styles.socialLink}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.ariaLabel}
          >
            <span className={styles.socialIcon} aria-hidden="true">{link.icon}</span>
            <span>{link.label}</span>
          </a>
        ))}
      </nav>
    </footer>
  );
}
