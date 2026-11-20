"use client";

// /saju/free/ 명식 계산 진입: 롤백 플래그로 공통 스텝 플로우판(3c-A2)과 원본 폼 사이를 고른다.
import dynamic from "next/dynamic";
import { GUIDED_FREE_SAJU_ENABLED } from "@/lib/guided-flow/flags.mjs";

const FreeSaju = GUIDED_FREE_SAJU_ENABLED
  ? dynamic(() => import("./FreeSajuGuided"))
  : dynamic(() => import("./FreeSajuForm"));

export default function FreeSajuEntry() {
  return <FreeSaju />;
}
