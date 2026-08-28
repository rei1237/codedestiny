import type { Metadata } from "next";
import TarotDebugRouteClient from "./TarotDebugRouteClient";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "운명의 찻집 타로 아틀라스 검증",
  description:
    "운명의 찻집 타로 아틀라스 매핑을 눈으로 대조하는 개발용 검증 화면입니다. 프로덕션 빌드에서는 404 이며 검색 색인 대상이 아닙니다.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function FortuneTeaHouseTarotDebugRoute() {
  // 디버그 라우트는 프로덕션 빌드에서 404로 제외한다.
  if (process.env.NODE_ENV === "production") notFound();

  return <TarotDebugRouteClient />;
}
