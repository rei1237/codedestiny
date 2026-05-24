import React from "react";
import type { VedicChapterSampleProps } from "./types";
import VedicChapterStandard from "./VedicChapterStandard";

export default function VedicCh4_Sun(props: VedicChapterSampleProps) {
  return <VedicChapterStandard {...props} badge="CH4 포인트 · 태양 분석" title="자아, 명예, 삶의 중심성" />;
}