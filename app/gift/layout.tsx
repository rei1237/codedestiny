import type { ReactNode } from "react";
import "./gift.css";

export const metadata = {
  title: "운명의 선물 | Code Destiny",
  description: "CODE DESTINY 이용권 선물을 확인하고, 로그인한 계정으로 수령하거나 보낸 선물을 관리하세요.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function GiftLayout({ children }: { children: ReactNode }) {
  return <main className="gift-page"><div className="gift-shell"><a className="gift-back" href="/points/">← 이용권 상점</a>{children}<p className="gift-signature">CODE DESTINY<br />당신의 운명을 여러 체계로 함께 읽어드립니다.</p></div></main>;
}
