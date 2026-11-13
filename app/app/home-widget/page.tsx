import type { Metadata } from "next";
import HomeWidgetStudio from "./HomeWidgetStudio";
import "@/app/yeongnyangi/night-tokens.css";
import "../talismans/talismans.css";
import "./home-widget.css";

export const metadata: Metadata = {
  title: "연이의 달빛 홈 화면 | 꿀꿀 운세",
  description: "연이의 꽃말과 부적, 영냥이의 오늘 운세를 휴대폰 홈 화면에서 만나세요.",
  robots: { index: false, follow: true },
};

export default function HomeWidgetPage() {
  return <HomeWidgetStudio />;
}
