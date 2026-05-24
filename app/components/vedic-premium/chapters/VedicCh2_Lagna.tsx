import React from "react";
import type { VedicChapterSampleProps } from "./types";
import VedicChapterStandard from "./VedicChapterStandard";

export default function VedicCh2_Lagna(props: VedicChapterSampleProps) {
  return <VedicChapterStandard {...props} badge="CH2 포인트 · 라그나 분석" title="이번 생의 출발점과 인생 방향" />;
}