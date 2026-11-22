import { useEffect, useRef, useState } from "react";
import { banners, type BannerId } from "./summon-preview";
import { collectionTransaction, type Collection } from "./collection";
import type { GearId } from "./formation";

type Pick = {
  id: string;
  ownedId: string;
  duplicate: boolean;
  guaranteed: boolean;
  pity: number;
  shards: number;
};
export type WalletReceipt = {
  key: string;
  id: BannerId;
  count: 1 | 10;
  cards: Pick[];
  cost: number;
  balance: number;
  guarantee?: number;
  createdAt: number;
};
type Offer = {
  id: BannerId;
  cost: number;
  version: string;
  poolVersion: string;
  priceVersion: string;
  guarantee: number;
  entries: { id: string; weight: number }[];
};
type Catalog = {
  offers: Record<BannerId, Offer>;
  balance: number;
  pity: Partial<Record<BannerId, number>>;
  history: WalletReceipt[];
  accountId: string;
};
type Request = {
  id: BannerId;
  count: 1 | 10;
  version: string;
  poolVersion: string;
  priceVersion: string;
  expectedCost: number;
  expectedBalance: number;
  key: string;
};
type Cards = Collection["receipts"][string]["cards"];
type Props = {
  scope: string;
  id: BannerId;
  reveal: (receipt: WalletReceipt, cards: Cards) => void;
};
function allowed() {
  return (
    typeof location !== "undefined" &&
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_MOCK_DEV === "1" &&
    ["127.0.0.1", "localhost", "[::1]"].includes(location.hostname)
  );
}
async function request(scope: string, path: string, body?: Request) {
  if (!allowed() || scope !== "mock-user")
    throw Error("로컬 테스트 계정으로 로그인하세요.");
  const r = await fetch("/api/mock/card-rpg/" + path, {
    method: body ? "POST" : "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok || !data.mock || !data.ok || data.accountId !== scope)
    throw Object.assign(
      Error(data.message || "테스트 원장을 확인할 수 없어요."),
      { reason: data.reason },
    );
  return data;
}
async function syncReceipts(scope: string, history: WalletReceipt[]) {
  return collectionTransaction(scope, (c) => {
    for (const r of history) {
      const key = "ledger:" + r.key;
      if (c.receipts[key]) continue;
      const cards = r.cards.map((p) => {
        const entry = banners[r.id]?.entries.find((e) => e.id === p.id);
        if (!entry)
          throw Error("출현표가 변경됐어요. 화면을 새로 열어 주세요.");
        let ownedId = p.ownedId;
        if (r.id === "relic") {
          if (!c.items.some((i) => i.ownedEquipmentId === ownedId))
            c.items.push({
              ownedEquipmentId: ownedId,
              equipmentDefinitionId: p.id as GearId,
            });
        } else {
          const existing = c.units.find((u) => u.battleVariantId === p.id);
          if (existing) ownedId = existing.ownedUnitId;
          else
            c.units.push({
              ownedUnitId: ownedId,
              battleVariantId: p.id,
              level: 1,
              xp: 0,
              costumeId: "default",
              acquired: r.createdAt,
            });
        }
        c.shards += p.shards;
        return {
          entry,
          ownedId,
          duplicate: p.duplicate,
          guaranteed: p.guaranteed,
          pity: p.pity,
        };
      });
      c.receipts[key] = { banner: r.id, count: r.count, cards };
    }
    return c;
  });
}
export default function WalletSummon({ scope, id, reveal }: Props) {
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState<1 | 10 | null>(null);
  const [visible, open] = useState(false),
    [busy, setBusy] = useState(false);
  const pending = useRef<Request | null>(null),
    running = useRef(false),
    sessionKey = "kkulkkul-card-rpg.wallet-pending." + scope;
  useEffect(() => {
    setConfirm(null);
  }, [id]);
  async function refresh() {
    const remote = (await request(scope, "catalog")) as Catalog;
    await syncReceipts(scope, remote.history);
    setCatalog(remote);
    window.dispatchEvent(new Event("kkulkkul-card-rpg:wallet"));
    return remote;
  }
  async function load() {
    if (running.current) return;
    setBusy(true);
    running.current = true;
    open(true);
    setError("");
    try {
      const remote = await refresh();
      const saved = localStorage.getItem(sessionKey);
      pending.current = saved ? JSON.parse(saved) : null;
      if (
        pending.current &&
        remote.history.some((r) => r.key === pending.current?.key)
      ) {
        pending.current = null;
        localStorage.removeItem(sessionKey);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "조회 실패");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function pay() {
    if (!catalog || running.current || (!confirm && !pending.current)) return;
    setBusy(true);
    running.current = true;
    setError("");
    try {
      if (!pending.current) {
        const offer = catalog.offers[id];
        pending.current = {
          id,
          count: confirm!,
          key: crypto.randomUUID(),
          expectedBalance: catalog.balance,
          expectedCost: offer.cost * confirm!,
          version: offer.version,
          poolVersion: offer.poolVersion,
          priceVersion: offer.priceVersion,
        };
      }
      // Persist the id before sending; closing the tab after commit can only replay it.
      localStorage.setItem(sessionKey, JSON.stringify(pending.current));
      const { receipt } = (await request(scope, "summon", pending.current)) as {
        receipt: WalletReceipt;
      };
      window.dispatchEvent(new Event("kkulkkul-card-rpg:wallet"));
      const c = await syncReceipts(scope, [receipt]);
      localStorage.removeItem(sessionKey);
      pending.current = null;
      reveal(receipt, c.receipts["ledger:" + receipt.key].cards);
    } catch (e) {
      if (
        e &&
        typeof e === "object" &&
        "reason" in e &&
        [
          "INSUFFICIENT",
          "BANNER_CHANGED",
          "BALANCE_CHANGED",
          "INVALID_POOL",
          "BAD_REQUEST",
          "KEY_CONFLICT",
        ].includes(String(e.reason))
      ) {
        pending.current = null;
        localStorage.removeItem(sessionKey);
        setConfirm(null);
        setCatalog(null);
        await refresh().catch(() => {});
      }
      setError(
        e instanceof Error ? e.message : "테스트 거래를 다시 확인해 주세요.",
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function history(r: WalletReceipt) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      const c = await syncReceipts(scope, [r]);
      reveal(r, c.receipts["ledger:" + r.key].cards);
    } catch {
      setError(
        "기기에 결과를 저장할 수 없어요. 공간을 확보한 뒤 다시 열어 주세요.",
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  if (!allowed()) return null;
  if (scope !== "mock-user")
    return (
      <p>
        테스트 월정석 소환은{" "}
        <a href="/login/?next=%2Fgames%2Fkkulkkul-card-rpg%2F%23summon">
          개발 계정 로그인
        </a>{" "}
        후 이용할 수 있어요.
      </p>
    );
  const offer = catalog?.offers[id];
  return (
    <section aria-label="테스트 월정석 거래">
      <button disabled={busy} onClick={load}>
        {visible ? "테스트 원장 새로고침" : "테스트 월정석 소환 열기"}
      </button>
      {visible && (
        <>
          <p>
            격리된 개발 계정의 월정석을 사용합니다. 운영 배너는 준비 중이에요.
          </p>
          {error && <p role="alert">{error}</p>}
          {catalog && offer && (
            <>
              <p>
                테스트 월정석 {catalog.balance}개 · 픽업 누적{" "}
                {catalog.pity[id] ?? 0} / {offer.guarantee}
              </p>
              <p>
                {offer.entries
                  .map(
                    (e) =>
                      banners[id].entries.find((b) => b.id === e.id)?.name +
                      " " +
                      e.weight +
                      "%",
                  )
                  .join(" · ")}
              </p>
              <small>
                픽업 없이 {offer.guarantee - 1}회 뒤 다음 슬롯 픽업 보장 ·
                배너별 누적 · 개별 예장 보유 · 캐릭터 중복 시 조각 3개
              </small>
              {!pending.current &&
                !confirm &&
                ([1, 10] as const).map((n) => (
                  <button key={n} disabled={busy} onClick={() => setConfirm(n)}>
                    테스트 {n}회 · {offer.cost * n}개
                  </button>
                ))}
              {confirm && !pending.current && (
                <div>
                  <p>
                    {banners[id].label} {confirm}회 · {offer.cost * confirm}개
                    사용 ·{" "}
                    {catalog.balance < offer.cost * confirm
                      ? "잔액 부족"
                      : "예상 잔액 " +
                        (catalog.balance - offer.cost * confirm) +
                        "개"}
                  </p>
                  <button onClick={() => setConfirm(null)} disabled={busy}>
                    거래 취소
                  </button>
                  <button
                    disabled={busy || catalog.balance < offer.cost * confirm}
                    onClick={pay}
                  >
                    테스트 월정석 사용 확인
                  </button>
                </div>
              )}
              {pending.current && (
                <button disabled={busy} onClick={pay}>
                  같은 거래 다시 확인
                </button>
              )}
              {catalog.history.length > 0 && (
                <details>
                  <summary>테스트 소환 이력 {catalog.history.length}건</summary>
                  {[...catalog.history].reverse().map((r) => (
                    <button
                      key={r.key}
                      disabled={busy}
                      onClick={() => history(r)}
                    >
                      {banners[r.id].title} · {r.count}장 · {r.cost}개 사용
                    </button>
                  ))}
                </details>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
