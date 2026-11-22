"use client";

import { useState, type CSSProperties } from "react";
import {
  Flower2,
  MoonStar,
  Music2,
  Orbit,
  Umbrella,
  Wheat,
} from "lucide-react";
import { costumeArt, definitions } from "./formation";
import { battleKit } from "./battle-data";
import { wardrobeKey } from "./battle-appearance";
import s from "./battle-actor.module.css";

export type ActorMotion =
  | "idle"
  | "enter"
  | "Quick"
  | "Arts"
  | "Buster"
  | "skill"
  | "ultimate"
  | "hit"
  | "heavy"
  | "down"
  | "victory";

type Unit = {
  baseCharacterId: string;
  battleVariantId: string;
  costumeId: string;
};
type ArtDirection = {
  icon: typeof Flower2;
  ink: string;
  light: string;
  hand: [number, number];
  stroke: number;
};

const direction: Record<string, ArtDirection> = {
  yeon: {
    icon: Flower2,
    ink: "#fd91c2",
    light: "#fff3d5",
    hand: [62, 51],
    stroke: -23,
  },
  neo: {
    icon: MoonStar,
    ink: "#b398ef",
    light: "#ffdf9b",
    hand: [67, 57],
    stroke: -36,
  },
  yun: {
    icon: Orbit,
    ink: "#8dbbfc",
    light: "#ffedbb",
    hand: [65, 39],
    stroke: -18,
  },
  pje: {
    icon: Umbrella,
    ink: "#c3a5f3",
    light: "#d9ecff",
    hand: [63, 43],
    stroke: 25,
  },
  moka: {
    icon: Music2,
    ink: "#ff986c",
    light: "#ffedac",
    hand: [65, 46],
    stroke: -12,
  },
  ln: {
    icon: Wheat,
    ink: "#f2bc7e",
    light: "#fff7c7",
    hand: [64, 55],
    stroke: -34,
  },
};

// All sheets use this order; the original Moka and Yeon sheets also contain
// purpose-drawn reaction poses. A costume can select its own sheet independently.
const pose: Record<ActorMotion, number> = {
  idle: 0,
  enter: 0,
  Quick: 1,
  Arts: 2,
  Buster: 3,
  skill: 7,
  ultimate: 3,
  hit: 4,
  heavy: 4,
  down: 5,
  victory: 6,
};

const motionNames: Record<ActorMotion, string> = {
  enter: "등장",
  idle: "대기",
  Quick: "퀵 공격",
  Arts: "아츠 공격",
  Buster: "버스터 공격",
  skill: "스킬",
  ultimate: "운명해방",
  hit: "피격",
  heavy: "강한 피격",
  down: "쓰러짐",
  victory: "승리",
};

export function battleActorSheet(unit: Unit) {
  const key =
    wardrobeKey(unit.baseCharacterId, unit.battleVariantId, unit.costumeId) ||
    unit.baseCharacterId;
  return "/images/card-rpg/battle/" + key + ".webp";
}

export function BattleCutIn({ unit, fast }: { unit: Unit; fast: boolean }) {
  const v = definitions[unit.battleVariantId];
  const art =
    unit.baseCharacterId === "yeon"
      ? "/images/novel/remaster/v2/yeoni/vine-magic.webp"
      : costumeArt(v, unit.costumeId);
  return (
    <div
      className={s.cutIn}
      data-fast={fast}
      role="img"
      aria-label={v.name + " · 운명해방 · " + v.ultimate}
    >
      <img src={art} alt="" />
      <div>
        <small>{v.name} · 운명해방</small>
        <strong>{v.ultimate}</strong>
      </div>
    </div>
  );
}

export default function BattleActor({
  unit,
  motion,
  fast,
  still,
  hits,
}: {
  unit: Unit;
  motion: ActorMotion;
  fast: boolean;
  still: boolean;
  hits?: number;
}) {
  const art = direction[unit.baseCharacterId];
  const src = battleActorSheet(unit);
  const [failed, setFailed] = useState("");
  if (!art || src === failed)
    return (
      <span role="img" aria-label="전투 원화 누락">
        전투 원화 누락
      </span>
    );
  const Icon = art.icon;
  const kit = battleKit(unit.battleVariantId, unit.baseCharacterId);
  const tile = motion === "ultimate" ? pose[kit.ultimate] : pose[motion];
  const name = definitions[unit.battleVariantId]?.name || unit.baseCharacterId;
  const style = {
    "--ink": art.ink,
    "--light": art.light,
    "--hand-x": art.hand[0] + "%",
    "--hand-y": art.hand[1] + "%",
    "--tilt": art.stroke + "deg",
    "--pose-x": -25 * (tile % 4) + "%",
    "--pose-y": -50 * Math.floor(tile / 4) + "%",
    "--beat": fast ? "270ms" : "540ms",
  } as CSSProperties;
  const attack =
    motion === "Quick" ||
    motion === "Arts" ||
    motion === "Buster" ||
    motion === "ultimate";

  const normalHits =
    motion === "Quick" || motion === "Arts" || motion === "Buster"
      ? kit.hits[motion]
      : 0;
  const impacts =
    hits ?? (motion === "ultimate" ? kit.hits[kit.ultimate] + 1 : normalHits);
  const flourish = attack || motion === "skill" || motion === "victory";
  return (
    <div
      className={s.actor}
      key={src + motion}
      style={style}
      data-motion={motion}
      data-person={unit.baseCharacterId}
      data-still={still}
      data-wardrobe={wardrobeKey(
        unit.baseCharacterId,
        unit.battleVariantId,
        unit.costumeId,
      )}
      role="img"
      aria-label={name + " · " + motionNames[motion]}
    >
      <div className={s.shadow} />
      {flourish && <div className={s.halo} />}
      <div className={s.body}>
        <div className={s.cell}>
          <img
            src={src}
            alt=""
            draggable={false}
            onError={() => setFailed(src)}
          />
        </div>
      </div>
      {flourish && (
        <div className={s.gesture}>
          {attack &&
            Array.from({ length: impacts }, (_, index) => (
              <div
                key={index}
                className={s.sweep}
                style={{
                  animationDelay:
                    ((fast ? 270 : 540) * 0.48 * index) / impacts + "ms",
                  animationDuration: (fast ? 270 : 540) * 0.55 + "ms",
                }}
              />
            ))}
          <Icon className={s.sigil} aria-hidden="true" />
          <i className={s.spark} />
          <i className={s.spark} />
        </div>
      )}
      {(motion === "hit" || motion === "heavy") && <div className={s.impact} />}
    </div>
  );
}
