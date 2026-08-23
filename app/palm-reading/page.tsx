import PalmReadingRouteClient from "./PalmReadingRouteClient";
import { generatePageMetadata } from "../../lib/generate-page-metadata";
import RouteMetadataLocaleSync from "../components/RouteMetadataLocaleSync";

const PALM_READING_METADATA_COPY = {
  ko: {
    title: "손금 지도 - Palm Destiny | Code Destiny",
    description:
      "손바닥 이미지 기반으로 사랑, 재물, 직업, 마음 흐름을 상징적으로 읽어보는 손금 지도 기본 화면입니다.",
    keywords: ["손금", "손금 지도", "Palm Destiny", "손바닥 운세", "손금 리딩"],
    featureList: ["손바닥 업로드 준비", "실시간 촬영 준비", "손금 결과 화면 준비"],
  },
  en: {
    title: "Palm Map - Palm Destiny | Code Destiny",
    description:
      "A symbolic palm-reading screen for love, money, career, and emotional flow based on a palm image.",
    keywords: ["palm reading", "palm map", "Palm Destiny", "hand fortune", "palmistry reading"],
    featureList: ["Palm upload ready", "Live capture ready", "Palm result screen ready"],
  },
  ja: {
    title: "手相マップ - Palm Destiny | Code Destiny",
    description:
      "手のひら画像をもとに、恋愛・金運・仕事・心の流れを象徴的に読む手相マップの基本画面です。",
    keywords: ["手相", "手相マップ", "Palm Destiny", "手のひら占い", "手相リーディング"],
    featureList: ["手のひら画像アップロード準備", "リアルタイム撮影準備", "手相結果画面準備"],
  },
  zh: {
    title: "手相地图 - Palm Destiny | Code Destiny",
    description:
      "基于手掌图像，象征性解读爱情、财富、职业与内心流向的手相地图基础页面。",
    keywords: ["手相", "手相地图", "Palm Destiny", "手掌运势", "手相解读"],
    featureList: ["手掌上传准备", "实时拍摄准备", "手相结果页面准备"],
  },
} as const;

const META = {
  path: "/palm-reading",
  ...PALM_READING_METADATA_COPY.ko,
  image: "https://code-destiny.com/fuctionassets/ai%20animal.webp",
  applicationCategory: "LifestyleApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

export default function PalmReadingPage() {
  return (
    <>
      <RouteMetadataLocaleSync entries={PALM_READING_METADATA_COPY} />
      <PalmReadingRouteClient />
    </>
  );
}
