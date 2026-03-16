"use client";

import Link from "next/link";
import { useVedicChart } from "../useVedicChart";
import { PersonalitySection } from "../VedicInterpretation";

export default function VedicPersonalityPage() {
  const { chart, loading, errorMessage } = useVedicChart();

  return (
    <div className="vedic-detail-wrap">
      <Link href="/vedic" className="vedic-detail-back">
        ← 은하로 돌아가기
      </Link>
      {loading && <p className="vedic-detail-desc">당신의 기질 지도를 정렬하는 중입니다. 잠시만 기다려 주세요.</p>}
      {errorMessage && !loading && <p className="vedic-detail-desc">{errorMessage}</p>}
      {chart && !loading && !errorMessage && <PersonalitySection chart={chart} />}
    </div>
  );
}
