import React from "react";
import type { VedicChapterSampleProps } from "./types";
import VedicChapterStandard from "./VedicChapterStandard";

export default function VedicCh6_Houses(props: VedicChapterSampleProps) {
  return <VedicChapterStandard {...props} badge="CH6 포인트 · 12하우스 분석" title="인생 영역별 카르마 지도" />;
}