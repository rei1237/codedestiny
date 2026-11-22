import { useState } from "react";
import { saveFormation, type Collection } from "./collection";
import {
  buildBattleSnapshot,
  costumeArt,
  definitions,
  equipment,
  moveSlot,
  resolveSlot,
  supports,
  validateFormation,
  type Formation,
} from "./formation";
import s from "./collection.module.css";

type Props = {
  scope: string;
  data: Collection;
  preset: number;
  onPreset: (i: number) => void;
  onSaved: (c: Collection) => void;
  reload: () => void;
  target: string;
};
export default function PartyEditor({
  scope,
  data,
  preset,
  onPreset,
  onSaved,
  reload,
  target,
}: Props) {
  const initial = data.formations[preset];
  const [draft, setDraft] = useState(initial),
    [rev, setRev] = useState(data.revisions[preset]);
  const [slot, setSlot] = useState(
    Math.max(
      0,
      initial.slots.findIndex((s) => s?.unit === target),
    ),
  );
  const [swap, setSwap] = useState<number | null>(null),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [inspect, setInspect] = useState(false);
  const [candidate, setCandidate] = useState(
    data.units.find((u) => u.ownedUnitId === target)?.ownedUnitId ??
      data.units[0].ownedUnitId,
  );
  const active = draft.slots[slot],
    unit = active && resolveSlot(data, active),
    issues = validateFormation(data, draft);
  const requestedGear = data.items.find((e) => e.ownedEquipmentId === target);
  function edit(next: Formation) {
    setDraft(next);
    setInspect(false);
    setStatus("저장 전 변경");
  }
  function select(i: number) {
    if (swap !== null) {
      edit(moveSlot(draft, swap, i));
      setSwap(null);
    }
    setSlot(i);
  }
  function place() {
    const existing = draft.slots.findIndex((s) => s?.unit === candidate);
    if (existing >= 0) {
      edit(moveSlot(draft, existing, slot));
      return;
    }
    edit({
      ...draft,
      slots: draft.slots.map((s, i) => (i === slot ? { unit: candidate } : s)),
    });
  }
  function equip(gear: string) {
    if (draft.slots.some((p, i) => i !== slot && p?.gear === gear && gear)) {
      setStatus("다른 슬롯에서 사용 중인 예장이에요.");
      return;
    }
    edit({
      ...draft,
      slots: draft.slots.map((p, i) =>
        i === slot && p ? { ...p, gear: gear || undefined } : p,
      ),
    });
  }
  async function save() {
    setBusy(true);
    try {
      const c = await saveFormation(scope, preset, rev, draft);
      onSaved(c);
      setRev(c.revisions[preset]);
      setStatus("편성을 저장했어요.");
    } catch (e) {
      setStatus(
        e instanceof DOMException && e.name === "QuotaExceededError"
          ? "기기 저장 공간이 부족해요. 공간을 확보한 뒤 다시 저장해 주세요."
          : e instanceof Error
            ? e.message
            : "저장 실패 · 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={s.workspace}>
      <aside>
        <div className={s.bar}>
          {[0, 1].map((i) => (
            <button
              key={i}
              aria-pressed={preset === i}
              onClick={() => onPreset(i)}
            >
              편성 {i + 1}
            </button>
          ))}
        </div>
        <label>
          출전 규칙
          <select
            value={draft.tutorial ? "tutorial" : "normal"}
            onChange={(e) => {
              edit({ ...draft, tutorial: e.target.value === "tutorial" });
              setCandidate(data.units[0].ownedUnitId);
            }}
          >
            <option value="tutorial">튜토리얼 · 전열 1명 이상</option>
            <option value="normal">일반 · 전열 3명</option>
          </select>
        </label>
        {[0, 1].map((row) => (
          <section key={row}>
            <h3>{row ? "후열" : "전열"}</h3>
            <div className={s.slots}>
              {draft.slots.slice(row * 3, row * 3 + 3).map((p, col) => {
                const i = row * 3 + col,
                  r = p && resolveSlot(data, p);
                return (
                  <button
                    key={i}
                    aria-label={
                      (row ? "후열 " : "전열 ") +
                      (col + 1) +
                      " " +
                      (r?.variant.name ?? "빈 슬롯")
                    }
                    aria-pressed={slot === i}
                    draggable={!!p}
                    onDragStart={(e) =>
                      e.dataTransfer.setData(
                        "application/x-kkulkkul-slot",
                        String(i),
                      )
                    }
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const source = e.dataTransfer.getData(
                        "application/x-kkulkkul-slot",
                      );
                      if (/^[0-5]$/.test(source)) {
                        edit(moveSlot(draft, Number(source), i));
                        setSwap(null);
                        setSlot(i);
                      }
                    }}
                    onClick={() => select(i)}
                  >
                    {r ? (
                      <>
                        <img
                          alt=""
                          src={costumeArt(
                            r.variant,
                            r.owned?.costumeId ?? "default",
                          )}
                        />
                        <b>{r.variant.name}</b>
                        <small>
                          {r.item
                            ? equipment[r.item.equipmentDefinitionId].name
                            : r.owned
                              ? "예장 없음"
                              : "임시 지원"}
                        </small>
                      </>
                    ) : (
                      <span>＋</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </aside>
      <section>
        <h3>
          {slot < 3 ? "전열" : "후열"} {(slot % 3) + 1} ·{" "}
          {unit?.variant.name ?? "빈 슬롯"}
        </h3>
        <label>
          배치할 동료
          <select
            value={candidate}
            onChange={(e) => setCandidate(e.target.value)}
          >
            {data.units.map((u) => (
              <option key={u.ownedUnitId} value={u.ownedUnitId}>
                {definitions[u.battleVariantId].name}
              </option>
            ))}
            {draft.tutorial &&
              Object.entries(supports).map(([k, v]) => (
                <option key={k} value={k}>
                  {definitions[v].name} · 임시 지원
                </option>
              ))}
          </select>
        </label>
        <div className={s.bar}>
          <button onClick={place}>선택 슬롯에 배치</button>
          {active && (
            <>
              <button onClick={() => setSwap(swap === null ? slot : null)}>
                {swap === null ? "위치 교환" : "교환 취소"}
              </button>
              <button
                onClick={() =>
                  edit({
                    ...draft,
                    slots: draft.slots.map((p, i) => (i === slot ? null : p)),
                  })
                }
              >
                슬롯 비우기
              </button>
            </>
          )}
        </div>
        {swap !== null && <p>교환할 슬롯을 누르세요.</p>}
        {unit && (
          <p>
            {unit.variant.role} · {unit.variant.skills[0]} 중심의{" "}
            {unit.variant.deck[0]} 카드 운용
          </p>
        )}
        {unit?.owned && (
          <>
            <label>
              장착 예장
              <select
                value={active?.gear ?? ""}
                onChange={(e) => equip(e.target.value)}
              >
                <option value="">장착 해제</option>
                {data.items.map((i) => (
                  <option value={i.ownedEquipmentId} key={i.ownedEquipmentId}>
                    {equipment[i.equipmentDefinitionId].name}
                  </option>
                ))}
              </select>
            </label>
            {requestedGear && (
              <button onClick={() => equip(target)}>
                {equipment[requestedGear.equipmentDefinitionId].name} 장착
              </button>
            )}
            <p>
              HP {unit.variant.hp} →{" "}
              {unit.variant.hp +
                (unit.item
                  ? equipment[unit.item.equipmentDefinitionId].hp
                  : 0)}{" "}
              · 공격 {unit.variant.atk} →{" "}
              {unit.variant.atk +
                (unit.item
                  ? equipment[unit.item.equipmentDefinitionId].atk
                  : 0)}
            </p>
            {unit.item && (
              <p>
                {equipment[unit.item.equipmentDefinitionId].effect.name} ·{" "}
                {equipment[unit.item.equipmentDefinitionId].effect.trigger}
              </p>
            )}
          </>
        )}
        <div className={s.bar}>
          <button disabled={busy} onClick={save}>
            편성 저장
          </button>
          <button onClick={() => setInspect(true)}>출전 준비 확인</button>
          <button onClick={reload}>다시 불러오기</button>
        </div>
        <p role="status">{status}</p>
        {inspect &&
          (issues.length ? (
            <ul>
              {issues.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : (
            <div>
              <h3>출전 준비 완료</h3>
              {buildBattleSnapshot(data, draft).map(
                (r) =>
                  r && (
                    <div className={s.summary} key={r.combatantId}>
                      <img
                        src={costumeArt(
                          definitions[r.battleVariantId],
                          r.costumeId,
                        )}
                        alt=""
                      />
                      <span>
                        {definitions[r.battleVariantId].name} ·{" "}
                        {r.position < 3 ? "전열" : "후열"} · HP {r.hp} · 공격{" "}
                        {r.atk}
                        <br />
                        {r.deck.join(" / ")}
                        {r.effect && " · " + r.effect.name}
                      </span>
                    </div>
                  ),
              )}
            </div>
          ))}
      </section>
    </div>
  );
}
