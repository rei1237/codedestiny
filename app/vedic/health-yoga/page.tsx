"use client";

import Link from "next/link";
import { useVedicChart } from "../useVedicChart";
import { HealthYogaSection } from "../VedicInterpretation";

export default function VedicHealthYogaPage() {
  const { chart, loading, errorMessage } = useVedicChart();

  return (
    <div className="vedic-detail-wrap">
      <Link href="/vedic" className="vedic-detail-back">
        ← 은하로 돌아가기
      </Link>
      {loading && <p className="vedic-detail-desc">몸과 마음의 균형을 읽는 중입니다. 잠시만 기다려 주세요.</p>}
      {errorMessage && !loading && <p className="vedic-detail-desc">{errorMessage}</p>}
      {chart && !loading && !errorMessage && <HealthYogaSection chart={chart} />}
    </div>
  );
}
