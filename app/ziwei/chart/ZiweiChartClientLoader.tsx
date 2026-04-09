"use client";
import dynamic from "next/dynamic";

const HPremiumZiweiSection = dynamic(
  () => import("../../components/HPremiumZiweiSection"),
  { ssr: false, loading: () => null }
);

export default function ZiweiChartClientLoader() {
  return <HPremiumZiweiSection />;
}
