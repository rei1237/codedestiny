import { banners, draw, type BannerId } from "./summon-preview";
import {
  definitions,
  equipment,
  validateFormation,
  type Inventory,
  type Formation,
  type GearId,
} from "./formation";

type Receipt = {
  banner: BannerId;
  count: number;
  cards: (ReturnType<typeof draw>[number] & { ownedId: string })[];
};
export type Collection = Inventory & {
  formations: Formation[];
  revisions: number[];
  receipts: Record<string, Receipt>;
  shards: number;
};
function seed(): Collection {
  return {
    units: [
      {
        ownedUnitId: "unit:initial-moka",
        battleVariantId: "moka-base",
        level: 1,
        xp: 0,
        costumeId: "default",
        acquired: 0,
      },
    ],
    items: [
      {
        ownedEquipmentId: "gear:initial-alarm",
        equipmentDefinitionId: "alarm",
      },
    ],
    formations: Array.from({ length: 2 }, () => ({
      tutorial: true,
      slots: Array(6).fill(null),
    })),
    revisions: [0, 0],
    receipts: {},
    shards: 0,
  };
}
// A single read-write transaction serializes grants and edits across browser tabs.
async function transaction<T>(
  scope: string,
  change: (c: Collection) => T,
): Promise<T> {
  if (process.env.NODE_ENV !== "development" || !scope)
    throw Error("개발 계정 확인이 필요해요.");
  const db = await new Promise<IDBDatabase>((ok, fail) => {
    const request = indexedDB.open("kkulkkul-card-rpg.dev-collection", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("accounts");
    request.onsuccess = () => ok(request.result);
    request.onerror = () => fail(request.error);
  });
  try {
    return await new Promise<T>((ok, fail) => {
      const tx = db.transaction("accounts", "readwrite"),
        store = tx.objectStore("accounts"),
        read = store.get(scope);
      let result: T, reason: unknown;
      read.onsuccess = () => {
        try {
          const c: Collection = read.result ?? seed();
          result = change(c);
          store.put(c, scope);
        } catch (e) {
          reason = e;
          tx.abort();
        }
      };
      tx.oncomplete = () => ok(result);
      tx.onabort = () =>
        fail(reason ?? tx.error ?? Error("저장에 실패했어요."));
    });
  } finally {
    db.close();
  }
}
export const loadCollection = (scope: string) => transaction(scope, (c) => c);
export function applySummon(
  scope: string,
  run: string,
  id: BannerId,
  n: 1 | 10,
) {
  return transaction(scope, (c) => {
    if (!run) throw Error("소환 실행 정보를 확인하세요.");
    const prior = c.receipts[run];
    if (prior) {
      if (prior.banner !== id || prior.count !== n)
        throw Error("소환 요청이 일치하지 않아요.");
      return prior.cards;
    }
    const cards = draw(id, n).map((r) => {
      let ownedId: string, duplicate: boolean;
      if (id !== "relic") {
        const variantId = r.entry.id;
        if (!definitions[variantId]) throw Error("전투 버전을 찾을 수 없어요.");
        const existing = c.units.find((u) => u.battleVariantId === variantId);
        duplicate = !!existing;
        ownedId = existing?.ownedUnitId ?? crypto.randomUUID();
        if (!existing)
          c.units.push({
            ownedUnitId: ownedId,
            battleVariantId: variantId,
            level: 1,
            xp: 0,
            acquired: Date.now(),
            costumeId: "default",
          });
      } else {
        const gearId = r.entry.id as GearId;
        if (!equipment[gearId]) throw Error("예장을 찾을 수 없어요.");
        const existing = c.items.find(
          (e) => e.equipmentDefinitionId === gearId,
        );
        duplicate = !!existing;
        ownedId = existing?.ownedEquipmentId ?? crypto.randomUUID();
        if (!existing)
          c.items.push({
            ownedEquipmentId: ownedId,
            equipmentDefinitionId: gearId,
          });
      }
      if (duplicate) c.shards += banners[id].shards;
      return { ...r, ownedId, duplicate };
    });
    c.receipts[run] = { banner: id, count: n, cards };
    return cards;
  });
}
export function saveFormation(
  scope: string,
  index: number,
  revision: number,
  f: Formation,
) {
  return transaction(scope, (c) => {
    if (c.revisions[index] !== revision)
      throw Error("다른 화면에서 편성이 변경됐어요. 다시 불러오세요.");
    const errors = validateFormation(c, f, false);
    if (errors.length) throw Error(errors.join(" "));
    c.formations[index] = f;
    c.revisions[index]++;
    return c;
  });
}
export function setCostume(scope: string, unitId: string, costumeId: string) {
  return transaction(scope, (c) => {
    const u = c.units.find((u) => u.ownedUnitId === unitId);
    if (
      !u ||
      !(
        costumeId === "default" ||
        (definitions[u.battleVariantId]?.baseCharacterId === "moka" &&
          costumeId === "moka-apron")
      )
    )
      throw Error("선택할 수 없는 의상이에요.");
    u.costumeId = costumeId;
    return c;
  });
}
