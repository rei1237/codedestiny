import React from "react";
import type { VedicChapterSampleProps } from "./types";
import VedicChapterStandard from "./VedicChapterStandard";

export default function VedicCh3_Moon(props: VedicChapterSampleProps) {
  return <VedicChapterStandard {...props} badge="CH3 포인트 · 달 차트" title="마음, 감정, 무의식의 흐름" />;
}