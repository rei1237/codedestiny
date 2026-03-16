"use client";

import Link from "next/link";
import { useVedicChart } from "../useVedicChart";
import KundliWheelChart from "../KundliWheelChart";

export default function VedicChartPage() {
  const { chart, loading, errorMessage, ascendantSign, moon } = useVedicChart();

  return (
    <div className="vedic-detail-wrap">
      <Link href="/vedic" className="vedic-detail-back">
        ← 은하로 돌아가기
      </Link>
      <h1 className="vedic-detail-title">베다점 차트</h1>
      <p className="vedic-detail-desc">
        출생 순간의 하늘을 12개의 하우스와 행성의 배치로 정리한 기본 베다 차트입니다. 아래 차트는
        북인도식 휠 구조를 참고해, 하우스와 별자리의 흐름을 한눈에 볼 수 있도록 재구성했습니다.
      </p>

      {loading && <p className="vedic-detail-desc">우주의 설계도를 불러오는 중입니다. 잠시만 기다려 주세요.</p>}
      {errorMessage && !loading && <p className="vedic-detail-desc">{errorMessage}</p>}

      {chart && !loading && !errorMessage && (
        <>
          <KundliWheelChart chart={chart} />

          <section style={{ marginTop: 20 }}>
            <h2 className="vedic-detail-title" style={{ fontSize: "1.25rem", marginBottom: 8 }}>
              핵심 포인트 요약
            </h2>
            <p className="vedic-detail-desc">
              현재 차트에서{" "}
              <strong style={{ color: "#e5e7eb" }}>
                라그나(상승궁)는 {ascendantSign || "알 수 없음"}, 달은 {moon?.sign || "알 수 없음"}
              </strong>
              에 놓여 있습니다. 라그나는 “세상이 나를 바라보는 창”, 달은 “내 안쪽에서 세상을 느끼는 마음”에
              해당하기 때문에, 이 두 축이 당신의 기질과 삶의 방향을 함께 만들고 있다고 보시면 됩니다.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

