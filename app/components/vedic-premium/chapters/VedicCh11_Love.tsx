import React from "react";
import type { VedicChapterSampleProps } from "./types";
import VedicChapterStandard from "./VedicChapterStandard";

export default function VedicCh11_Love(props: VedicChapterSampleProps) {
  return <VedicChapterStandard {...props} badge="CH11 포인트 · 연애/결혼" title="인연과 파트너십 분석" />;
}