"use client";

// /tarot/mingri/ 무료 세 장 플로우를 랜딩 안에 붙인다(5단계 ①). 플래그가 꺼지면 page.tsx 가 이 컴포넌트를 넘기지 않는다.
import dynamic from "next/dynamic";
import styles from "./mingri-tarot.module.css";

const MingriTarotGuided = dynamic(() => import("./MingriTarotGuided"), {
  ssr: false,
  loading: () => <div className={styles.reserve} aria-hidden="true" />,
});

export default function MingriTarotEntry() {
  return <MingriTarotGuided />;
}
