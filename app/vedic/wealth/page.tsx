"use client";

import Link from "next/link";
import { useVedicChart } from "../useVedicChart";
import { WealthSection } from "../VedicInterpretation";

export default function VedicWealthPage() {
  const { chart, loading, errorMessage } = useVedicChart();

  return (
    <div className="vedic-detail-wrap">
      <Link href="/vedic" className="vedic-detail-back">
        ← 은하로 돌아가기
      </Link>
      {loading && <p className="vedic-detail-desc">당신의 재물 흐름을 나타내는 별자리 지도를 불러오는 중입니다.</p>}
      {errorMessage && !loading && <p className="vedic-detail-desc">{errorMessage}</p>}
      {chart && !loading && !errorMessage && <WealthSection chart={chart} />}
    </div>
  );
}
