import type { Metadata } from "next";
import { withUniqueRouteMetadata } from "../../lib/generate-page-metadata";

export const metadata: Metadata = withUniqueRouteMetadata("/points", {
  title: "결제/이용권 관리 · 황금 꽃돼지상점 | Code Destiny",
  description:
    "코드 데스티니 유료 콘텐츠 단건 결제, 결제 내역 조회, Honey 멤버십 30일 이용권 관리를 제공합니다.",
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
        코드 데스티니 결제/멤버십 관리
      </h1>
      {children}
    </>
  );
}
