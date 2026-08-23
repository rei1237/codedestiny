"use client";

import { tenGods } from "../data/tenGods";
import TenGodSymbolCard from "./TenGodSymbolCard";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다.
    키는 문구의 결정론적 해시라 같은 문구가 자동으로 한 키로 합쳐진다(정적 셸의 마커 도구와 같은 방식). */
// 자산 파일명은 경로이지 문구가 아니다.
const TEN_GOD_ATLAS_FILE = "십성.webp";

const KO = {
  k4cd8sdg: "운명의 찻집 십성 검증",
  atlasMeta: "{file} atlas crop · 5열 x 2행 상징 이미지",
  kz5lymhe: "십성별 상징 카드",
};

export default function TenGodDebugPage() {
  const copy = useTeaHouseCopy("tenGodDebugPage", KO);
  return (
    <main className={styles.tenGodDebugPage}>
      <header className={styles.tarotDebugHeader}>
        <p>{copy.k4cd8sdg}</p>
        <h1>Ten Gods Symbol Map</h1>
        <span>{copy.atlasMeta.replace("{file}", TEN_GOD_ATLAS_FILE)}</span>
      </header>

      <section className={styles.tenGodDebugGrid} aria-label={copy.kz5lymhe}>
        {tenGods.map((tenGod) => (
          <TenGodSymbolCard key={tenGod.id} tenGodId={tenGod.id} selected showDescription />
        ))}
      </section>
    </main>
  );
}
