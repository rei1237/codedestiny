import type { Metadata } from "next";
import RelationshipBoundaryTestClient from "../RelationshipBoundaryTestClient";

export const metadata: Metadata = {
  title: "관계 성향 입력",
  description: "사주 결과 카드 안에서 대상자의 생년 정보를 입력하고 관계 성향 리포트를 확인합니다.",
  robots: { index: false, follow: false },
};

export default function InlineRelationshipBoundaryTestPage() {
  return <RelationshipBoundaryTestClient embedded />;
}
