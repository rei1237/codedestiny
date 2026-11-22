import { loadCollection, collectionTransaction } from "./collection";
import {
  advanceScene,
  questById,
  questLock,
  restoreCampaign,
  settleBattle,
  type CampaignProgress,
} from "./campaign-data";

export { campaignQuests, isStorySupportQuest } from "./campaign-data";
export const campaignEvent = "kkulkkul-card-rpg:campaign-changed";
async function change(scope: string, apply: (p: CampaignProgress) => void) {
  const state = await collectionTransaction(scope, (c) => {
    const p = restoreCampaign(c.campaign);
    apply(p);
    c.campaign = p;
    return p;
  });
  window.dispatchEvent(new CustomEvent(campaignEvent, { detail: scope }));
  return state;
}
export function readCampaign(scope: string) {
  return collectionTransaction(scope, (c) => restoreCampaign(c.campaign));
}
export function turnCampaignPage(scope: string, node: string, choice?: string) {
  return change(scope, (p) => advanceScene(p, node, choice));
}
export async function beginCampaignQuest(scope: string, id: string) {
  const c = await loadCollection(scope);
  if (c.battle && c.battle.questId !== id)
    throw Error("달빛 전장에서 진행 중인 전투를 먼저 마쳐 주세요.");
  return change(scope, (p) => {
    const q = questById[id];
    if (!q) throw Error("열 수 없는 의뢰예요.");
    const lock = questLock(p, q);
    if (lock) throw Error(lock);
    p.pending = id;
  });
}
export async function finishCampaignBattle(
  scope: string,
  id: string,
  battleId: string,
  victory: boolean,
) {
  const record = (await loadCollection(scope)).battle;
  if (!record || record.id !== battleId || record.questId !== id)
    throw Error("저장한 전투 기록을 찾을 수 없어요.");
  if (process.env.NEXT_PUBLIC_MOCK_DEV !== "1")
    throw Error("의뢰 기록은 로컬 테스트 서버에서 확인할 수 있어요.");
  const response = await fetch("/api/card-rpg-dev/battle/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ battleId, inputs: record.inputs }),
  });
  const result = await response.json();
  if (!response.ok || !result.mock || !result.ok)
    throw Error(result.message ?? "전투 결과 확인에 실패했어요.");
  const proof = result.receipt;
  if (
    proof.battleId !== battleId ||
    proof.questId !== id ||
    proof.victory !== victory
  )
    throw Error("전투 기록이 일치하지 않아요.");
  const receipt = await collectionTransaction(scope, (c) => {
    const p = restoreCampaign(c.campaign);
    const alreadySettled = Object.hasOwn(p.receipts, battleId);
    const result = settleBattle(p, id, battleId, victory);
    if (!alreadySettled) {
      if (result.reward !== proof.reward)
        throw Error("보상 기록이 일치하지 않아요.");
      c.shards += proof.reward;
      if (result.first && id === "study.skill") {
        const moka = c.units.find(
          (unit) => unit.battleVariantId === "moka-base",
        );
        if (moka) {
          moka.skillLevel ??= [1, 1, 1];
          moka.skillLevel[0] = Math.max(2, moka.skillLevel[0]);
        }
      }
    }
    c.campaign = p;
    return result;
  });
  window.dispatchEvent(new CustomEvent(campaignEvent, { detail: scope }));
  return receipt;
}
