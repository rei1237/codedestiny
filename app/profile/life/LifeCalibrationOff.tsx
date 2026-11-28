"use client";

import { useTPick } from "@/lib/i18n/useT";
import { LIFE_CALIBRATION_NS, LIFE_COPY_KO, type LifeCopyKey } from "./life-copy";
import styles from "./life.module.css";

// 플래그 OFF 화면. 어디에서도 링크하지 않는 비공개 주소라, 직접 들어온 경우에만 보인다.
export default function LifeCalibrationOff() {
  const pick = useTPick(LIFE_CALIBRATION_NS, "ko");
  const t = (k: LifeCopyKey) => pick(`${LIFE_CALIBRATION_NS}.${k}`, LIFE_COPY_KO[k]) || LIFE_COPY_KO[k];
  return (
    <main className={styles.page} data-life-calibration="off">
      <section className={styles.card}>
        <h1 className={styles.title}>{t("offTitle")}</h1>
        <p className={styles.lead}>{t("offBody")}</p>
        <a className={styles.primary} href="/ggulggul/">{t("offHome")}</a>
      </section>
    </main>
  );
}
