"use client";
import dynamic from "next/dynamic";

const AdvancedZiweiSection = dynamic(
  () => import("../../components/AdvancedZiweiSectionV2"),
  // 도구 첫 화면(입력 폼)이 min-h-[100dvh] 라, 빈 로딩 자리는 뒤따르는 서버 본문을 먼저 그렸다가
  // 도구가 붙을 때 한 화면만큼 밀어낸다(CLS). 같은 높이의 자리를 서버 HTML 에 미리 잡아 둔다.
  { ssr: false, loading: () => <div className="min-h-[100dvh]" aria-hidden="true" /> }
);

export default function ZiweiChartClientLoader() {
  return <AdvancedZiweiSection />;
}
