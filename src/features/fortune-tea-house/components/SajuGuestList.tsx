"use client";

import type { SajuGuest } from "@/lib/fortune-tea-house/saju-guests";
import type { TenGodId } from "../data/tenGods";
import { tenGodMetaMap } from "@/lib/fortune-tea-house/ten-gods.mjs";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";
import styles from "./SajuGuestList.module.css";

const SKIP = ["id", "colorTone"];
const KO = {
  title: "기질이 드러나는 자리와 시기", more: "자리와 근거 펼치기",
  scopes: { natal: "타고난 기질", daewoon: "대운에서 살피는 흐름", sewoon: "해마다 달라지는 흐름" },
  grades: { yong: "균형의 중심 · 용신", hee: "균형을 돕는 힘 · 희신", gi: "조절이 필요한 힘 · 기신", gu: "함께 살필 힘 · 구신", han: "상황에 따라 살필 힘 · 한신", unavailable: "균형 판정 정보 없음" },
  positions: { year: "연주", month: "월주", day: "일주", hour: "시주" },
  stem: "천간", hidden: "지장간", current: "현재 대운",
  nature: { auspicious: "전통 성정: 길신", challenging: "전통 성정: 흉신", neutral: "전통 성정: 중립" },
  unavailable: "판정 정보가 없어 성정과 자리만 살펴봐요.",
  helpful: "전통 성정이 흉신이어도, 이 명식에서는 균형을 돕는 역할로 판정됐어요.",
  caution: "나쁜 사람이나 정해진 운명이 아니에요. 상담의 대응책과 함께 살펴봐요.",
};

export default function SajuGuestList({ guests }: { guests?: SajuGuest[] }) {
  const copy = useTeaHouseCopy("guests", KO);
  const gods = useTeaHouseCopy("tenGods", tenGodMetaMap, { skipKeys: SKIP });
  if (!guests?.length) return null;
  return <section className={styles.guestList} data-tea-pdf-section>
    <h4>{copy.title}</h4>
    {(["natal", "daewoon", "sewoon"] as const).map(scope => {
      const rows = guests.filter(guest => guest.scope === scope);
      if (!rows.length) return null;
      return <details key={scope} open={scope === "natal"}>
        <summary>{copy.scopes[scope]} · {rows.length} — {copy.more}</summary>
        <ul>{rows.map(guest => {
          const meta = gods[guest.tenGodId as TenGodId];
          if (!meta) return null;
          const position = guest.position.split(":")[0] as keyof typeof copy.positions;
          return <li key={guest.id}>
            <div className={styles.guestHeading}><strong>{meta.nameKo}</strong><span data-grade={guest.grade}>{copy.grades[guest.grade]}</span></div>
            <p>{scope === "natal" ? `${copy.positions[position] || ""} · ${guest.position.includes(":hidden:") ? copy.hidden : copy.stem}` : scope === "daewoon" ? `${guest.evidence.startYear ?? ""}–${guest.evidence.endYear ?? ""}${guest.evidence.isCurrent ? ` · ${copy.current}` : ""}` : guest.evidence.year} · {guest.evidence.branch || ""}{guest.evidence.stem}</p>
            <p>{copy.nature[guest.traditional]}</p>
            {guest.grade === "unavailable" ? <p>{copy.unavailable}</p> : guest.traditional === "challenging" && (guest.grade === "yong" || guest.grade === "hee") ? <p>{copy.helpful}</p> : guest.grade === "gi" || guest.grade === "gu" ? <p>{copy.caution}</p> : null}
          </li>;
        })}</ul>
      </details>;
    })}
  </section>;
}
