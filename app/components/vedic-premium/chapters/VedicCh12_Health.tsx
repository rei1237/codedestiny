import React from "react";
import type { VedicChapterSampleProps } from "./types";
import VedicChapterStandard from "./VedicChapterStandard";

export default function VedicCh12_Health(props: VedicChapterSampleProps) {
  return <VedicChapterStandard {...props} badge="CH12 포인트 · 건강/심리" title="몸과 마음의 균형" />;
}