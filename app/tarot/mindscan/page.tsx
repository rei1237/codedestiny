import MindScanTarotClient from "./MindScanTarotClient";

export const metadata = {
  title: "상대방의 정확한 속마음 알아보기 타로 | Code Destiny",
  description:
    "10카드 십자 스프레드로 상대방의 진짜 속마음·감정·욕구를 타로 카드로 읽어드립니다. 글래스모피즘 Midnight Mystery 디자인의 몰입형 타로 리딩.",
  openGraph: {
    title: "상대방의 속마음 알아보기 타로 | Code Destiny",
    description: "상대방의 진심, 숨겨진 감정, 바라는 미래를 10장 타로로 분석합니다.",
    images: [{ url: "https://code-destiny.com/fuctionassets/mindscantaro.webp" }],
  },
};

export default function MindScanTarotPage() {
  return <MindScanTarotClient />;
}
