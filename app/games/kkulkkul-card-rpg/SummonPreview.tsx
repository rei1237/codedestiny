"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Gem, MoonStar } from "lucide-react";
import {
  banners,
  CARD_BACK,
  fixtures,
  quote,
  scenarios,
  type BannerId,
  type Scenario,
} from "./summon-preview";
import CharacterCard from "./CharacterCard";
import { definitions } from "./formation";
import s from "./summon.module.css";
import { applySummon } from "./collection";

type Phase =
  | "banner"
  | "confirm"
  | "waiting"
  | "error"
  | "reveal"
  | "results"
  | "detail";
type Session = {
  id: BannerId;
  scenario: Scenario;
  phase: Phase;
  n: 1 | 10;
  index: number;
  retried: boolean;
  due: number;
  fast: boolean;
  run: string;
  cards: Awaited<ReturnType<typeof applySummon>>;
};
const initial: Session = {
  id: "character",
  scenario: "normal",
  phase: "banner",
  n: 1,
  index: 0,
  retried: false,
  due: 0,
  fast: false,
  run: "",
  cards: [],
};
const memory = new Map<string, Session>();
function restore(key: string): Session {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || "null");
    if (
      value &&
      Array.isArray(value.cards) &&
      typeof value.run === "string" &&
      (["banner", "confirm", "waiting", "error"].includes(value.phase) ||
        value.cards.length === value.n) &&
      Object.hasOwn(banners, value.id) &&
      Object.hasOwn(scenarios, value.scenario) &&
      [
        "banner",
        "confirm",
        "waiting",
        "error",
        "reveal",
        "results",
        "detail",
      ].includes(value.phase) &&
      [1, 10].includes(value.n) &&
      Number.isInteger(value.index) &&
      value.index >= 0 &&
      value.index < value.n &&
      Number.isFinite(value.due) &&
      typeof value.retried === "boolean" &&
      typeof value.fast === "boolean"
    )
      return value;
  } catch {
    /* Memory also survives local navigation when storage is blocked. */
  }
  return memory.get(key) ?? initial;
}
function Art({
  src,
  name,
  broken = false,
}: {
  src: string;
  name: string;
  broken?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <span
        className={s.placeholder}
        role="img"
        aria-label={name + " · 이미지 없음"}
      >
        <MoonStar />
        {name}
      </span>
    );
  return (
    <img
      src={broken ? "data:image/png;base64,AA==" : src}
      alt={name}
      onError={() => setFailed(true)}
    />
  );
}
type PreviewProps = {
  scope: string;
  balance: string;
  still: boolean;
  go: (id: "team" | "relic" | "cast", ownedId: string) => void;
};
export default function SummonPreview(props: PreviewProps) {
  if (process.env.NODE_ENV !== "development")
    return <p>캐릭터·예장 소환 배너를 준비하고 있어요.</p>;
  if (!props.scope) return <p>계정 확인 중</p>;
  return <DevelopmentSummon key={props.scope} {...props} />;
}
function DevelopmentSummon({ scope, balance, still, go }: PreviewProps) {
  const key = "kkulkkul-card-rpg.summon-preview.v2." + scope;
  const [session, setSession] = useState(initial),
    [ready, setReady] = useState(false);
  const current = useRef(initial);
  const heading = useRef<HTMLHeadingElement>(null);
  const [systemReduced, setSystemReduced] = useState(false);
  const instant = still || systemReduced;
  function update(patch: Partial<Session>) {
    const next = { ...current.current, ...patch };
    current.current = next;
    memory.set(key, next);
    setSession(next);
    try {
      sessionStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* In-memory preview remains available. */
    }
  }
  useEffect(() => {
    current.current = restore(key);
    setSession(current.current);
    setReady(true);
    const mq = matchMedia("(prefers-reduced-motion: reduce)"),
      sync = () => setSystemReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const { id, scenario, phase, n, index, fast } = session;
  const banner = banners[id],
    cost = quote(id, n, scenario),
    results = session.cards,
    pick = banner.entries[0],
    result = results[index];
  useEffect(() => {
    if (!ready || phase !== "waiting") return;
    let active = true;
    const t = setTimeout(
      async () => {
        if (scenario === "failure" && !session.retried) {
          update({ phase: "error" });
          return;
        }
        try {
          const cards = await applySummon(scope, session.run, id, n);
          if (active) update({ cards, phase: "reveal" });
        } catch {
          if (active) update({ phase: "error" });
        }
      },
      Math.max(0, session.due - Date.now()),
    );
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [
    ready,
    phase,
    session.run,
    session.due,
    scenario,
    session.retried,
    scope,
    id,
    n,
  ]);
  useEffect(() => {
    if (!ready || phase !== "reveal") return;
    const t = setTimeout(
      () => {
        if (
          current.current.phase === "reveal" &&
          current.current.index === index
        )
          advance();
      },
      instant ? 650 : fast ? 850 : 1900,
    );
    function advance() {
      update(index + 1 < n ? { index: index + 1 } : { phase: "results" });
    }
    return () => clearTimeout(t);
  }, [ready, phase, index, n, fast, instant]);
  useEffect(() => {
    if (ready && phase !== "banner")
      heading.current?.focus({ preventScroll: true });
  }, [phase, ready]);
  function start(retry = false) {
    if (
      current.current.phase !== (retry ? "error" : "confirm") ||
      cost.after < 0
    )
      return;
    update({
      phase: "waiting",
      index: 0,
      due: Date.now() + (scenario === "slow" ? 3000 : 420),
      retried: retry,
      run: retry ? session.run : crypto.randomUUID(),
      cards: [],
    });
  }
  if (!ready) return <p>미리보기 불러오는 중…</p>;
  const labels = {
    banner: banner.title,
    confirm: "소환 확인",
    waiting: "소환 응답을 기다리고 있어요",
    error: "소환 응답을 받지 못했어요",
    reveal: "카드 공개",
    results: "소환 결과",
    detail: result?.entry.name ?? "획득 상세",
  };
  return (
    <div className={s.summon} data-phase={phase} data-still={instant}>
      <p className={s.notice}>개발용 소환 미리보기 · 실제 월정석 사용 없음</p>
      <h2 ref={heading} tabIndex={-1}>
        {labels[phase]}
      </h2>
      {phase === "banner" && (
        <>
          <div className={s.tabs}>
            {(["character", "relic"] as const).map((tab) => (
              <button
                key={tab}
                aria-pressed={tab === "character" ? id !== "relic" : id === tab}
                onClick={() => update({ id: tab, index: 0 })}
              >
                {banners[tab].label} 소환
              </button>
            ))}
          </div>
          <div className={s.banner}>
            <Art key={pick.id} src={pick.art} name={pick.name} />
            <div>
              <small>이번 픽업 · {"★".repeat(pick.stars)}</small>
              <h3>{pick.name}</h3>
              <p>{pick.role}</p>
            </div>
          </div>
          {id !== "relic" && (
            <label>
              캐릭터 배너
              <select
                value={id}
                onChange={(e) =>
                  update({ id: e.target.value as BannerId, index: 0 })
                }
              >
                <option value="character">{banners.character.title}</option>
                <option value="encounter">{banners.encounter.title}</option>
              </select>
            </label>
          )}
          <div className={s.ledger}>
            <span>
              계정 월정석 <b>{balance}</b>
            </span>
            <span>
              실험 시작 잔액 <b>{cost.balance}개</b>
            </span>
            <span>
              픽업 보장 진행{" "}
              <b>
                {fixtures.pity} / {banner.guarantee}
              </b>
            </span>
          </div>
          <details>
            <summary>출현 확률 · 보장 · 중복 규칙</summary>
            <ul>
              {banner.entries.map((e) => (
                <li key={e.id}>
                  {e.name} · {e.role} · ★{e.stars} · {e.weight}%
                </li>
              ))}
            </ul>
            <p>
              일반 추첨의 개별 확률입니다. 픽업 없이 {banner.guarantee - 1}장을
              공개하면 다음 한 장은 {pick.name} 100%입니다. 픽업이 나오면 보장
              횟수가 초기화됩니다. 중복 한 장은 실험용 조각 {banner.shards}개로
              표시합니다.
            </p>
          </details>
          <label>
            검증 시나리오{" "}
            <select
              value={scenario}
              onChange={(e) => update({ scenario: e.target.value as Scenario })}
            >
              {Object.entries(scenarios).map(([k, v]) => (
                <option value={k} key={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <small>
            실험 잔액과 추첨 순서는 고정됩니다. 획득한 동료와 예장은 이 기기의
            개발 컬렉션에 누적됩니다.
          </small>
          <div className={s.actions}>
            {([1, 10] as const).map((count) => (
              <button
                key={count}
                onClick={() =>
                  update({
                    phase: "confirm",
                    n: count,
                    index: 0,
                    retried: false,
                  })
                }
              >
                {count}회 소환 · {banner.cost * count}개
              </button>
            ))}
          </div>
        </>
      )}
      {phase === "confirm" && (
        <>
          <p>
            {banner.label} {n}회 · 월정석 {cost.cost}개
          </p>
          <p>
            실험 잔액 {cost.balance}개 →{" "}
            {cost.after < 0 ? "부족" : cost.after + "개"}
          </p>
          {cost.after < 0 && (
            <p role="status">
              {-cost.after}개가 부족해요. 기본 시나리오에서 다시 시도할 수
              있어요.
            </p>
          )}
          <div className={s.actions}>
            <button onClick={() => update({ phase: "banner" })}>취소</button>
            <button disabled={cost.after < 0} onClick={() => start()}>
              미리보기 시작
            </button>
          </div>
        </>
      )}
      {phase === "waiting" && (
        <p role="status">
          <Gem /> 월정석 문양을 여는 중이에요.
        </p>
      )}
      {phase === "error" && (
        <>
          <p>소환 결과를 저장하지 못했어요. 같은 실험을 다시 열 수 있어요.</p>
          <button onClick={() => start(true)}>다시 시도</button>
        </>
      )}
      {phase === "reveal" && (
        <>
          <div
            key={index}
            className={s.ritual}
            data-rare={result.entry.stars === 4}
            data-fast={fast}
          >
            <Gem aria-hidden="true" className={s.stone} />
            <div className={s.flip}>
              <div className={s.back}>
                <Art src={CARD_BACK} name="연꽃 카드 뒷면" />
              </div>
              <div className={s.front}>
                {id !== "relic" && scenario !== "image" ? (
                  <CharacterCard variant={definitions[result.entry.id]} />
                ) : (
                  <>
                    <Art
                      key={result.entry.id}
                      src={result.entry.art}
                      name={result.entry.name}
                      broken={scenario === "image"}
                    />
                    <b>
                      {banner.label} · {result.entry.name}
                    </b>
                  </>
                )}
              </div>
            </div>
          </div>
          <p>
            {index + 1} / {n}장 · {"★".repeat(result.entry.stars)}
          </p>
          <div className={s.actions}>
            <button aria-pressed={fast} onClick={() => update({ fast: !fast })}>
              배속 {fast ? "2×" : "1×"}
            </button>
            <button
              onClick={() =>
                update(
                  index + 1 < n ? { index: index + 1 } : { phase: "results" },
                )
              }
            >
              다음 카드
            </button>
            <button onClick={() => update({ phase: "results" })}>
              결과로 건너뛰기
            </button>
          </div>
        </>
      )}
      {phase === "results" && (
        <>
          <p>
            {banner.label} {n}장 · 실험 후 잔액 {cost.after}개 · 보장{" "}
            {results[n - 1].pity} / {banner.guarantee}
          </p>
          <div className={s.results}>
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => update({ phase: "detail", index: i })}
              >
                {id !== "relic" && scenario !== "image" ? (
                  <CharacterCard variant={definitions[r.entry.id]} />
                ) : (
                  <Art
                    src={r.entry.art}
                    name={r.entry.name}
                    broken={scenario === "image"}
                  />
                )}
                <b>{r.entry.name}</b>
                <small>
                  {r.duplicate ? "기존 보유 · 조각 +" + banner.shards : "NEW"} ·
                  상세 보기
                </small>
              </button>
            ))}
          </div>
        </>
      )}
      {phase === "detail" && (
        <>
          <div className={s.banner}>
            {id !== "relic" && scenario !== "image" ? (
              <CharacterCard variant={definitions[result.entry.id]} />
            ) : (
              <Art
                src={result.entry.art}
                name={result.entry.name}
                broken={scenario === "image"}
              />
            )}
            <div>
              <small>
                {banner.label} · {"★".repeat(result.entry.stars)}
              </small>
              <p>{result.entry.role}</p>
              <b>
                {result.duplicate
                  ? "중복 보상 · 실험용 조각 " + banner.shards + "개"
                  : "NEW · 첫 실험 획득"}
              </b>
              {result.guaranteed && <p>픽업 보장 적용</p>}
            </div>
          </div>
          <div className={s.actions}>
            {id !== "relic" && (
              <button onClick={() => go("cast", result.ownedId)}>
                동료 상세 열기
              </button>
            )}
            <button onClick={() => update({ phase: "results" })}>
              결과 목록
            </button>
            <button
              onClick={() =>
                go(id !== "relic" ? "team" : "relic", result.ownedId)
              }
            >
              {id !== "relic" ? "편성" : "예장 장착 안내"}{" "}
              <ArrowRight size={16} />
            </button>
          </div>
        </>
      )}
      {["error", "results", "detail"].includes(phase) && (
        <button onClick={() => update({ ...initial, id, scenario })}>
          배너로 돌아가기
        </button>
      )}
    </div>
  );
}
