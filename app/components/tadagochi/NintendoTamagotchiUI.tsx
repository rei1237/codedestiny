"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import SpriteCharacter from "./SpriteCharacter";
import { TamagotchiStatus, useTamagotchiAnimation } from "./useTamagotchiAnimation";

type NintendoTamagotchiUIProps = {
  imagePath: string;
  petName?: string;
};

type Stats = {
  hp: number;
  happy: number;
  hunger: number;
  energy: number;
  exp: number;
};

function clampStat(v: number) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function Gauge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#d6def0" }}>
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div style={{ height: 12, borderRadius: 999, background: "rgba(255,255,255,0.13)", overflow: "hidden", border: "1px solid rgba(255,255,255,0.18)" }}>
        <div
          style={{
            width: `${value}%`,
            height: "100%",
            borderRadius: 999,
            background: color,
            transition: "width 260ms ease",
          }}
        />
      </div>
    </div>
  );
}

export default function NintendoTamagotchiUI({
  imagePath,
  petName = "Neo Buddy",
}: NintendoTamagotchiUIProps) {
  const [phase, setPhase] = useState<"egg" | "hatched">("egg");
  const [hatch, setHatch] = useState(0);
  const [stats, setStats] = useState<Stats>({ hp: 72, happy: 66, hunger: 64, energy: 70, exp: 0 });

  const level = Math.floor(stats.exp / 50) + 1;

  const status = useMemo<TamagotchiStatus>(() => {
    if (phase === "egg") return "idle";
    if (stats.energy < 30) return "sleepy";
    if (stats.hunger < 35) return "hungry";
    if (stats.happy < 35) return "bored";
    if (stats.exp > 120 && stats.energy > 55) return "work";
    return "idle";
  }, [phase, stats]);

  const { currentFrame, triggerInteraction } = useTamagotchiAnimation({ status });

  const handleEggTap = () => {
    if (phase !== "egg") return;
    const next = Math.min(100, hatch + 10);
    setHatch(next);
    if (next >= 100) {
      setPhase("hatched");
    }
  };

  const applyAction = (type: "feed" | "play" | "sleep") => {
    if (phase !== "hatched") return;
    triggerInteraction();
    setStats((prev) => {
      if (type === "feed") {
        return {
          hp: clampStat(prev.hp + 8),
          happy: clampStat(prev.happy + 5),
          hunger: clampStat(prev.hunger + 24),
          energy: clampStat(prev.energy + 2),
          exp: prev.exp + 8,
        };
      }
      if (type === "play") {
        return {
          hp: clampStat(prev.hp + 4),
          happy: clampStat(prev.happy + 18),
          hunger: clampStat(prev.hunger - 10),
          energy: clampStat(prev.energy - 8),
          exp: prev.exp + 10,
        };
      }
      return {
        hp: clampStat(prev.hp + 10),
        happy: clampStat(prev.happy + 3),
        hunger: clampStat(prev.hunger - 5),
        energy: clampStat(prev.energy + 22),
        exp: prev.exp + 6,
      };
    });
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "radial-gradient(circle at 30% 0%, #1b2a50 0%, #0f1325 60%, #080b15 100%)",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          borderRadius: 28,
          border: "4px solid rgba(255,255,255,0.16)",
          background: "linear-gradient(180deg, #202b4a 0%, #161f38 100%)",
          boxShadow: "0 18px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.15)",
          padding: 16,
          color: "#ecf2ff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
            padding: "10px 12px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.14)",
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{petName}</div>
            <div style={{ fontSize: 12, opacity: 0.82 }}>Nintendo-style Tadagochi</div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#a3f5c8" }}>Lv. {level}</div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "1fr",
          }}
        >
          <div
            style={{
              minHeight: 300,
              borderRadius: 18,
              border: "2px solid rgba(255,255,255,0.15)",
              background: "linear-gradient(180deg, #6fb2f7 0%, #9cd2ff 58%, #7ece89 100%)",
              display: "grid",
              placeItems: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {phase === "egg" ? (
              <button
                onClick={handleEggTap}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 130, filter: "drop-shadow(0 8px 12px rgba(0,0,0,0.25))" }}>🥚</div>
                <div style={{ fontWeight: 800, color: "#1d2c4a" }}>알 터치해서 부화시키기 {hatch}%</div>
              </button>
            ) : (
              <motion.button
                onClick={() => triggerInteraction()}
                style={{ border: "none", background: "transparent", cursor: "pointer" }}
                animate={{ y: [0, -9, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <SpriteCharacter imagePath={imagePath} frameIndex={currentFrame} size={250} ariaLabel="tadagochi character" />
              </motion.button>
            )}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <Gauge label="체력" value={stats.hp} color="linear-gradient(90deg,#58d68d,#2ecc71)" />
            <Gauge label="행복도" value={stats.happy} color="linear-gradient(90deg,#f5b041,#f39c12)" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            <button
              onClick={() => applyAction("feed")}
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "linear-gradient(180deg,#2f3c62,#243252)",
                color: "#fff",
                fontWeight: 800,
                padding: "12px 6px",
                cursor: "pointer",
              }}
            >
              먹기
            </button>
            <button
              onClick={() => applyAction("play")}
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "linear-gradient(180deg,#2f3c62,#243252)",
                color: "#fff",
                fontWeight: 800,
                padding: "12px 6px",
                cursor: "pointer",
              }}
            >
              놀기
            </button>
            <button
              onClick={() => applyAction("sleep")}
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "linear-gradient(180deg,#2f3c62,#243252)",
                color: "#fff",
                fontWeight: 800,
                padding: "12px 6px",
                cursor: "pointer",
              }}
            >
              잠자기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
