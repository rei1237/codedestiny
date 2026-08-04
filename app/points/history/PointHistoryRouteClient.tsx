"use client";

import dynamic from "next/dynamic";
import styles from "./PointHistoryClient.module.css";

const PointHistoryClient = dynamic(() => import("./PointHistoryClient"), {
  ssr: false,
  loading: () => <PointHistoryShell />,
});

function PointHistoryShell() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.hero} aria-hidden="true">
          <div className={`${styles.skeletonBar} ${styles.skeletonBarWide} animate-pulse`} />
          <div className={`${styles.skeletonTitle} animate-pulse`} />
        </div>
        <section className={styles.surface} aria-hidden="true">
          <div className={`${styles.skeletonBar} ${styles.skeletonBarMedium} animate-pulse`} />
          <div className={`${styles.skeletonBlock} animate-pulse`} style={{ marginTop: 20 }} />
        </section>
        <section className={styles.surface} aria-hidden="true">
          <div className={`${styles.skeletonBar} ${styles.skeletonBarMedium} animate-pulse`} />
          <div className={styles.skeletonStack}>
            <div className={`${styles.skeletonBlock} animate-pulse`} />
            <div className={`${styles.skeletonBlock} animate-pulse`} />
          </div>
        </section>
      </div>
    </main>
  );
}

export default function PointHistoryRouteClient() {
  return <PointHistoryClient />;
}
