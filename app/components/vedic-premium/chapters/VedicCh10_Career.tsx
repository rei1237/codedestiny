import React from "react";
import type { VedicChapterSampleProps } from "./types";
import VedicChapterStandard from "./VedicChapterStandard";

export default function VedicCh10_Career(props: VedicChapterSampleProps) {
  return <VedicChapterStandard {...props} badge="CH10 포인트 · 직업/재물/성공" title="현실 성취의 구조" />;
}