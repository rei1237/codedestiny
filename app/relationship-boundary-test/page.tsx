import type { Metadata } from "next";
import RelationshipBoundaryTestClient from "./RelationshipBoundaryTestClient";
import { siteSeo } from "@/lib/seo/siteSeo";

const path = "/relationship-boundary-test/";

export const metadata: Metadata = {
  title: "그 사람의 바람끼는? | 관계 경계 사주 테스트",
  description: "상대방의 생년 정보로 관계 경계와 외부 자극에 흔들릴 수 있는 경향을 사주 흐름으로 읽는 리포트입니다.",
  alternates: { canonical: `${siteSeo.siteUrl}${path}` },
  robots: { index: false, follow: false },
};

export default function RelationshipBoundaryTestPage() {
  return <RelationshipBoundaryTestClient />;
}
