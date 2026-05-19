import type { Metadata } from "next";
import DestinyMeetingPlacePage from "./components/DestinyMeetingPlacePage";

export const metadata: Metadata = {
  title: "사주로 보는 인연의 장소 | Code Destiny",
  description: "생년월일 기반 사주 에너지로 인연이 열리는 장소, 국가, 시기, 스타일을 추천하는 독립 리포트",
};

export default function Page() {
  return <DestinyMeetingPlacePage />;
}
