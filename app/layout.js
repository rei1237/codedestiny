import "../styles/globals.css";
import { headers } from "next/headers";

const CANONICAL_ORIGIN = "https://code-destiny.com";

function normalizePathname(input) {
  if (!input) return "/";

  try {
    if (input.startsWith("http://") || input.startsWith("https://")) {
      return new URL(input).pathname || "/";
    }
  } catch {
    return "/";
  }

  const pathname = input.startsWith("/") ? input : `/${input}`;
  return pathname || "/";
}

export const metadata = {
  metadataBase: new URL("https://code-destiny.com"),
  title: {
    default: "Code Destiny | 무료 사주 타로 운세",
    template: "%s | Code Destiny",
  },
  description:
    "Code Destiny는 무료 사주, 타로, 운세, 궁합 콘텐츠를 제공하는 서비스입니다. 개인정보처리방침, 이용약관, 문의 채널을 투명하게 제공합니다.",
  keywords: [
    "Code Destiny",
    "사주",
    "타로",
    "운세",
    "개인정보처리방침",
    "이용약관",
    "문의하기",
    "무료 운세",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({ children }) {
  const headerStore = await headers();
  const requestPath = normalizePathname(
    headerStore.get("x-pathname") || headerStore.get("next-url") || "/",
  );
  const canonicalHref = new URL(requestPath, CANONICAL_ORIGIN).toString();

  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="canonical" href={canonicalHref} />
        <meta name="adsense-script-slot" content="ADSENSE_APPROVAL_SCRIPT_SLOT" />
        <meta name="adsense-unit-slot" content="ADSENSE_AD_UNIT_SLOT" />
      </head>
      <body>
        <div>{children}</div>
        <footer
          style={{
            marginTop: "40px",
            padding: "20px 16px 28px",
            borderTop: "1px solid rgba(148, 163, 184, 0.28)",
            fontSize: "14px",
            textAlign: "center",
            color: "#cbd5e1",
            background: "rgba(15, 23, 42, 0.9)",
          }}
        >
          <p style={{ marginBottom: "8px" }}>© 2026 Code Destiny. All rights reserved.</p>
          <nav aria-label="정책 페이지 바로가기" style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="https://code-destiny.com/privacy-policy" style={{ color: "#e2e8f0", textDecoration: "underline" }}>
              Privacy Policy
            </a>
            <a href="https://code-destiny.com/terms-of-service" style={{ color: "#e2e8f0", textDecoration: "underline" }}>
              Terms of Service
            </a>
            <a href="https://code-destiny.com/contact-us" style={{ color: "#e2e8f0", textDecoration: "underline" }}>
              Contact Us
            </a>
          </nav>
        </footer>
      </body>
    </html>
  );
}
