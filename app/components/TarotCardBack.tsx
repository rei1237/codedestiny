"use client";
import { m } from "framer-motion";

export default function TarotCardBack({ selected = false, hovered = false, orderNum = 0, round = "main" as "main" | "sub" }: {
  selected?: boolean; hovered?: boolean; orderNum?: number; round?: "main" | "sub";
}) {
  const mainColor = round === "main" ? "#e879f9" : "#a78bfa";
  const bg = selected
    ? (round === "main"
      ? "linear-gradient(155deg,#3b0764,#7c3aed,#4c0080)"
      : "linear-gradient(155deg,#1e1b4b,#4338ca,#2d1b69)")
    : hovered
      ? "linear-gradient(155deg,#140830,#2d1b69,#0e0525)"
      : "linear-gradient(155deg,#0e0525,#1a0a3a,#0c0420)";
  const border = selected
    ? `2px solid ${mainColor}`
    : hovered ? "1.5px solid rgba(168,85,247,0.6)" : "1px solid rgba(168,85,247,0.18)";
  const shadow = selected
    ? `0 0 18px ${mainColor}99, 0 0 36px ${mainColor}44`
    : hovered ? "0 0 12px rgba(168,85,247,0.4)" : "none";

  return (
    <div style={{ width: "100%", height: "100%", borderRadius: 10, overflow: "hidden", position: "relative",
      background: bg, border, boxShadow: shadow, transition: "all 0.18s ease" }}>
      <div style={{ position: "absolute", inset: 3, borderRadius: 7, border: "1px dashed rgba(192,132,252,0.2)" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 3 }}>
        {selected ? (
          <>
            <m.span style={{ fontSize: 14, color: mainColor, lineHeight: 1 }}
              animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.4, repeat: Infinity }}>✦</m.span>
            <span style={{ fontSize: 13, color: "white", fontWeight: 900, lineHeight: 1 }}>{orderNum}</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 10, color: hovered ? "#e879f9" : "#7c3aed", opacity: hovered ? 0.8 : 0.35 }}>✦</span>
            <span style={{ fontSize: 5.5, color: "#a855f7", opacity: 0.25, letterSpacing: "0.3em" }}>TAROT</span>
          </>
        )}
      </div>
      {(hovered || selected) && (
        <div style={{ position: "absolute", inset: 0, borderRadius: 10,
          background: "radial-gradient(ellipse at 38% 28%, rgba(255,255,255,0.11) 0%, transparent 60%)" }} />
      )}
    </div>
  );
}
