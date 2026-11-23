import { collectionTransaction, type Collection } from "./collection";
import {
  availableCostumes,
  costumes,
  definitions,
  gearStats,
  unitStats,
  type Gear,
  type Unit,
} from "./formation";
import { skillDefinitions } from "./battle-data";

export const unitCap = (u: Unit) => (u.awakened ? 10 : 5);
export const gearCap = (g: Gear) => 3 + (g.breaks ?? 0) * 2;
export type GrowthAction =
  | "level"
  | "skill"
  | "ultimate"
  | "awaken"
  | "costume"
  | "variant"
  | "gear-level"
  | "gear-break";
export const growthLabels: Record<GrowthAction, string> = {
  level: "동료 훈련",
  skill: "스킬 수련",
  ultimate: "운명해방 수련",
  awaken: "각성",
  costume: "의상 제작",
  variant: "전투 버전 영입",
  "gear-level": "예장 강화",
  "gear-break": "예장 한계 돌파",
};
export type GrowthInput = {
  kind: GrowthAction;
  ownedId: string;
  index?: number;
  costumeId?: string;
  materialId?: string;
};
export type GrowthQuote = {
  cost: number;
  before: string;
  after: string;
  lock: string;
  revision: string;
};
export function protectedGear(c: Collection, item: Gear) {
  return !!(
    item.locked ||
    item.favorite ||
    c.formations.some((f) =>
      f.slots.some((s) => s?.gear === item.ownedEquipmentId),
    )
  );
}
export function materialChoices(c: Collection, id: string) {
  return c.items.filter(
    (item) => item.ownedEquipmentId !== id && !protectedGear(c, item),
  );
}
const statsText = (s: { hp: number; atk: number }) =>
  "HP " + s.hp + " · 공격 " + s.atk;
export function quoteGrowth(c: Collection, r: GrowthInput): GrowthQuote {
  let cost = 0,
    before = "",
    after = "",
    lock = "",
    revision = "";
  const gate = (id: string) => !!c.campaign?.completed?.[id];
  const invalid = (reason: string) => {
    lock = reason;
  };
  if (!Object.hasOwn(growthLabels, r.kind))
    throw Error("강화 항목을 확인하세요.");
  if (r.kind === "gear-level" || r.kind === "gear-break") {
    const g = c.items.find((g) => g.ownedEquipmentId === r.ownedId);
    if (!g) throw Error("보유한 예장을 선택하세요.");
    const level = g.level ?? 1,
      rank = g.breaks ?? 0,
      next = { ...g };
    if (r.kind === "gear-level") {
      cost = 2 + level;
      next.level = level + 1;
      if (level >= gearCap(g))
        invalid("현재 레벨 상한이에요. 예장 한계 돌파를 확인하세요.");
    } else {
      cost = r.materialId ? 4 : 9;
      next.breaks = rank + 1;
      if (rank >= 2) invalid("한계 돌파를 모두 마쳤어요.");
      else if (level < gearCap(g))
        invalid("현재 예장 레벨 상한에 도달하면 열려요.");
      else if (!gate("study.gear"))
        invalid("‘자명종이 울릴 때’ 의뢰를 완료하면 열려요.");
      else if (
        r.materialId &&
        !materialChoices(c, r.ownedId).some(
          (m) => m.ownedEquipmentId === r.materialId,
        )
      )
        invalid("선택한 재료의 보유·장착·보호 상태를 확인하세요.");
    }
    const text = (x: Gear) => {
      const s = gearStats(x);
      return (
        "Lv." +
        (x.level ?? 1) +
        "/" +
        gearCap(x) +
        " · " +
        statsText(s) +
        " · " +
        s.effect.name +
        " " +
        s.effect.amount +
        s.effect.unit
      );
    };
    before = text(g);
    after = text(next);
    revision = [level, rank].join("/");
  } else {
    const u = c.units.find((u) => u.ownedUnitId === r.ownedId);
    if (!u) throw Error("보유한 동료를 선택하세요.");
    const v = definitions[u.battleVariantId],
      skills = u.skillLevel ?? [1, 1, 1];
    switch (r.kind) {
      case "level":
        cost = 2 + u.level;
        before = "Lv." + u.level + " · " + statsText(unitStats(v, u.level));
        after =
          "Lv." +
          (u.level + 1) +
          " · " +
          statsText(unitStats(v, u.level + 1)) +
          " · 캐릭터 XP +100";
        if (u.level >= unitCap(u))
          invalid(
            u.awakened ? "최고 레벨이에요." : "각성하면 레벨 상한이 열려요.",
          );
        break;
      case "awaken":
        cost = 10;
        before = "레벨 상한 " + unitCap(u);
        after = "레벨 상한 10";
        if (u.awakened) invalid("각성을 마쳤어요.");
        else if (u.level < 5) invalid("동료 레벨 5에서 열려요.");
        break;
      case "skill": {
        const i = r.index ?? -1;
        if (!Number.isInteger(i) || i < 0 || i > 2)
          throw Error("수련할 스킬을 선택하세요.");
        const lv = skills[i],
          next = skills.map((n, j) => (i === j ? n + 1 : n));
        const text = (ranks: number[]) => {
          const s = skillDefinitions(v.battleVariantId, ranks)[i];
          return (
            "Lv." +
            ranks[i] +
            " · " +
            s.description +
            " · 재사용 " +
            s.cooldown +
            "턴"
          );
        };
        before = text(skills);
        after = text(next);
        cost = 3 + lv;
        if (lv >= 5) invalid("최고 스킬 레벨이에요.");
        break;
      }
      case "ultimate": {
        const lv = u.ultimateLevel ?? 1;
        cost = 5 + lv;
        before =
          "Lv." + lv + " · 피해 계수 " + (2.6 + 0.18 * (lv - 1)).toFixed(2);
        after =
          "Lv." + (lv + 1) + " · 피해 계수 " + (2.6 + 0.18 * lv).toFixed(2);
        if (lv >= 5) invalid("최고 운명해방 레벨이에요.");
        break;
      }
      case "costume": {
        const id = r.costumeId ?? "",
          outfit = costumes[id];
        if (!outfit || outfit.variantId !== u.battleVariantId)
          throw Error("이 버전에서 제작할 수 없는 의상이에요.");
        cost = 6;
        before = "미제작";
        after = outfit.name + " · 동료 상세에서 교체";
        if (availableCostumes(u).includes(id))
          invalid("이미 사용 가능한 의상이에요.");
        break;
      }
      case "variant":
        cost = 12;
        before = "기본 모카 보유";
        after = "정오의 앙코르 · 별도 소유 카드 Lv.1";
        if (u.battleVariantId !== "moka-base")
          invalid("기본 모카 카드로 영입할 수 있어요.");
        else if (c.units.some((x) => x.battleVariantId === "moka-stage"))
          invalid("이미 무대 모카를 영입했어요.");
        break;
    }
    revision = JSON.stringify([
      u.level,
      u.awakened ?? false,
      skills,
      u.ultimateLevel ?? 1,
      u.unlockedCostumes ?? [],
    ]);
    if (
      !gate("study.skill") &&
      ["skill", "ultimate", "variant"].includes(r.kind)
    )
      invalid("스킬 수련 의뢰를 완료하면 열려요.");
  }
  if (!gate("study.growth"))
    invalid("제1장 후 ‘연잎의 첫 수업’을 마치면 열려요.");
  if (!lock && c.shards < cost)
    invalid("훈련 조각 " + (cost - c.shards) + "개가 더 필요해요.");
  return { cost, before, after, lock, revision };
}
// Called inside one IDB transaction. The key also binds the original preview to its target.
export function applyGrowth(
  c: Collection,
  key: string,
  r: GrowthInput,
  expected: string,
) {
  if (!key || key === "__proto__") throw Error("강화 요청을 확인하세요.");
  const signature = JSON.stringify([
    r.kind,
    r.ownedId,
    r.index ?? null,
    r.costumeId ?? null,
    r.materialId ?? null,
    expected,
  ]);
  const prior = c.growthRequests?.[key];
  if (prior) {
    if (prior !== signature) throw Error("재시도할 강화 내용이 달라요.");
    return c;
  }
  const q = quoteGrowth(c, r);
  if (q.lock) throw Error(q.lock);
  if (q.revision !== expected)
    throw Error("다른 화면에서 성장 상태가 바뀌었어요. 다시 불러오세요.");
  const u = c.units.find((x) => x.ownedUnitId === r.ownedId),
    g = c.items.find((x) => x.ownedEquipmentId === r.ownedId);
  switch (r.kind) {
    case "level":
      u!.level++;
      u!.xp += 100;
      break;
    case "awaken":
      u!.awakened = true;
      break;
    case "skill":
      u!.skillLevel = [...(u!.skillLevel ?? [1, 1, 1])];
      u!.skillLevel[r.index!]++;
      break;
    case "ultimate":
      u!.ultimateLevel = (u!.ultimateLevel ?? 1) + 1;
      break;
    case "costume":
      u!.unlockedCostumes = [...(u!.unlockedCostumes ?? []), r.costumeId!];
      break;
    case "variant":
      c.units.push({
        ownedUnitId: crypto.randomUUID(),
        battleVariantId: "moka-stage",
        level: 1,
        xp: 0,
        costumeId: "default",
        acquired: Date.now(),
      });
      break;
    case "gear-level":
      g!.level = (g!.level ?? 1) + 1;
      break;
    case "gear-break":
      g!.breaks = (g!.breaks ?? 0) + 1;
      if (r.materialId)
        c.items = c.items.filter((i) => i.ownedEquipmentId !== r.materialId);
      break;
  }
  c.shards -= q.cost;
  (c.growthRequests ??= {})[key] = signature;
  return c;
}
export function commitGrowth(
  scope: string,
  key: string,
  r: GrowthInput,
  expected: string,
) {
  return collectionTransaction(scope, (c) => applyGrowth(c, key, r, expected));
}
export function protectGear(
  scope: string,
  id: string,
  field: "locked" | "favorite",
  value: boolean,
) {
  return collectionTransaction(scope, (c) => {
    const item = c.items.find((g) => g.ownedEquipmentId === id);
    if (!item) throw Error("보유한 예장을 선택하세요.");
    item[field] = value;
    return c;
  });
}
