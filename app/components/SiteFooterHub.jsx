import AdminTrigger from "./AdminTrigger";

const POLICY_LINKS = [
  { href: "/faq", text: "FAQ" },
  { href: "/contact-us", text: "문의하기" },
  { href: "/terms-of-service", text: "이용약관" },
  { href: "/privacy-policy", text: "개인정보처리방침" },
];

const LANG_LINKS = [
  { href: "/en-us", text: "EN" },
  { href: "/ja-jp", text: "JP" },
  { href: "/zh-cn", text: "中文" },
  { href: "/es-es", text: "ES" },
  { href: "/fr-fr", text: "FR" },
  { href: "/de-de", text: "DE" },
];

const rootStyle = {
  marginTop: "28px",
  borderTop: "1px solid rgba(120,119,198,0.22)",
  background: "rgba(4,7,18,0.66)",
};

const shellStyle = {
  maxWidth: "1180px",
  margin: "0 auto",
  padding: "14px 20px 16px",
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px 14px",
  color: "#64748b",
  fontSize: "12px",
};

const navStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px 12px",
};

const linkStyle = {
  color: "#8b9db7",
  textDecoration: "none",
};

export default function SiteFooterHub() {
  return (
    <footer style={rootStyle} aria-label="서비스 하단 정책 정보">
      <div style={shellStyle}>
        <nav aria-label="정책 링크" style={navStyle}>
          {POLICY_LINKS.map((link) => (
            <a key={link.href} href={link.href} style={linkStyle}>
              {link.text}
            </a>
          ))}
        </nav>
        <nav aria-label="다국어 링크" style={navStyle}>
          {LANG_LINKS.map((link) => (
            <a key={link.href} href={link.href} style={{ ...linkStyle, color: "#6ee7d8" }}>
              {link.text}
            </a>
          ))}
        </nav>
        <p style={{ margin: 0, width: "100%", textAlign: "center", color: "#475569" }}>
          © 2026 Code Destiny. All rights reserved. <AdminTrigger />
        </p>
      </div>
    </footer>
  );
}
