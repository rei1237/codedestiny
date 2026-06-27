"use client";

import type { CSSProperties } from "react";
import styles from "../styles/fortune-tea-house.module.css";

const petals = [
  { left: "8%", delay: "0s", duration: "16s", scale: 0.78 },
  { left: "18%", delay: "2.2s", duration: "19s", scale: 0.94 },
  { left: "31%", delay: "5.1s", duration: "17s", scale: 0.72 },
  { left: "46%", delay: "1.4s", duration: "21s", scale: 1 },
  { left: "62%", delay: "3.7s", duration: "18s", scale: 0.82 },
  { left: "74%", delay: "6.3s", duration: "20s", scale: 0.9 },
  { left: "88%", delay: "4.5s", duration: "17s", scale: 0.76 },
];

export default function FloatingPetals() {
  return (
    <div className={styles.petalsLayer} aria-hidden>
      {petals.map((petal, index) => (
        <span
          key={`${petal.left}-${index}`}
          className={styles.petal}
          style={
            {
              left: petal.left,
              animationDelay: petal.delay,
              animationDuration: petal.duration,
              "--petal-scale": petal.scale,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
