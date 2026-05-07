import type { Metadata } from "next";
import { withUniqueRouteMetadata } from "../../../lib/generate-page-metadata";

export const metadata: Metadata = withUniqueRouteMetadata("/points/history", {
  title: "포인트 사용·결제 이력 | Code Destiny",
  description: "코드 데스티니 포인트 충전/차감/환불 이력과 결제 내역을 조회하는 히스토리 페이지입니다.",
});

export default function PointsHistoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
