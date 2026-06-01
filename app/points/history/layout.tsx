import type { Metadata } from "next";
import { withUniqueRouteMetadata } from "../../../lib/generate-page-metadata";

export const metadata: Metadata = withUniqueRouteMetadata("/points/history", {
  title: "결제/멤버십 이력 | Code Destiny",
  description: "코드 데스티니 유료 콘텐츠 단건 결제, 멤버십 이용권, 환불 이력을 조회하는 페이지입니다.",
});

export default function PointsHistoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
