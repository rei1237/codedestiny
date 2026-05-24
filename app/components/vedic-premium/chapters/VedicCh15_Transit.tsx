import React from "react";
import type { VedicChapterSampleProps } from "./types";
import VedicChapterStandard from "./VedicChapterStandard";

export default function VedicCh15_Transit(props: VedicChapterSampleProps) {
  return <VedicChapterStandard {...props} badge="CH15 포인트 · 트랜짓 분석" title="현재 하늘이 여는 운의 변화" />;
}