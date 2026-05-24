import React from "react";
import type { VedicChapterSampleProps } from "./types";
import VedicChapterStandard from "./VedicChapterStandard";

export default function VedicCh5_Planets(props: VedicChapterSampleProps) {
  return <VedicChapterStandard {...props} badge="CH5 포인트 · 9행성 완전 해석" title="운명을 움직이는 행성의 힘" />;
}