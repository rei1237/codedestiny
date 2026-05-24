import React from "react";
import type { VedicChapterSampleProps } from "./types";
import VedicChapterStandard from "./VedicChapterStandard";

export default function VedicCh8_Yoga(props: VedicChapterSampleProps) {
  return <VedicChapterStandard {...props} badge="CH8 포인트 · 요가 분석" title="성공, 재물, 명예의 특수 구조" />;
}