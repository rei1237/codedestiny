import TeaCupDebugRouteClient from "./TeaCupDebugRouteClient";
import { notFound } from "next/navigation";

export const metadata = {
  title: "운명의 찻집 찻잔 Crop Debug | Code Destiny",
  description:
    "운명의 찻집 찻잔 이미지 크롭 비율을 눈으로 대조하는 개발용 검증 화면입니다. 프로덕션 빌드에서는 404 이며 검색 색인 대상이 아닙니다.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  // 디버그 라우트는 프로덕션 빌드에서 404로 제외한다.
  if (process.env.NODE_ENV === "production") notFound();

  return <TeaCupDebugRouteClient />;
}
