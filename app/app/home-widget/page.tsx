import type { Metadata } from "next";
import HomeWidgetStudio from "./HomeWidgetStudio";
import "@/app/yeongnyangi/night-tokens.css";
import "../talismans/talismans.css";
import "./home-widget.css";

export const metadata: Metadata = {
  title: "홈 화면 부적·확언 | Code Destiny",
  description: "영냥이 부적이나 짧은 확언을 홈 화면 위젯으로 놓으세요.",
  robots: { index: false, follow: true },
};

export default function HomeWidgetPage() {
  return <HomeWidgetStudio />;
}
