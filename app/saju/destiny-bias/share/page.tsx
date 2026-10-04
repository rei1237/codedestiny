import type { Metadata } from "next";
import { siteSeo } from "@/lib/seo/siteSeo";
import MyDestinyBiasShell from "../components/MyDestinyBiasShell";
import ShareLandingClient from "./ShareLandingClient";

const TITLE = "공유된 최애 케미 카드 | 최애운명";
const DESCRIPTION = "친구가 공유한 최애 케미 유형을 확인하고, 내 생일로 같은 최애와의 케미도 무료로 확인해 보세요.";
const OG_IMAGE = "https://code-destiny.com/images/destiny-bias/og-default-1200x630.png";

// 🔴 noindex 는 metadata 에만 둔다. robots.txt Disallow·_headers X-Robots 로 막으면 카카오 스크래퍼까지
// 막혀 카드 미리보기가 죽는다(app/share/page.tsx 와 같은 처리).
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: false },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://code-destiny.com/saju/destiny-bias/share/",
    siteName: siteSeo.brandName,
    locale: "ko_KR",
    type: "website",
    images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function DestinyBiasSharePage() {
  return (
    <MyDestinyBiasShell>
      <ShareLandingClient />
    </MyDestinyBiasShell>
  );
}
