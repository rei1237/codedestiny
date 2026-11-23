import { collectionTransaction, type Collection } from "./collection";
import {
  BATTLE_VERSION,
  createBattle,
  replayBattle,
  encounters,
  type Battle,
  type EncounterId,
  type Snapshot,
  type BattleInput,
} from "./battle";
import {
  buildBattleSnapshot,
  validateFormation,
  type Formation,
} from "./formation";

export type BattleSave = {
  version: number;
  id: string;
  seed: number;
  encounter: EncounterId;
  questId: string;
  snapshot: Snapshot;
  inputs: BattleInput[];
};
export function departure(
  c: Collection,
  preset: number,
  encounter: EncounterId,
  storySupport: boolean,
  practice: boolean,
) {
  const f = c.formations[preset];
  if (!f) throw Error("저장 편성을 선택하세요.");
  const team: Formation = storySupport
    ? {
        tutorial: true,
        slots: [
          { unit: "support:yeon" },
          { unit: "support:neo" },
          null,
          null,
          null,
          null,
        ],
      }
    : practice
      ? {
          tutorial: true,
          slots: [
            { unit: c.units[0].ownedUnitId },
            { unit: "support:yeon" },
            { unit: "support:neo" },
            null,
            null,
            null,
          ],
        }
      : {
          ...f,
          tutorial:
            (encounter === "tutorial" || encounter === "rehearsal") &&
            f.tutorial,
        };
  const issues = validateFormation(c, team);
  if (issues.length) throw Error(issues.join(" "));
  return buildBattleSnapshot(c, team);
}
export async function beginBattle(
  scope: string,
  preset: number,
  encounter: EncounterId,
  questId: string,
  storySupport: boolean,
  practice: boolean,
) {
  let ticket: BattleSave | undefined;
  if (questId) {
    if (process.env.NEXT_PUBLIC_MOCK_DEV !== "1")
      throw Error("의뢰 전투는 로컬 테스트 서버에서 열 수 있어요.");
    const response = await fetch("/api/card-rpg-dev/battle/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questId }),
    });
    const json = await response.json();
    if (!response.ok || !json.ok || !json.mock)
      throw Error(json.message ?? "개발 전투 서버에 연결할 수 없어요.");
    ticket = json.ticket;
  }
  return collectionTransaction(scope, (c) => {
    if (c.battle) throw Error("진행 중인 전투가 있어요. 전장으로 돌아가세요.");
    const snapshot =
      ticket?.snapshot ??
      departure(c, preset, encounter, storySupport, practice);
    const seed = ticket?.seed ?? crypto.getRandomValues(new Uint32Array(1))[0];
    const b = createBattle(snapshot, ticket?.encounter ?? encounter, seed);
    const save: BattleSave = ticket ?? {
      version: BATTLE_VERSION,
      id: crypto.randomUUID(),
      seed,
      encounter,
      questId,
      snapshot,
      inputs: b.inputs,
    };
    c.battle = save;
    return { save, b };
  });
}
export function restoreBattle(save: BattleSave) {
  if (save.version !== BATTLE_VERSION)
    throw Error(
      "전투 규칙이 바뀌었어요. 이전 연습을 종료하고 다시 출전하세요.",
    );
  return replayBattle(save.snapshot, save.encounter, save.seed, save.inputs);
}
export function checkpoint(
  scope: string,
  id: string,
  revision: number,
  b: Battle,
) {
  return collectionTransaction(scope, (c) => {
    if (c.battle?.id !== id || c.battle.inputs.length !== revision)
      throw Error("다른 창에서 진행 상황이 바뀌었어요. 다시 불러오세요.");
    c.battle.inputs = b.inputs;
    return c.battle;
  });
}
export function closeBattle(scope: string, id: string) {
  return collectionTransaction(scope, (c) => {
    if (!c.battle || c.battle.id !== id) return;
    if (c.battle.version === BATTLE_VERSION) {
      const b = restoreBattle(c.battle);
      if (!c.battle.questId && b.status !== "playing")
        c.battleHistory = [
          {
            id,
            name: encounters[b.encounter].name,
            turns: b.turn,
            won: b.status === "victory",
          },
          ...(c.battleHistory ?? []),
        ].slice(0, 60);
    }
    delete c.battle;
  });
}
