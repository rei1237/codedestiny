"use client";

import Link from "next/link";
import { useVedicChart } from "../useVedicChart";
import { LoveSection } from "../VedicInterpretation";

export default function VedicLovePage() {
  const { chart, loading, errorMessage } = useVedicChart();

  return (
    <div className="vedic-detail-wrap">
      <Link href="/vedic" className="vedic-detail-back">
        ← 은하로 돌아가기
      </Link>
      {loading && <p className="vedic-detail-desc">당신의 연애 패턴을 비추는 별빛을 모으는 중입니다.</p>}
      {errorMessage && !loading && <p className="vedic-detail-desc">{errorMessage}</p>}
      {chart && !loading && !errorMessage && <LoveSection chart={chart} />}
    </div>
  );
}
