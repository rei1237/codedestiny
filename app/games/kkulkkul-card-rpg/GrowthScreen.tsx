"use client";
import { useEffect, useRef, useState } from "react";
import { loadCollection, type Collection } from "./collection";
import { costumes, definitions, equipment } from "./formation";
import CharacterCard from "./CharacterCard";
import {
  commitGrowth,
  growthLabels,
  materialChoices,
  protectGear,
  quoteGrowth,
  type GrowthAction,
  type GrowthInput,
} from "./growth";
import { banners } from "./summon-preview";
import s from "./growth.module.css";

export default function Growth({ scope }: { scope: string }) {
  const [data, setData] = useState<Collection | null>(null),
    [error, setError] = useState(""),
    [attempt, refresh] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    if (scope)
      loadCollection(scope)
        .then((c) => {
          if (active) setData(c);
        })
        .catch(() => {
          if (active) setError("이 기기의 성장 기록을 열 수 없어요.");
        });
    return () => {
      active = false;
    };
  }, [scope, attempt]);
  if (error)
    return (
      <p role="alert">
        {error} <button onClick={() => refresh((x) => x + 1)}>다시 시도</button>
      </p>
    );
  if (!data) return <p>성장 기록을 확인하고 있어요.</p>;
  return (
    <Workshop
      key={scope}
      scope={scope}
      data={data}
      setData={setData}
      reload={() => refresh((x) => x + 1)}
    />
  );
}
function Workshop({
  scope,
  data,
  setData,
  reload,
}: {
  scope: string;
  data: Collection;
  setData: (c: Collection) => void;
  reload: () => void;
}) {
  const [tab, setTab] = useState<"unit" | "gear">("unit"),
    [unitId, setUnitId] = useState(data.units[0]?.ownedUnitId),
    [gearId, setGearId] = useState(data.items[0]?.ownedEquipmentId);
  const [action, setAction] = useState<GrowthAction>("level"),
    [skill, setSkill] = useState(0),
    [material, setMaterial] = useState("");
  const [confirm, setConfirm] = useState<{
    key: string;
    input: GrowthInput;
    revision: string;
  } | null>(null);
  const [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const inflight = useRef(false);
  const unit =
      data.units.find((u) => u.ownedUnitId === unitId) ?? data.units[0],
    v = unit && definitions[unit.battleVariantId];
  const g =
    data.items.find((g) => g.ownedEquipmentId === gearId) ?? data.items[0];
  const person = tab === "unit",
    id = person ? unit?.ownedUnitId : g?.ownedEquipmentId;
  const outfit = Object.keys(costumes).find(
    (id) =>
      id !== "moka-apron" && costumes[id].variantId === v?.battleVariantId,
  );
  const actions: GrowthAction[] = person
    ? [
        "level",
        "skill",
        "ultimate",
        "awaken",
        ...(outfit ? ["costume" as const] : []),
        ...(v?.battleVariantId === "moka-base" ? ["variant" as const] : []),
      ]
    : ["gear-level", "gear-break"];
  const kind = actions.includes(action) ? action : actions[0];
  const input: GrowthInput = {
    kind,
    ownedId: id ?? "",
    index: kind === "skill" ? skill : undefined,
    costumeId: kind === "costume" ? outfit : undefined,
    materialId: kind === "gear-break" ? material || undefined : undefined,
  };
  const quote = id ? quoteGrowth(data, input) : null;
  function change() {
    setConfirm(null);
    setStatus("");
  }
  async function save() {
    if (!confirm || inflight.current) return;
    inflight.current = true;
    setBusy(true);
    try {
      const next = await commitGrowth(
        scope,
        confirm.key,
        confirm.input,
        confirm.revision,
      );
      setData(next);
      setConfirm(null);
      setStatus("성장 기록을 저장했어요.");
      setMaterial("");
    } catch (e) {
      setStatus(
        e instanceof Error
          ? e.message
          : "저장에 실패했어요. 다시 시도해 주세요.",
      );
    } finally {
      inflight.current = false;
      setBusy(false);
    }
  }
  async function flag(field: "locked" | "favorite") {
    if (!g || inflight.current) return;
    inflight.current = true;
    setBusy(true);
    try {
      setData(await protectGear(scope, g.ownedEquipmentId, field, !g[field]));
      change();
    } catch {
      setStatus("보호 설정을 저장할 수 없어요.");
    } finally {
      inflight.current = false;
      setBusy(false);
    }
  }
  const art =
    g &&
    banners.relic.entries.find((e) => e.id === g.equipmentDefinitionId)?.art;
  return (
    <section className={s.workshop}>
      <header>
        <h2>달빛 수련실</h2>
        <span>
          훈련 조각 <b>{data.shards}</b>
        </span>
      </header>
      <fieldset disabled={busy}>
        <div className={s.tabs}>
          {(["unit", "gear"] as const).map((t) => (
            <button
              key={t}
              aria-pressed={t === tab}
              onClick={() => {
                setTab(t);
                setAction(t === "unit" ? "level" : "gear-level");
                setMaterial("");
                change();
              }}
            >
              {t === "unit" ? "동료 수련" : "예장 수련"}
            </button>
          ))}
        </div>
        <div className={s.spread}>
          <aside>
            {person && v && unit ? (
              <CharacterCard variant={v} costume={unit.costumeId} />
            ) : (
              art && (
                <img src={art} alt={equipment[g.equipmentDefinitionId].name} />
              )
            )}
          </aside>
          <section>
            <label>
              {person ? "수련할 동료" : "수련할 예장"}
              <select
                value={id ?? ""}
                onChange={(e) => {
                  if (person) setUnitId(e.target.value);
                  else setGearId(e.target.value);
                  setMaterial("");
                  change();
                }}
              >
                {person
                  ? data.units.map((u) => (
                      <option key={u.ownedUnitId} value={u.ownedUnitId}>
                        {definitions[u.battleVariantId].name} ·{" "}
                        {definitions[u.battleVariantId].edition} · Lv.{u.level}
                      </option>
                    ))
                  : data.items.map((x, i) => (
                      <option
                        key={x.ownedEquipmentId}
                        value={x.ownedEquipmentId}
                      >
                        {equipment[x.equipmentDefinitionId].name} · Lv.
                        {x.level ?? 1} · 보관 {i + 1}
                      </option>
                    ))}
              </select>
            </label>
            {!person && g && (
              <div className={s.tabs}>
                <button
                  aria-pressed={!!g.locked}
                  onClick={() => flag("locked")}
                >
                  {g.locked ? "잠금 해제" : "예장 잠금"}
                </button>
                <button
                  aria-pressed={!!g.favorite}
                  onClick={() => flag("favorite")}
                >
                  {g.favorite ? "즐겨찾기 해제" : "즐겨찾기"}
                </button>
              </div>
            )}
            <label>
              수련 과정
              <select
                value={kind}
                onChange={(e) => {
                  setAction(e.target.value as GrowthAction);
                  change();
                }}
              >
                {actions.map((k) => (
                  <option value={k} key={k}>
                    {growthLabels[k]}
                  </option>
                ))}
              </select>
            </label>
            {kind === "skill" && v && (
              <label>
                수련할 스킬
                <select
                  value={skill}
                  onChange={(e) => {
                    setSkill(Number(e.target.value));
                    change();
                  }}
                >
                  {v.skills.map((n, i) => (
                    <option value={i} key={i}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {kind === "gear-break" && g && (
              <label>
                돌파 재료
                <select
                  value={material}
                  onChange={(e) => {
                    setMaterial(e.target.value);
                    change();
                  }}
                >
                  <option value="">조각만 사용</option>
                  {materialChoices(data, g.ownedEquipmentId).map((m) => (
                    <option key={m.ownedEquipmentId} value={m.ownedEquipmentId}>
                      {equipment[m.equipmentDefinitionId].name} · Lv.
                      {m.level ?? 1} · 보관 {data.items.indexOf(m) + 1}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {quote && (
              <>
                <dl className={s.compare}>
                  <dt>현재</dt>
                  <dd>{quote.before}</dd>
                  <dt>수련 후</dt>
                  <dd>{quote.after}</dd>
                  <dt>소모</dt>
                  <dd>
                    훈련 조각 {quote.cost}개
                    {input.materialId && " + 선택한 예장 1개"}
                  </dd>
                </dl>
                {quote.lock ? (
                  <p>
                    {quote.lock} <a href="#event">의뢰 보기</a>
                  </p>
                ) : confirm ? (
                  <div className={s.tabs}>
                    <button onClick={() => setConfirm(null)}>취소</button>
                    <button className={s.confirm} onClick={save}>
                      {busy ? "저장 중" : "재료 사용 확정"}
                    </button>
                  </div>
                ) : (
                  <button
                    className={s.confirm}
                    onClick={() => {
                      setStatus("");
                      setConfirm({
                        key: crypto.randomUUID(),
                        input,
                        revision: quote.revision,
                      });
                    }}
                  >
                    수련 확인
                  </button>
                )}
              </>
            )}
            <p role="status">{status}</p>
            {status && <button onClick={reload}>기록 다시 불러오기</button>}
          </section>
        </div>
      </fieldset>
    </section>
  );
}
