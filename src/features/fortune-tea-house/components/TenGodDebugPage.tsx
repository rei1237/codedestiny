"use client";

import { tenGods } from "../data/tenGods";
import TenGodSymbolCard from "./TenGodSymbolCard";
import styles from "../styles/fortune-tea-house.module.css";

export default function TenGodDebugPage() {
  return (
    <main className={styles.tenGodDebugPage}>
      <header className={styles.tarotDebugHeader}>
        <p>운명의 찻집 십성 검증</p>
        <h1>Ten Gods Symbol Map</h1>
        <span>십성.webp atlas crop · 5열 x 2행 상징 이미지</span>
      </header>

      <section className={styles.tenGodDebugGrid} aria-label="십성별 상징 카드">
        {tenGods.map((tenGod) => (
          <TenGodSymbolCard key={tenGod.id} tenGodId={tenGod.id} selected showDescription />
        ))}
      </section>
    </main>
  );
}
