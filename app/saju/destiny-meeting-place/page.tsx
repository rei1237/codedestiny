import type { Metadata } from "next";
import DestinyMeetingPlacePage from "./components/DestinyMeetingPlacePage";

export const metadata: Metadata = {
  title: "사주로 보는 인연의 장소 | Code Destiny",
  description:
    "생년월일 기반 사주 에너지로 인연이 열리는 장소, 도시, 타이밍, 스타일을 별빛 지도처럼 안내하는 프리미엄 감성 리포트",
};

export default function Page() {
  return <DestinyMeetingPlacePage />;
}
