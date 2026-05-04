"use client";
import dynamic from "next/dynamic";

const AdvancedZiweiSection = dynamic(
  () => import("../../components/AdvancedZiweiSection"),
  { ssr: false, loading: () => null }
);

export default function ZiweiChartClientLoader() {
  return <AdvancedZiweiSection />;
}
