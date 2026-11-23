import { useEffect, useState } from "react";
import { companions } from "./catalog";
import {
  definitions,
  variants,
  equipment,
  costumeArt,
  costumes,
  availableCostumes,
  unitStats,
  gearStats,
  type GearId,
} from "./formation";
import { loadCollection, setCostume, type Collection } from "./collection";
import { banners } from "./summon-preview";
import CharacterCard from "./CharacterCard";
import { battleKit, skillDefinitions } from "./battle-data";
import PartyEditor from "./PartyEditor";
import { CharacterRoom } from "./character-room";
import s from "./collection.module.css";

type Props = {
  scope: string;
  screen: "cast" | "team" | "relic";
  target: string;
  hero: number;
  chooseHero: (i: number, battleVariantId?: string) => void;
  heroVariant: string;
  depart: (preset: number) => void;
  go: (id: "team" | "relic" | "cast", target: string) => void;
  still: boolean;
  metYeon: boolean;
};
export default function CollectionViews(props: Props) {
  const [data, setData] = useState<Collection | null>(null),
    [error, setError] = useState(""),
    [version, reload] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    loadCollection(props.scope)
      .then((c) => {
        if (active) setData(c);
      })
      .catch(() => {
        if (active)
          setError("컬렉션을 열 수 없어요. 기기 저장 공간을 확인하세요.");
      });
    return () => {
      active = false;
    };
  }, [props.scope, version]);
  if (error)
    return (
      <p role="alert">
        {error} <button onClick={() => reload(version + 1)}>다시 시도</button>
      </p>
    );
  if (!data) return <p>개발 컬렉션 확인 중…</p>;
  return (
    <Library
      key={version}
      {...props}
      data={data}
      setData={setData}
      reload={() => {
        setData(null);
        reload(version + 1);
      }}
    />
  );
}
function Library({
  scope,
  screen,
  target,
  hero,
  heroVariant,
  chooseHero,
  depart,
  go,
  still,
  metYeon,
  data,
  setData,
  reload,
}: Props & {
  data: Collection;
  setData: (c: Collection) => void;
  reload: () => void;
}) {
  const [selected, select] = useState(
    data.units.find((u) => u.ownedUnitId === target)?.battleVariantId ??
      "moka-base",
  );
  const [gearId, setGearId] = useState<GearId>(
    data.items.find((e) => e.ownedEquipmentId === target)
      ?.equipmentDefinitionId ?? "alarm",
  );
  const [preset, setPreset] = useState(0),
    [room, setRoom] = useState(false),
    [name, setName] = useState(""),
    [stars, setStars] = useState(""),
    [role, setRole] = useState(""),
    [owned, setOwned] = useState(""),
    [level, setLevel] = useState(""),
    [sort, setSort] = useState("catalog"),
    [msg, setMsg] = useState("");
  const v = definitions[selected],
    u = data.units.find((u) => u.battleVariantId === selected);
  const unitFor = (id: string) =>
    data.units.find((u) => u.battleVariantId === id);
  const list = variants.filter((v) => {
    const u = unitFor(v.battleVariantId);
    return (
      v.name.includes(name) &&
      (!stars || v.stars === Number(stars)) &&
      (!role || v.role === role) &&
      (!owned || (owned === "yes") === !!u) &&
      (!level || (u && u.level >= Number(level)))
    );
  });
  if (sort === "recent")
    list.sort(
      (a, b) =>
        (unitFor(b.battleVariantId)?.acquired ?? -1) -
        (unitFor(a.battleVariantId)?.acquired ?? -1),
    );
  const matching = data.items.filter((i) => i.equipmentDefinitionId === gearId);
  const [instance, chooseInstance] = useState(target);
  const item =
    matching.find((i) => i.ownedEquipmentId === instance) ?? matching[0];
  const gear = item ? gearStats(item) : equipment[gearId],
    stats = unitStats(v, u?.level);
  const kit = battleKit(v.battleVariantId, v.baseCharacterId);
  const story = data.campaign;
  const sceneMet =
    (v.baseCharacterId === "yeon" && (metYeon || !!story?.read?.length)) ||
    (v.baseCharacterId === "neo" &&
      (story?.node === "guardian" || story?.read?.includes("guardian")));
  const worn = u
    ? data.formations.flatMap((f, i) =>
        f.slots
          .filter((p) => p?.unit === u.ownedUnitId && p.gear)
          .map((p) => {
            const gear = data.items.find(
              (e) => e.ownedEquipmentId === p?.gear,
            )!;
            return (
              "편성 " +
              (i + 1) +
              " · " +
              equipment[gear.equipmentDefinitionId].name
            );
          }),
      )
    : [];
  async function wear(id: string) {
    if (!u) return;
    try {
      setData(await setCostume(scope, u.ownedUnitId, id));
      setMsg("의상을 저장했어요.");
    } catch {
      setMsg("의상을 저장하지 못했어요. 다시 선택해 주세요.");
    }
  }
  return (
    <div className={s.collection}>
      <small>이 기기의 개발 컬렉션 · 조각 {data.shards}개</small>
      {screen === "team" ? (
        <PartyEditor
          key={preset}
          scope={scope}
          data={data}
          target={target}
          depart={depart}
          preset={preset}
          onPreset={setPreset}
          onSaved={setData}
          reload={reload}
        />
      ) : screen === "relic" ? (
        <div className={s.workspace}>
          <aside>
            <h3>예장 도감</h3>
            <div className={s.gearShelf}>
              {banners.relic.entries.map((e) => (
                <button
                  className={s.listRow}
                  aria-pressed={e.id === gearId}
                  key={e.id}
                  onClick={() => setGearId(e.id as GearId)}
                >
                  <img src={e.art} alt="" />
                  <span>{e.name}</span>
                  <small>
                    {data.items.some((i) => i.equipmentDefinitionId === e.id)
                      ? "보유"
                      : "미소유"}
                  </small>
                </button>
              ))}
            </div>
          </aside>
          <section>
            <h3>{gear.name}</h3>
            <p>
              게임 각색 예장 · 장착 1슬롯
              {item &&
                " · Lv." +
                  (item.level ?? 1) +
                  " · 한계 돌파 " +
                  (item.breaks ?? 0)}
            </p>
            {matching.length > 1 && (
              <label>
                보유 예장 선택
                <select
                  value={item.ownedEquipmentId}
                  onChange={(e) => chooseInstance(e.target.value)}
                >
                  {matching.map((x, i) => (
                    <option key={x.ownedEquipmentId} value={x.ownedEquipmentId}>
                      보관 {i + 1} · Lv.{x.level ?? 1}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <img
              className={s.gearArt}
              src={banners.relic.entries.find((e) => e.id === gearId)!.art}
              alt={gear.name}
            />
            <p>
              HP +{gear.hp} · 공격 +{gear.atk}
            </p>
            <p>
              {gear.effect.trigger} · {gear.effect.name} {gear.effect.amount}
              {gear.effect.unit} · {gear.effect.stack} 적용 · 상한{" "}
              {gear.effect.cap}
              {gear.effect.unit}
            </p>
            <button
              disabled={!item}
              onClick={() => item && go("team", item.ownedEquipmentId)}
            >
              편성에서 장착
            </button>
          </section>
        </div>
      ) : room && u ? (
        <CharacterRoom
          v={v}
          still={still}
          costumeId={u.costumeId}
          close={() => setRoom(false)}
        />
      ) : (
        <div className={s.workspace}>
          <aside>
            <details className={s.filterSheet}>
              <summary>카드 검색 · 필터</summary>
              <div className={s.filters}>
                <input
                  aria-label="이름 검색"
                  placeholder="동료 이름 검색"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <select
                  aria-label="소유 여부"
                  value={owned}
                  onChange={(e) => setOwned(e.target.value)}
                >
                  <option value="">전체 소유 상태</option>
                  <option value="yes">소유</option>
                  <option value="no">미소유</option>
                </select>
                <select
                  aria-label="희귀도"
                  value={stars}
                  onChange={(e) => setStars(e.target.value)}
                >
                  <option value="">전체 희귀도</option>
                  <option value="3">3성</option>
                  <option value="4">4성</option>
                </select>
                <select
                  aria-label="역할"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="">전체 역할</option>
                  {variants.map((v) => (
                    <option key={v.role}>{v.role}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  aria-label="최소 레벨"
                  placeholder="최소 레벨"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                />
                <select
                  aria-label="정렬"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="catalog">도감 순서</option>
                  <option value="recent">최근 획득순</option>
                </select>
              </div>
            </details>
            <div className={s.album}>
              {list.map((x) => (
                <button
                  key={x.battleVariantId}
                  aria-label={
                    x.name +
                    (x.edition === "기본 전투 버전" ? "" : " " + x.edition) +
                    " 카드"
                  }
                  aria-pressed={x === v}
                  onClick={() => {
                    select(x.battleVariantId);
                    setMsg("");
                  }}
                >
                  <CharacterCard
                    variant={x}
                    costume={unitFor(x.battleVariantId)?.costumeId}
                  />
                  <small>
                    {x.edition !== "기본 전투 버전" && x.edition + " · "}
                    {unitFor(x.battleVariantId)
                      ? "보유 · Lv." + unitFor(x.battleVariantId)!.level
                      : "미소유"}
                  </small>
                </button>
              ))}
            </div>
            {!list.length && <p>조건에 맞는 카드가 없어요.</p>}
          </aside>
          <section>
            <h3>
              {v.name} <small>{v.edition}</small>
            </h3>
            <p>
              {u
                ? "개발 컬렉션 영구 소유 · Lv." + u.level + " · XP " + u.xp
                : "미소유"}{" "}
              · {sceneMet ? "소설에서 만남" : "소설에서 만나기 전"}
              {["neo", "yeon"].includes(v.baseCharacterId)
                ? " · 튜토리얼 지원 가능"
                : ""}
            </p>
            <div className={s.bar}>
              <button disabled={!u} onClick={() => setRoom(true)}>
                캐릭터 룸
              </button>
              <button
                disabled={!u}
                onClick={() => u && go("team", u.ownedUnitId)}
              >
                편성에 넣기
              </button>
              <button
                onClick={() =>
                  chooseHero(
                    companions.findIndex(
                      (c) => c.speaker === v.baseCharacterId,
                    ),
                    u?.battleVariantId,
                  )
                }
              >
                {companions[hero].speaker === v.baseCharacterId &&
                heroVariant === v.battleVariantId
                  ? "현재 로비 대표"
                  : "로비 대표 지정"}
              </button>
            </div>
            <div className={s.battleLook}>
              <img
                src={costumeArt(v, u?.costumeId ?? "default")}
                alt={v.name + " 전투 모습"}
              />
              <div>
                <b>{v.role}</b>
                <p>
                  HP {stats.hp} · 공격 {stats.atk}
                </p>
                <p>{v.deck.join(" / ")}</p>
              </div>
            </div>
            <p>장착 예장 · {worn.join(" / ") || "없음"}</p>
            <label>
              의상
              <select
                disabled={!u}
                value={u?.costumeId ?? "default"}
                onChange={(e) => wear(e.target.value)}
              >
                <option value="default">기본 의상</option>
                {Object.entries(costumes)
                  .filter(([, c]) => c.variantId === v.battleVariantId)
                  .map(([id, c]) => {
                    const unlocked = u && availableCostumes(u).includes(id);
                    return (
                      <option key={id} value={id} disabled={!unlocked}>
                        {c.name}
                        {!unlocked && " · 수련실에서 제작"}
                      </option>
                    );
                  })}
              </select>
            </label>
            <span role="status">{msg}</span>
            <h4>능력 · 게임 각색</h4>
            <p>
              스킬 ·{" "}
              {v.skills
                .map((name, i) => name + " Lv." + (u?.skillLevel?.[i] ?? 1))
                .join(" / ")}
            </p>
            <p>
              패시브 · {v.passive}
              <br />
              운명해방 · {v.ultimate} · Lv.{u?.ultimateLevel ?? 1}
            </p>
            <details className={s.filterSheet}>
              <summary>스킬 효과와 운용</summary>
              {skillDefinitions(v.battleVariantId, u?.skillLevel).map(
                (skill) => (
                  <p key={skill.name}>
                    <b>{skill.name}</b> · {skill.description} · 재사용{" "}
                    {skill.cooldown}턴
                  </p>
                ),
              )}
              <p>
                {v.passive} · {kit.passiveDescription}
              </p>
              <p>
                {v.ultimate} · {kit.ultimate} · {kit.hits[kit.ultimate] + 1}타 ·
                게이지 100
              </p>
              <p>{kit.weakness}</p>
            </details>
            <h4>원작 인연 기록</h4>
            <p>
              {sceneMet
                ? v.bond
                : "잠금 · " +
                  v.bond.split(" · ")[0] +
                  "에서 이 인물을 만나면 공개됩니다."}
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
