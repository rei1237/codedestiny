import { companions } from "./catalog";

export type Command = "Quick" | "Arts" | "Buster";
type Row = [
  string,
  number,
  string,
  number,
  number,
  string,
  string[],
  string,
  string,
  string,
];
const rows: Row[] = [
  [
    "yeon",
    4,
    "회복",
    1120,
    180,
    "QAAAB",
    ["찻잔의 숨", "연잎 그늘", "따뜻한 한 모금"],
    "연꽃의 온기",
    "봄을 여는 편지",
    "프롤로그 · 방의 알람",
  ],
  [
    "neo",
    4,
    "전략",
    980,
    220,
    "QQAAB",
    ["판세 읽기", "허점 포착", "반격 작전"],
    "고양이의 직감",
    "별빛 작전도",
    "EP.01 · 강의실",
  ],
  [
    "yun",
    4,
    "지원",
    950,
    200,
    "QAAAB",
    ["붓끝의 선", "여덟 칸", "균형 잡기"],
    "명식 읽기",
    "여덟 칸의 별자리",
    "EP.13 · 궁합 상담",
  ],
  [
    "pje",
    4,
    "방어",
    1280,
    170,
    "QAABB",
    ["우산 펼치기", "빗방울", "물결 막기"],
    "비의 흔적",
    "우산 아래의 약속",
    "EP.28 · 검은 우산",
  ],
  [
    "moka",
    3,
    "공격",
    1000,
    240,
    "QQABB",
    ["국자 박자", "불씨 올리기", "후렴 시작"],
    "주방의 리듬",
    "정오의 앙코르",
    "EP.07 · 포장마차",
  ],
  [
    "ln",
    3,
    "기동",
    900,
    190,
    "QQQAB",
    ["배달 출발", "바구니 지키기", "가벼운 발걸음"],
    "언덕길",
    "갓 구운 응원",
    "EP.13 · 빵 배달",
  ],
];
export const variants = rows.map(
  ([
    baseCharacterId,
    stars,
    role,
    hp,
    atk,
    cards,
    skills,
    passive,
    ultimate,
    bond,
  ]) => {
    const cast = companions.find((c) => c.speaker === baseCharacterId)!;
    const names: Record<string, Command> = {
      Q: "Quick",
      A: "Arts",
      B: "Buster",
    };
    return {
      baseCharacterId,
      battleVariantId: baseCharacterId + "-base",
      name: cast.name,
      stars,
      role,
      hp,
      atk,
      deck: [...cards].map((c) => names[c]),
      skills,
      passive,
      ultimate,
      bond,
      art:
        baseCharacterId === "pje"
          ? "/images/novel/remaster/pje/smile.webp"
          : cast.image,
      sheet: cast.sheet,
    };
  },
);
export type Variant = (typeof variants)[number];
export const definitions: Record<string, Variant> = Object.fromEntries(
  variants.map((v) => [v.battleVariantId, v]),
);
export const costumes: Record<
  string,
  { image: string; voice: string; motion: string }
> = {
  "moka-apron": {
    image: "/images/card-rpg/moka-festival.webp",
    voice: "default",
    motion: "cook",
  },
};
export function costumeArt(v: Variant, costumeId: string) {
  if (v.baseCharacterId === "moka")
    return (
      costumes[costumeId]?.image ??
      "/images/novel/remaster/v2/moka/neutral.webp"
    );
  return v.art;
}
export const equipment = {
  lotus: {
    name: "연꽃의 문장",
    hp: 180,
    atk: 0,
    effect: {
      name: "피격 피해 감소",
      trigger: "피격 전",
      amount: 5,
      unit: "%",
      stack: "최댓값",
      cap: 5,
    },
  },
  alarm: {
    name: "세 번째 알람",
    hp: 0,
    atk: 30,
    effect: {
      name: "운명 게이지 증가",
      trigger: "전투 시작",
      amount: 8,
      unit: "점",
      stack: "1회",
      cap: 8,
    },
  },
  window: {
    name: "창가의 아침",
    hp: 120,
    atk: 10,
    effect: {
      name: "체력 회복",
      trigger: "턴 종료",
      amount: 40,
      unit: "HP",
      stack: "턴당 1회",
      cap: 40,
    },
  },
};
export type GearId = keyof typeof equipment;
export type Unit = {
  ownedUnitId: string;
  battleVariantId: string;
  level: number;
  xp: number;
  costumeId: string;
  acquired: number;
};
export type Gear = { ownedEquipmentId: string; equipmentDefinitionId: GearId };
export type Slot = { unit: string; gear?: string } | null;
export type Formation = { tutorial: boolean; slots: Slot[] };
export type Inventory = { units: Unit[]; items: Gear[] };
export const supports: Record<string, string> = {
  "support:yeon": "yeon-base",
  "support:neo": "neo-base",
};
export function resolveSlot(
  inv: Inventory,
  slot: NonNullable<Slot>,
  defs = definitions,
) {
  const owned = inv.units.find((u) => u.ownedUnitId === slot.unit);
  const variant = defs[owned?.battleVariantId ?? supports[slot.unit]];
  const item = inv.items.find((e) => e.ownedEquipmentId === slot.gear);
  return { owned, variant, item };
}
export function validateFormation(
  inv: Inventory,
  f: Formation,
  forBattle = true,
  defs = definitions,
) {
  const issues: string[] = [],
    units = new Set<string>(),
    items = new Set<string>();
  if (f.slots.length !== 6) issues.push("전열 3칸과 후열 3칸이 필요해요.");
  f.slots.forEach((slot, i) => {
    const label = (i < 3 ? "전열 " : "후열 ") + ((i % 3) + 1);
    if (!slot) {
      if (forBattle && !f.tutorial && i < 3)
        issues.push(label + "에 동료를 배치하세요.");
      return;
    }
    const { owned, variant, item } = resolveSlot(inv, slot, defs);
    if (!variant || (!owned && !(f.tutorial && supports[slot.unit])))
      issues.push(label + "의 출전 자격을 확인하세요.");
    if (units.has(slot.unit))
      issues.push(label + "의 동료가 이미 편성되어 있어요.");
    units.add(slot.unit);
    if (slot.gear && (!item || items.has(slot.gear) || !owned))
      issues.push(label + "의 예장 장착을 확인하세요.");
    if (slot.gear) items.add(slot.gear);
  });
  if (forBattle && f.tutorial && !f.slots.slice(0, 3).some(Boolean))
    issues.push("전열에 동료 또는 임시 지원 한 명을 배치하세요.");
  return issues;
}
export function buildBattleSnapshot(
  inv: Inventory,
  f: Formation,
  defs = definitions,
) {
  const issues = validateFormation(inv, f, true, defs);
  if (issues.length) throw Error(issues.join(" "));
  return f.slots.map((slot, i) => {
    if (!slot) return null;
    const { owned, variant: v, item } = resolveSlot(inv, slot, defs),
      e = item && equipment[item.equipmentDefinitionId];
    return {
      combatantId: slot.unit,
      position: i,
      baseCharacterId: v.baseCharacterId,
      battleVariantId: v.battleVariantId,
      level: owned?.level ?? 1,
      costumeId: owned?.costumeId ?? "default",
      ownedEquipmentId: item?.ownedEquipmentId ?? null,
      equipmentDefinitionId: item?.equipmentDefinitionId ?? null,
      hp: v.hp + (e?.hp ?? 0),
      atk: v.atk + (e?.atk ?? 0),
      effect: e?.effect ?? null,
      deck: [...v.deck],
      temporary: !owned,
    };
  });
}
export function moveSlot(f: Formation, from: number, to: number): Formation {
  const slots = [...f.slots];
  [slots[from], slots[to]] = [slots[to], slots[from]];
  return { ...f, slots };
}
