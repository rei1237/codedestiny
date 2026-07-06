import TeaCupDebugRouteClient from "./TeaCupDebugRouteClient";
import { notFound } from "next/navigation";

export const metadata = {
  title: "운명의 찻집 찻잔 Crop Debug | Code Destiny",
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
