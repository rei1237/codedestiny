import React from "react";
import type { VedicChapterSampleProps } from "./types";
import VedicChapterStandard from "./VedicChapterStandard";

export default function VedicCh7_Nakshatra(props: VedicChapterSampleProps) {
  return <VedicChapterStandard {...props} badge="CH7 포인트 · 나크샤트라" title="영혼의 성향과 본능" />;
}