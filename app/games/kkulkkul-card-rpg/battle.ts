import {
  definitions,
  type Command,
  type buildBattleSnapshot,
} from "./formation";
import {
  battleKit,
  cardRules,
  encounters,
  kits,
  skillDefinitions,
  skillRank,
  type EncounterId,
} from "./battle-data";
export {
  encounters,
  skillDefinitions,
  kits,
  type EncounterId,
} from "./battle-data";

export const BATTLE_VERSION = 1;
export const TURN_LIMIT = 40;
export type Snapshot = ReturnType<typeof buildBattleSnapshot>;
type TimedEffect = { value: number; turns: number };
type BuffKey = "guard" | "arts" | "rhythm" | "burst" | "finish";
export type Fighter = NonNullable<Snapshot[number]> & {
  name: string;
  maxHp: number;
  gauge: number;
  stunned: number;
  cooldowns: number[];
  buffs: Partial<Record<BuffKey, TimedEffect>>;
  skillLevel?: number | number[];
  ultimateLevel?: number;
};
export type Enemy = {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  defense: number;
  boss: boolean;
  charge: number;
  exposed: number;
};
export type BattleCard = {
  id: string;
  actorId: string;
  type: Command;
  hits: number;
  chance: number;
  ultimate: boolean;
  gauge: number;
  stars: number;
};
export type BattleEvent = {
  kind:
    | "attack"
    | "extra"
    | "ultimate"
    | "skill"
    | "hit"
    | "down"
    | "wave"
    | "victory"
    | "defeat"
    | "swap"
    | "deal";
  actorId: string;
  targetId: string;
  amount: number;
  text: string;
  type?: Command;
  hits?: number;
  hitAmounts?: number[];
  heavy?: boolean;
  critical?: boolean;
};
export type BattleInput =
  | { kind: "turn"; ids: string[]; targetId: string }
  | { kind: "skill"; actorId: string; index: number; targetId: string }
  | { kind: "swap"; frontId: string; rearId: string };
export type Battle = {
  version: number;
  encounter: EncounterId;
  seed: number;
  rng: number;
  turn: number;
  wave: number;
  status: "playing" | "victory" | "defeat";
  allies: Fighter[];
  enemies: Enemy[];
  pile: BattleCard[];
  discard: BattleCard[];
  hand: BattleCard[];
  rebuild: boolean;
  swapped: boolean;
  nextStars: number;
  events: BattleEvent[];
  log: string[];
  inputs: BattleInput[];
};
const front = (b: Battle) =>
  b.allies
    .filter((a) => a.position < 3 && a.hp > 0)
    .sort((a, c) => a.position - c.position);
function random(b: Battle) {
  b.rng = (Math.imul(1664525, b.rng) + 1013904223) >>> 0;
  return b.rng / 4294967296;
}
function shuffle<T>(b: Battle, items: T[]) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random(b) * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
function emit(
  b: Battle,
  kind: BattleEvent["kind"],
  text: string,
  fields: Partial<Omit<BattleEvent, "kind" | "text">> = {},
) {
  b.events.push({
    kind,
    actorId: "",
    targetId: "",
    amount: 0,
    text,
    ...fields,
  });
  b.log.push(b.turn + "턴 · " + text);
}
function enemiesAt(b: Battle): Enemy[] {
  return encounters[b.encounter].waves[b.wave - 1].map((e, i) => ({
    ...e,
    id: "enemy:" + b.wave + ":" + i,
    maxHp: e.hp,
    charge: 0,
    boss: !!e.boss,
    exposed: 0,
  }));
}
function deal(b: Battle) {
  if (b.rebuild || !b.pile.length) {
    b.pile = shuffle(
      b,
      front(b).flatMap((a) =>
        a.deck.map((type, i) => ({
          id: a.combatantId + ":card:" + i,
          actorId: a.combatantId,
          type,
          hits: battleKit(a.battleVariantId, a.baseCharacterId).hits[type],
          chance: 0,
          ultimate: false,
          gauge: cardRules[type].gauge,
          stars: cardRules[type].stars,
        })),
      ),
    );
    b.discard = [];
    emit(
      b,
      "deal",
      (b.rebuild ? "전열 덱 재구성" : "덱 새 순환") +
        " · " +
        b.pile.length +
        "장",
    );
    b.rebuild = false;
  }
  b.hand = b.pile.splice(0, 5);
  if (b.nextStars > 0 && b.hand.length) {
    const order = shuffle(b, [...b.hand]);
    for (let i = 0; i < Math.min(b.nextStars, order.length * 10); i++)
      order[i % order.length].chance += 10;
  }
  b.nextStars = 0;
  b.swapped = false;
}
export function createBattle(
  snapshot: Snapshot,
  encounter: EncounterId,
  seed: number,
): Battle {
  if (!Object.hasOwn(encounters, encounter) || !Number.isInteger(seed))
    throw Error("전투 설정을 확인하세요.");
  const allies = snapshot.flatMap((a): Fighter[] =>
    a
      ? [
          {
            ...structuredClone(a),
            name:
              definitions[a.battleVariantId]?.name ??
              definitions[a.baseCharacterId + "-base"]?.name,
            maxHp: a.hp,
            gauge:
              (a.equipmentDefinitionId === "alarm"
                ? (a.effect?.amount ?? 0)
                : 0) + (a.baseCharacterId === "ln" ? 10 : 0),
            stunned: 0,
            cooldowns: [0, 0, 0],
            buffs: {},
          },
        ]
      : [],
  );
  if (
    !allies.some((a) => a.position < 3) ||
    new Set(allies.map((a) => a.combatantId)).size !== allies.length ||
    allies.some(
      (a) => a.deck.length !== 5 || !kits[a.baseCharacterId] || a.hp <= 0,
    )
  )
    throw Error("출전할 편성을 다시 확인하세요.");
  const b: Battle = {
    version: BATTLE_VERSION,
    encounter,
    seed: seed >>> 0,
    rng: seed >>> 0,
    turn: 1,
    wave: 1,
    status: "playing",
    allies,
    enemies: [],
    pile: [],
    hand: [],
    discard: [],
    nextStars: 0,
    rebuild: true,
    swapped: false,
    events: [],
    log: [],
    inputs: [],
  };
  b.enemies = enemiesAt(b);
  deal(b);
  return b;
}
export function getActions(b: Battle): BattleCard[] {
  if (b.status !== "playing") return [];
  const ready = front(b).filter((a) => a.stunned === 0);
  const cards = b.hand.filter((c) =>
    ready.some((a) => a.combatantId === c.actorId),
  );
  return [
    ...cards,
    ...ready
      .filter((a) => a.gauge >= 100)
      .map((a) => {
        const kit = battleKit(a.battleVariantId, a.baseCharacterId),
          type = kit.ultimate;
        return {
          id: a.combatantId + ":ultimate",
          actorId: a.combatantId,
          type,
          hits: kit.hits[type] + 1,
          chance: 0,
          ultimate: true,
          gauge: 0,
          stars: 0,
        };
      }),
  ];
}
export function previewChain(cards: BattleCard[]): string[] {
  if (!cards.length) return [];
  const first = {
    Quick: "첫 퀵 · 카드마다 별 +2",
    Arts: "첫 아츠 · 카드마다 게이지 +3",
    Buster: "첫 버스터 · 피해 +12%",
  }[cards[0].type];
  const labels = [first];
  if (cards.length === 3) {
    const types = new Set(cards.map((c) => c.type)).size;
    if (types === 1)
      labels.push(
        {
          Quick: "퀵 체인 · 별 +10",
          Arts: "아츠 체인 · 행동자 게이지 +12",
          Buster: "버스터 체인 · 마지막 피해 +35%",
        }[cards[0].type],
      );
    if (types === 3) labels.push("삼색 조합 · 별 +5 · 행동자 게이지 +5");
    if (cards.every((c) => c.actorId === cards[0].actorId))
      labels.push("동일 동료 · 추가 공격");
  }
  return labels;
}
function mutable(b: Battle, input: BattleInput) {
  if (b.status !== "playing" || b.version !== BATTLE_VERSION)
    throw Error("진행 중인 전투가 아니에요.");
  const next = structuredClone(b);
  next.events = [];
  next.inputs.push(structuredClone(input));
  return next;
}
function allyFor(b: Battle, id: string) {
  const a = b.allies.find((a) => a.combatantId === id);
  if (!a) throw Error("동료를 찾을 수 없어요.");
  return a;
}
function activeAlly(b: Battle, id: string) {
  const a = allyFor(b, id);
  if (a.position >= 3 || a.hp <= 0 || a.stunned > 0)
    throw Error("이 동료는 지금 행동할 수 없어요.");
  return a;
}
function targetFor(b: Battle, id: string) {
  const e = b.enemies.find((e) => e.id === id && e.hp > 0);
  if (!e) throw Error("살아 있는 적을 선택하세요.");
  return e;
}
function addGauge(a: Fighter, n: number) {
  a.gauge = Math.min(100, a.gauge + n);
}
function buff(a: Fighter, key: BuffKey, value: number, turns: number) {
  const old = a.buffs[key];
  // A stronger one-turn ward must not extend a weaker long buff.
  if (!old || old.value < value || (old.value === value && old.turns < turns))
    a.buffs[key] = { value, turns };
}
function heal(a: Fighter, amount: number) {
  a.hp = Math.min(a.maxHp, a.hp + amount);
}
export function activateSkill(
  b: Battle,
  actorId: string,
  index: number,
  targetId: string,
): Battle {
  const n = mutable(b, { kind: "skill", actorId, index, targetId }),
    a = activeAlly(n, actorId);
  const spec = skillDefinitions(
    definitions[a.battleVariantId] ? a.battleVariantId : a.baseCharacterId,
    a.skillLevel,
  )[index];
  if (!Number.isInteger(index) || !spec || a.cooldowns[index] > 0)
    throw Error("아직 사용할 수 없는 스킬이에요.");
  const team = front(n);
  let target = actorId;
  switch (spec.effect) {
    case "charge":
      team.forEach((u) => addGauge(u, spec.value));
      break;
    case "stars":
      n.nextStars += spec.value;
      break;
    case "delay":
    case "expose": {
      const e = targetFor(n, targetId);
      target = e.id;
      if (spec.effect === "delay") {
        e.charge = Math.max(0, e.charge - spec.value);
        const rank = Array.isArray(a.skillLevel)
          ? a.skillLevel[index]
          : a.skillLevel;
        addGauge(a, (skillRank(rank) - 1) * 2);
      } else e.exposed = Math.max(e.exposed, spec.value);
      break;
    }
    case "guard":
      if (a.baseCharacterId === "pje") a.hp = Math.max(1, a.hp - 60);
      team.forEach((u) => buff(u, "guard", spec.value, 1));
      break;
    case "arts":
      team.forEach((u) => buff(u, "arts", spec.value, 2));
      break;
    case "heal": {
      const weakest = team.reduce((x, y) =>
        x.hp / x.maxHp <= y.hp / y.maxHp ? x : y,
      );
      target = weakest.combatantId;
      heal(weakest, spec.value);
      break;
    }
    default:
      buff(a, spec.effect as BuffKey, spec.value, 2);
  }
  a.cooldowns[index] = spec.cooldown;
  emit(n, "skill", a.name + " · " + spec.name + " · " + spec.description, {
    actorId,
    targetId: target,
  });
  return n;
}
export function swapReserve(
  b: Battle,
  frontId: string,
  rearId: string,
): Battle {
  const n = mutable(b, { kind: "swap", frontId, rearId }),
    f = activeAlly(n, frontId),
    r = allyFor(n, rearId);
  if (n.swapped || r.hp <= 0 || r.position < 3)
    throw Error("이번 턴에 교대할 수 없어요.");
  [r.position, f.position] = [f.position, r.position];
  n.swapped = true;
  n.rebuild = true;
  emit(n, "swap", f.name + " → " + r.name + " 교대 · 다음 턴에 덱 재구성", {
    actorId: frontId,
    targetId: rearId,
  });
  return n;
}
function down(b: Battle, id: string, name: string) {
  emit(b, "down", name + " 전투불능", { targetId: id });
}
function playerStrike(
  b: Battle,
  c: BattleCard,
  e: Enemy,
  cards: BattleCard[],
  index: number,
  extra = false,
) {
  const a = allyFor(b, c.actorId);
  const first = cards[0].type,
    mono = cards.length === 3 && cards.every((k) => k.type === first);
  const critical =
    !extra && !c.ultimate && c.chance > 0 && random(b) * 100 < c.chance;
  const buffPercent =
    (c.type === "Arts" ? (a.buffs.arts?.value ?? 0) : 0) +
    (c.type === "Buster" ? (a.buffs.burst?.value ?? 0) : 0) +
    (e.hp * 2 <= e.maxHp ? (a.buffs.finish?.value ?? 0) : 0) +
    (index > 0 && cards[index - 1]?.actorId === c.actorId
      ? (a.buffs.rhythm?.value ?? 0)
      : 0);
  const power = extra
    ? 0.85
    : c.ultimate
      ? 2.6 + (skillRank(a.ultimateLevel) - 1) * 0.18
      : cardRules[c.type].power;
  const damage = Math.max(
    1,
    Math.round(
      (a.atk * power - e.defense) *
        (extra ? 1 : 1 + index * 0.1) *
        (first === "Buster" ? 1.12 : 1) *
        (1 + buffPercent / 100) *
        (1 + e.exposed / 100) *
        (critical ? (a.baseCharacterId === "neo" ? 1.6 : 1.5) : 1) *
        (mono && first === "Buster" && index === 2 && !extra ? 1.35 : 1),
    ),
  );
  const dealt = Math.min(e.hp, damage);
  e.hp -= dealt;
  if (c.ultimate && !extra) a.gauge -= 100;
  if (!extra && !c.ultimate) {
    addGauge(
      a,
      c.gauge +
        (first === "Arts" ? 3 : 0) +
        (c.type === "Arts" &&
        (a.baseCharacterId === "yun" || a.battleVariantId === "moka-stage")
          ? 2
          : 0),
    );
    b.nextStars +=
      c.stars +
      (first === "Quick" ? 2 : 0) +
      (c.type === "Quick" && a.battleVariantId === "moka-base" ? 2 : 0);
  }
  const title = extra
    ? "추가 공격"
    : c.ultimate
      ? (
          definitions[a.battleVariantId] ??
          definitions[a.baseCharacterId + "-base"]
        ).ultimate
      : c.type;
  const hits = extra ? 1 : c.hits;
  const hitAmounts = Array.from(
    { length: hits },
    (_, i) => Math.floor(dealt / hits) + Number(i < dealt % hits),
  );
  emit(
    b,
    extra ? "extra" : c.ultimate ? "ultimate" : "attack",
    a.name +
      " · " +
      title +
      " → " +
      e.name +
      " " +
      dealt +
      (critical ? " 치명타" : ""),
    {
      actorId: a.combatantId,
      targetId: e.id,
      amount: dealt,
      type: c.type,
      hits,
      hitAmounts,
      critical,
    },
  );
  if (e.hp === 0) down(b, e.id, e.name);
  if (e.boss && e.charge >= 2) {
    const reflect = Math.min(35, a.hp);
    a.hp -= reflect;
    emit(b, "hit", e.name + " 반향 → " + a.name + " " + reflect, {
      actorId: e.id,
      targetId: a.combatantId,
      amount: reflect,
    });
    if (a.hp === 0) down(b, a.combatantId, a.name);
  }
}
function enemyTurn(b: Battle) {
  for (const e of b.enemies.filter((e) => e.hp > 0)) {
    const candidates = front(b);
    if (!candidates.length) break;
    const target =
      candidates[(b.turn - 1 + b.enemies.indexOf(e)) % candidates.length];
    const heavy = e.charge >= 2;
    const ward = target.buffs.guard?.value ?? 0,
      lotus =
        target.equipmentDefinitionId === "lotus"
          ? (target.effect?.amount ?? 0)
          : 0;
    const mitigation = Math.max(
      ward,
      lotus,
      target.baseCharacterId === "pje" ? 6 : 0,
    );
    const damage = Math.min(
      target.hp,
      Math.max(
        1,
        Math.round(e.atk * (heavy ? 2.2 : 1) * (1 - mitigation / 100)),
      ),
    );
    target.hp -= damage;
    e.charge = heavy ? 0 : e.charge + 1;
    emit(
      b,
      "hit",
      e.name +
        (heavy ? " 강공격" : " 공격") +
        " → " +
        target.name +
        " " +
        damage,
      { actorId: e.id, targetId: target.combatantId, amount: damage, heavy },
    );
    if (target.hp === 0) down(b, target.combatantId, target.name);
    else if (heavy && e.boss) target.stunned = 2;
  }
}
function finish(b: Battle, victory: boolean, reason: string) {
  b.status = victory ? "victory" : "defeat";
  emit(b, b.status, reason);
}
function nextTurn(b: Battle) {
  b.discard.push(...b.hand);
  b.hand = [];
  if (!b.allies.some((a) => a.hp > 0)) {
    finish(b, false, "동료 전원 전투불능");
    return;
  }
  const cleared = b.enemies.every((e) => e.hp <= 0);
  if (cleared && b.wave === encounters[b.encounter].waves.length) {
    finish(b, true, "마지막 무리를 물리쳤어요.");
    return;
  }
  if (b.turn >= TURN_LIMIT) {
    finish(b, false, "최대 턴 도달 · 전투 종료");
    return;
  }
  for (const a of b.allies) {
    a.cooldowns = a.cooldowns.map((cd) => Math.max(0, cd - 1));
    a.stunned = Math.max(0, a.stunned - 1);
    for (const key of Object.keys(a.buffs) as BuffKey[]) {
      const effect = a.buffs[key];
      if (effect && --effect.turns <= 0) delete a.buffs[key];
    }
    if (a.hp > 0 && a.position < 3) {
      if (a.equipmentDefinitionId === "window") heal(a, a.effect?.amount ?? 0);
      if (a.baseCharacterId === "yeon") heal(a, 12);
    }
  }
  b.enemies.forEach((e) => {
    e.exposed = 0;
  });
  b.turn++;
  for (const fallen of b.allies
    .filter((a) => a.position >= 0 && a.position < 3 && a.hp === 0)
    .sort((a, c) => a.position - c.position)) {
    const retirePosition = fallen.position;
    // Fallen units keep a distinct negative slot to prevent a rebuild every turn.
    fallen.position = -1;
    b.rebuild = true;
    const replacement = b.allies
      .filter((a) => a.hp > 0 && a.position >= 3)
      .sort((a, c) => a.position - c.position)[0];
    if (replacement) {
      replacement.position = retirePosition;
      emit(b, "swap", replacement.name + " 전열 진입", {
        actorId: fallen.combatantId,
        targetId: replacement.combatantId,
      });
    }
  }
  if (cleared) {
    b.wave++;
    b.enemies = enemiesAt(b);
    emit(b, "wave", b.wave + "번째 무리 등장");
  }
  deal(b);
}
export function resolveTurn(
  b: Battle,
  ids: string[],
  targetId: string,
): Battle {
  const available = getActions(b);
  if (
    ids.length > 3 ||
    new Set(ids).size !== ids.length ||
    (!ids.length && available.length)
  )
    throw Error("서로 다른 카드를 최대 세 장 선택하세요.");
  const cards = ids.map((id) => {
    const c = available.find((c) => c.id === id);
    if (!c) throw Error("현재 손패에서 선택할 수 없는 카드예요.");
    return c;
  });
  const n = mutable(b, { kind: "turn", ids, targetId });
  targetFor(n, targetId);
  let executed = 0;
  for (const [i, c] of cards.entries()) {
    const target =
      n.enemies.find((e) => e.id === targetId && e.hp > 0) ??
      n.enemies.find((e) => e.hp > 0);
    if (!target) break;
    if (allyFor(n, c.actorId).hp <= 0) continue;
    playerStrike(n, c, target, cards, i);
    executed++;
  }
  if (executed === 3) {
    const types = new Set(cards.map((c) => c.type)).size,
      same = types === 1,
      first = cards[0];
    const started = new Set(cards.map((c) => c.actorId));
    const gauge = same && first.type === "Arts" ? 12 : types === 3 ? 5 : 0;
    started.forEach((id) => {
      const a = allyFor(n, id);
      if (a.hp > 0) addGauge(a, gauge);
    });
    n.nextStars += same && first.type === "Quick" ? 10 : types === 3 ? 5 : 0;
    const target =
      n.enemies.find((e) => e.id === targetId && e.hp > 0) ??
      n.enemies.find((e) => e.hp > 0);
    if (started.size === 1 && target && allyFor(n, first.actorId).hp > 0)
      playerStrike(n, first, target, cards, 3, true);
  }
  if (n.enemies.some((e) => e.hp > 0)) enemyTurn(n);
  nextTurn(n);
  return n;
}
export function replayBattle(
  snapshot: Snapshot,
  encounter: EncounterId,
  seed: number,
  inputs: BattleInput[],
) {
  let b = createBattle(snapshot, encounter, seed);
  for (const input of inputs) {
    switch (input.kind) {
      case "turn":
        b = resolveTurn(b, input.ids, input.targetId);
        break;
      case "skill":
        b = activateSkill(b, input.actorId, input.index, input.targetId);
        break;
      case "swap":
        b = swapReserve(b, input.frontId, input.rearId);
        break;
      default:
        throw Error("지원하지 않는 전투 입력이에요.");
    }
  }
  return b;
}
