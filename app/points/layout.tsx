import type { Metadata } from "next";
import { withUniqueRouteMetadata } from "../../lib/generate-page-metadata";

export const metadata: Metadata = withUniqueRouteMetadata("/points", {
  title: "코인 충전소 · 꿀 구독 시스템 | Code Destiny",
  description:
    "코드 데스티니 코인 충전, 결제 내역 조회, 꿀 구독 시스템 관리를 제공하는 포인트 센터입니다.",
});

export default function PointsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        코드 데스티니 코인 충전소
      </h1>
      {children}
    </>
  );
}
