import React from "react";
import type { VedicChapterSampleProps } from "./types";
import VedicChapterStandard from "./VedicChapterStandard";

export default function VedicCh9_Dosha(props: VedicChapterSampleProps) {
  return <VedicChapterStandard {...props} badge="CH9 포인트 · 도샤/리스크" title="막힘과 반복되는 시련" />;
}