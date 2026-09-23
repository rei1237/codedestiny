"use client";
import dynamic from "next/dynamic";

const AdvancedZiweiSection = dynamic(
  () => import("../../components/AdvancedZiweiSectionV2"),
  { ssr: false, loading: () => null }
);

export default function ZiweiChartClientLoader() {
  return <AdvancedZiweiSection />;
}
