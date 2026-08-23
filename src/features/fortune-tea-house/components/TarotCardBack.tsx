import type { CSSProperties } from "react";
import { fortuneTeaHouseAssets } from "../data/assets";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

type TarotCardBackProps = {
  className?: string;
  animated?: boolean;
};

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다.
    키는 문구의 결정론적 해시라 같은 문구가 자동으로 한 키로 합쳐진다(정적 셸의 마커 도구와 같은 방식). */
const KO = {
  kccv0ato: "아직 공개되지 않은 연이 타로 카드",
};

export default function TarotCardBack({ className = "", animated = false }: TarotCardBackProps) {
  const copy = useTeaHouseCopy("tarotCardBack", KO);
  return (
    <div
      className={`${styles.tarotCardBack} ${className}`}
      data-animated={animated ? "true" : "false"}
      style={
        {
          "--tarot-card-back": `url("${fortuneTeaHouseAssets.yeoni.transparent.tarotCard}")`,
        } as CSSProperties
      }
      aria-label={copy.kccv0ato}
    />
  );
}
