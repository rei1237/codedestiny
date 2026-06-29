import type { Metadata } from "next";
import DestinyMeetingPlaceRouteClient from "./DestinyMeetingPlaceRouteClient";

const DESTINY_MEETING_PLACE_METADATA_COPY = {
  ko: {
    title: "사주로 보는 인연의 장소 | Code Destiny",
    description:
      "생년월일 기반 사주 에너지로 인연이 열리는 장소, 도시, 타이밍, 스타일을 별빛 지도처럼 안내하는 프리미엄 감성 리포트",
  },
  en: {
    title: "Destiny Meeting Place by Saju | Code Destiny",
    description:
      "A premium emotional report that reads your birth-based saju energy and maps places, cities, timing, and style where meaningful connections may open.",
  },
  ja: {
    title: "四柱推命で見る縁の場所 | Code Destiny",
    description:
      "生年月日にもとづく四柱推命エネルギーから、縁が開く場所・都市・タイミング・スタイルを星明かりの地図のように案内するプレミアム感性リポートです。",
  },
  zh: {
    title: "用四柱看见缘分之地 | Code Destiny",
    description:
      "依据出生信息中的四柱能量，以星光地图般的方式指引缘分开启的地点、城市、时机与风格。",
  },
};

const metadataCopy = DESTINY_MEETING_PLACE_METADATA_COPY.ko;

export const metadata: Metadata = {
  title: metadataCopy.title,
  description: metadataCopy.description,
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function Page() {
  return <DestinyMeetingPlaceRouteClient />;
}
