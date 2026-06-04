import type { Metadata } from "next";
import { withUniqueRouteMetadata } from "../../lib/generate-page-metadata";

export const metadata: Metadata = withUniqueRouteMetadata("/points", {
  title: "연이의 달빛 이용권 상점 · 이용권 구매 & 주문 내역 | Code Destiny",
  description:
    "연이의 달빛 이용권 상점에서 30일 이용권 상품, 구매 방법, 주문 내역과 이용 혜택을 한 번에 확인할 수 있습니다.",
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
        연이의 달빛 이용권 상점
      </h1>
      {children}
    </>
  );
}
