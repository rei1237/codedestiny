"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowLeft,
  Check,
  Feather,
  Flame,
  Flower2,
  Layers,
  MoonStar,
  RotateCcw,
  Swords,
  Target,
} from "lucide-react";
import { loadCollection, type Collection } from "./collection";
import { definitions } from "./formation";
import {
  encounters,
  getActions,
  previewChain,
  resolveTurn,
  skillDefinitions,
  swapReserve,
  activateSkill,
  type Battle,
  type BattleEvent,
  type EncounterId,
} from "./battle";
import {
  beginBattle,
  checkpoint,
  closeBattle,
  departure,
  restoreBattle,
  type BattleSave,
} from "./battle-session";
import {
  choreography,
  isStrike,
  positionStrike,
  usesProjectile,
} from "./battle-choreography";
import BattleActor, {
  BattleCutIn,
  BattleEmblem,
  FinisherImpact,
  battleActorSheet,
} from "./BattleActor";
import { finishCampaignBattle, isStorySupportQuest } from "./campaign";
import s from "./battle.module.css";

type Props = {
  scope: string;
  requested?: { encounter: EncounterId; questId: string; preset?: number };
  home: () => void;
  team: () => void;
  returnQuest: (id: string) => void;
  still: boolean;
  sound: boolean;
};
type Playback = { before: Battle; events: BattleEvent[]; index: number };
const icons = { Quick: Feather, Arts: MoonStar, Buster: Flame };

function errorText(e: unknown) {
  return e instanceof Error
    ? e.message
    : "저장에 실패했어요. 다시 시도해 주세요.";
}
function point(b: Battle) {
  return b.enemies.find((e) => e.hp > 0)?.id ?? "";
}
const characterPitch: Partial<Record<string, number>> = {
  yeon: 587,
  neo: 440,
  moka: 294,
  yun: 392,
  pje: 330,
  ln: 659,
};
function chime(ctx: AudioContext, event: BattleEvent, voice?: string) {
  try {
    if (ctx.state !== "running" || document.hidden) return;
    const pitch = characterPitch[voice ?? ""] ?? 494;
    const gain = ctx.createGain(),
      tone = ctx.createOscillator();
    tone.type = event.kind === "hit" ? "triangle" : "sine";
    tone.frequency.setValueAtTime(
      event.kind === "hit"
        ? 170
        : pitch *
            (event.type === "Buster" ? 0.5 : event.type === "Quick" ? 1.5 : 1),
      ctx.currentTime,
    );
    tone.frequency.exponentialRampToValueAtTime(
      event.kind === "hit" ? 80 : 330,
      ctx.currentTime + 0.12,
    );
    gain.gain.setValueAtTime(0.035, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    tone.connect(gain);
    gain.connect(ctx.destination);
    tone.onended = () => {
      tone.disconnect();
      gain.disconnect();
    };
    tone.start();
    tone.stop(ctx.currentTime + 0.17);
  } catch {}
}
export default function BattleScreen({
  scope,
  requested,
  home,
  team,
  returnQuest,
  still,
  sound,
}: Props) {
  const [data, setData] = useState<Collection | null>(null),
    [b, setBattle] = useState<Battle | null>(null),
    [save, setSave] = useState<BattleSave | null>(null);
  const [preset, setPreset] = useState(requested?.preset ?? 0),
    [enc, setEnc] = useState<EncounterId>(requested?.encounter ?? "tutorial");
  const [target, aim] = useState(""),
    [picked, pick] = useState<string[]>([]),
    [actor, focus] = useState(""),
    [tools, openTools] = useState(false),
    [log, openLog] = useState(false);
  const [play, animate] = useState<Playback | null>(null),
    [fast, speed] = useState(false),
    [simple, simplify] = useState(still),
    [osReduce, systemMotion] = useState(false);
  const [busy, wait] = useState(false),
    [error, fail] = useState(""),
    [askExit, retreat] = useState(false);
  const latch = useRef(false);
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (!sound) return;
    const unlock = () => {
      if (document.hidden) return;
      try {
        const ctx = (audio.current ??= new AudioContext());
        if (ctx.state === "suspended") void ctx.resume().catch(() => {});
      } catch {
        /* Audio output is optional. */
      }
    };
    const suspend = () => {
      if (document.hidden && audio.current?.state === "running")
        void audio.current.suspend().catch(() => {});
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    document.addEventListener("visibilitychange", suspend);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", suspend);
      const ctx = audio.current;
      audio.current = null;
      if (ctx && ctx.state !== "closed") void ctx.close().catch(() => {});
    };
  }, [sound]);
  const minimal = simple || osReduce;
  const [entering, enter] = useState(false);
  useEffect(() => {
    if (!entering) return;
    const t = setTimeout(() => enter(false), 550);
    return () => clearTimeout(t);
  }, [entering]);
  const quest = requested?.questId ?? "",
    support = !!quest && isStorySupportQuest(quest);
  const load = useCallback(async () => {
    const c = await loadCollection(scope);
    setData(c);
    setSave(c.battle ?? null);
    const active = c.battle ? restoreBattle(c.battle) : null;
    setBattle(active);
    aim(active ? point(active) : "");
    pick([]);
    animate(null);
    fail("");
  }, [scope]);
  useEffect(() => {
    let live = true;
    loadCollection(scope)
      .then((c) => {
        if (!live) return;
        setData(c);
        if (c.battle) {
          setSave(c.battle);
          const state = restoreBattle(c.battle);
          setBattle(state);
          aim(point(state));
        }
      })
      .catch((e) => {
        if (live) fail(errorText(e));
      });
    return () => {
      live = false;
    };
  }, [scope]);
  useEffect(() => {
    const q = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => systemMotion(q.matches);
    sync();
    q.addEventListener("change", sync);
    return () => q.removeEventListener("change", sync);
  }, []);
  const fieldRef = useRef<HTMLDivElement>(null);
  const [contact, setContact] = useState<{
    event: BattleEvent;
    count: number;
  } | null>(null);
  const event = play?.events[play.index];
  const caster = play?.before.allies.find(
    (a) => a.combatantId === event?.actorId,
  );
  const ranged =
    !!event && usesProjectile(caster?.baseCharacterId ?? "", event);
  const timing = event && choreography(event, fast);
  const landed = event && contact?.event === event ? contact.count : 0;
  const hit = landed ? timing?.contacts[landed - 1] : undefined;
  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field || !event || !isStrike(event) || minimal) return;
    const place = () => positionStrike(field, event, ranged);
    place();
    const observer = new ResizeObserver(place);
    observer.observe(field);
    return () => observer.disconnect();
  }, [event, ranged, minimal]);
  useEffect(() => {
    if (!play) return;
    if (minimal) {
      animate(null);
      return;
    }
    if (!event) return;
    const { duration, contacts } = choreography(event, fast);
    const cues = contacts.map(({ at }, i) =>
      setTimeout(() => {
        setContact({ event, count: i + 1 });
        if (sound && audio.current)
          chime(audio.current, event, caster?.baseCharacterId);
      }, at),
    );
    const timer = setTimeout(
      () =>
        animate(
          play.index + 1 < play.events.length
            ? { ...play, index: play.index + 1 }
            : null,
        ),
      duration,
    );
    return () => {
      clearTimeout(timer);
      cues.forEach(clearTimeout);
    };
  }, [play, fast, minimal, sound, event, caster]);
  async function run(fn: () => Promise<void>) {
    if (latch.current) return;
    latch.current = true;
    wait(true);
    fail("");
    try {
      await fn();
    } catch (e) {
      fail(errorText(e));
    } finally {
      latch.current = false;
      wait(false);
    }
  }
  function launch(practice: boolean) {
    void run(async () => {
      const result = await beginBattle(
        scope,
        preset,
        enc,
        quest,
        support,
        practice,
      );
      enter(true);
      setSave(result.save);
      setBattle(result.b);
      aim(point(result.b));
      pick([]);
      focus("");
    });
  }
  function command(make: () => Battle) {
    if (!b || !save || play) return;
    void run(async () => {
      const next = make();
      const stored = await checkpoint(scope, save.id, b.inputs.length, next);
      setSave(stored);
      setBattle(next);
      pick([]);
      aim(
        next.enemies.some((e) => e.id === target && e.hp > 0)
          ? target
          : point(next),
      );
      openTools(false);
      const events = next.events.filter((e) => e.kind !== "deal");
      if (events.length && !minimal) animate({ before: b, events, index: 0 });
    });
  }
  function finish() {
    if (!save) return;
    void run(async () => {
      if (b && save.questId && b.status !== "playing")
        await finishCampaignBattle(
          scope,
          save.questId,
          save.id,
          b.status === "victory",
        );
      await closeBattle(scope, save.id);
      if (save.questId) returnQuest(save.questId);
      else home();
    });
  }
  const alert = error && (
    <div role="alert" className={s.alert}>
      {error} <button onClick={() => void run(load)}>다시 불러오기</button>
    </div>
  );
  if (!b || !save) {
    let issue = "",
      snapshot;
    try {
      if (data)
        snapshot = departure(data, preset, enc, support, !!quest && !support);
    } catch (e) {
      issue = errorText(e);
    }
    return (
      <section className={s.brief}>
        <div className={s.briefPanel}>
          <small>출전 준비</small>
          <h1>{encounters[enc].name}</h1>
          <p>{encounters[enc].description}</p>
          {!quest && (
            <label>
              전장
              <select
                value={enc}
                onChange={(e) => setEnc(e.target.value as EncounterId)}
              >
                {Object.entries(encounters).map(([k, v]) => (
                  <option value={k} key={k}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {quest ? (
            <p>
              {support
                ? "이야기 전용 지원 · 연이와 고양이 영냥이"
                : "의뢰 대여 편성 · 모카(세 번째 알람), 연이, 영냥이"}
            </p>
          ) : (
            <label>
              저장 편성
              <select
                value={preset}
                onChange={(e) => setPreset(+e.target.value)}
              >
                <option value={0}>편성 1</option>
                <option value={1}>편성 2</option>
              </select>
            </label>
          )}
          {snapshot && (
            <div className={s.names}>
              {snapshot.slice(0, 3).map((u, i) => (
                <span key={i}>
                  {u ? definitions[u.battleVariantId].name : "빈 슬롯"}
                </span>
              ))}
            </div>
          )}
          <p>
            {issue ||
              (data ? "선택 순서대로 최대 세 번 행동합니다." : "편성 확인 중…")}
          </p>
          <div className={s.controls}>
            <button
              disabled={!data || !!issue || busy}
              onClick={() => launch(false)}
            >
              <Swords />
              출전
            </button>
            <button onClick={team}>편성 열기</button>
            {issue &&
              (enc === "tutorial" || enc === "rehearsal" || !!quest) && (
                <button disabled={busy} onClick={() => launch(true)}>
                  모카와 임시 지원으로 연습
                </button>
              )}
          </div>
          {alert}
          {save && error && <button onClick={finish}>이 연습 종료</button>}
        </div>
      </section>
    );
  }
  const front = b.allies
    .filter((a) => a.hp > 0 && a.position >= 0 && a.position < 3)
    .sort((a, c) => a.position - c.position);
  function displayHp(id: string, hp: number) {
    return !play
      ? hp
      : Math.max(
          0,
          hp -
            play.events
              .slice(0, play.index)
              .filter(
                (e) =>
                  e.targetId === id &&
                  ["attack", "extra", "ultimate", "hit"].includes(e.kind),
              )
              .reduce((sum, e) => sum + e.amount, 0) -
            (event?.targetId === id
              ? (timing?.contacts
                  .slice(0, landed)
                  .reduce((sum, c) => sum + c.amount, 0) ?? 0)
              : 0),
        );
  }
  function displayGauge(id: string, initial: number) {
    if (!play) return initial;
    const through =
      play.index + Number(landed > 0 && landed === timing?.contacts.length);
    return play.events
      .slice(0, through)
      .reduce(
        (g, e) => (e.actorId === id ? (e.actorGaugeAfter ?? g) : g),
        initial,
      );
  }
  const shown = play?.before ?? b,
    field = shown.allies
      .filter((a) => a.position >= 0 && a.position < 3)
      .sort((a, c) => a.position - c.position);
  const action = getActions(b),
    available = new Set(action.map((c) => c.id)),
    cards = play
      ? play.before.hand
      : [...b.hand, ...action.filter((c) => c.ultimate)];
  const selected = picked.flatMap((id) => cards.filter((c) => c.id === id)),
    chain = previewChain(selected);
  const specials = (play ? getActions(shown) : action).filter(
    (c) => c.ultimate,
  );
  const fighter = front.find((a) => a.combatantId === actor) ?? front[0];
  const locked = busy || !!play;
  const markedTarget =
    event && shown.enemies.some((e) => e.id === event.targetId)
      ? event.targetId
      : target;
  const castName =
    caster && event?.kind === "ultimate"
      ? definitions[caster.battleVariantId].ultimate
      : undefined;
  const playbackCaption = !event
    ? ""
    : !isStrike(event) || landed === timing?.contacts.length
      ? event.text
      : [
          caster?.name ??
            shown.enemies.find((e) => e.id === event.actorId)?.name,
          castName ??
            (event.kind === "hit"
              ? "공격"
              : event.kind === "extra"
                ? "추가 공격"
                : event.type),
        ]
          .filter(Boolean)
          .join(" · ");
  function toggle(id: string) {
    pick((old) =>
      old.includes(id)
        ? old.filter((x) => x !== id)
        : old.length < 3
          ? [...old, id]
          : old,
    );
  }
  return (
    <section className={s.arena} data-playing={!!play} data-quiet={minimal}>
      <header className={s.head}>
        <div>
          <small>
            달빛 전장 · {shown.wave} /{" "}
            {encounters[shown.encounter].waves.length} 웨이브
          </small>
          <h1>{encounters[shown.encounter].name}</h1>
        </div>
        <span>{shown.turn}턴</span>
        <button aria-label="전투 기록" onClick={() => openLog(!log)}>
          <Layers size={18} />
        </button>
        <button disabled={!!play} onClick={() => speed(!fast)}>
          {fast ? "2×" : "1×"}
        </button>
        <button onClick={() => simplify(!simple)} aria-pressed={minimal}>
          간소
        </button>
        <button onClick={() => retreat(true)} aria-label="전투 종료">
          <ArrowLeft size={18} />
        </button>
      </header>
      <div
        className={s.field}
        ref={fieldRef}
        data-finisher={event?.kind === "ultimate"}
        style={
          { "--action-time": (timing?.duration ?? 540) + "ms" } as CSSProperties
        }
      >
        {ranged && caster && event && isStrike(event) && !minimal && (
          <div
            key={play?.index}
            className={s.flight}
            data-person={caster.baseCharacterId}
            aria-hidden="true"
          >
            <BattleEmblem person={caster.baseCharacterId} />
          </div>
        )}
        {event?.kind === "ultimate" &&
          !minimal &&
          field
            .filter((a) => a.combatantId === event.actorId)
            .map((a) => (
              <BattleCutIn key={a.combatantId} unit={a} fast={fast} />
            ))}
        <div className={s.squad}>
          {field.map((a) => {
            const id = a.combatantId;
            const motion = play?.events
              .slice(0, play.index + 1)
              .some((e) => e.kind === "down" && e.targetId === id)
              ? "down"
              : event?.kind === "hit" && event.targetId === id && landed > 0
                ? event.heavy
                  ? "heavy"
                  : "hit"
                : event?.actorId === id
                  ? event.kind === "skill"
                    ? "skill"
                    : event.kind === "ultimate"
                      ? "ultimate"
                      : isStrike(event)
                        ? (event.type ?? "Buster")
                        : "idle"
                  : b.status === "victory" && !play
                    ? "victory"
                    : entering
                      ? "enter"
                      : "idle";
            return (
              <div
                key={id}
                className={s.unit}
                data-fighter={id}
                data-striking={event?.actorId === id && isStrike(event)}
              >
                <BattleActor
                  key={
                    event?.actorId === id || event?.targetId === id
                      ? b.inputs.length + "-" + play?.index
                      : id
                  }
                  unit={a}
                  duration={
                    event?.actorId === id ? timing?.duration : undefined
                  }
                  hits={event?.actorId === id ? event.hits : undefined}
                  motion={motion}
                  still={minimal}
                  fast={fast}
                />
                {event?.targetId === id && hit && hit.amount > 0 && (
                  <b className={s.damage} key={landed}>
                    −{hit.amount}
                  </b>
                )}
              </div>
            );
          })}
        </div>
        <div className={s.foes}>
          {shown.enemies.map((e, i) => {
            const struck = event?.targetId === e.id && !!hit;
            return (
              <button
                key={e.id}
                data-fighter={e.id}
                data-attacking={event?.actorId === e.id && event.kind === "hit"}
                data-struck={struck}
                className={s.enemy}
                disabled={locked || !e.hp}
                aria-pressed={markedTarget === e.id}
                aria-label={"표적 " + e.name}
                onClick={() => aim(e.id)}
              >
                <div className={s.gauge}>
                  <b>
                    {markedTarget === e.id && <Target size={12} />} {e.name}
                  </b>
                  <meter max={e.maxHp} value={displayHp(e.id, e.hp)} />
                  <small>
                    {e.exposed > 0 && "약점 노출 · "}
                    {displayHp(e.id, e.hp)} HP ·{" "}
                    {e.charge >= 2 ? "강공격 예고" : "차지 " + e.charge + "/2"}
                  </small>
                </div>
                <img
                  key={
                    event?.actorId === e.id
                      ? "attack-" + play?.index
                      : struck
                        ? "impact-image-" + play?.index + "-" + landed
                        : e.id
                  }
                  alt=""
                  src={
                    "/images/card-rpg/crane-" +
                    (e.boss
                      ? "gold"
                      : e.name.includes("먹빛")
                        ? "ink"
                        : "rose") +
                    ".webp"
                  }
                />
                {struck && event?.kind === "ultimate" && caster && !minimal && (
                  <FinisherImpact
                    key={play?.index + "-burst-" + landed}
                    unit={caster}
                    fast={fast}
                  />
                )}
                {struck && hit && hit.amount > 0 && (
                  <b className={s.damage} key={play?.index + "-" + landed}>
                    {event.critical ? "✦ " : ""}
                    {hit.amount}
                  </b>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className={s.allies}>
        {(play ? field : front).map((a) => (
          <button
            key={a.combatantId}
            disabled={locked || b.status !== "playing"}
            onClick={() => {
              focus(a.combatantId);
              openTools(true);
            }}
          >
            <b>{a.name} · 스킬</b>{" "}
            <small>
              HP {displayHp(a.combatantId, a.hp)}/{a.maxHp} · 운명{" "}
              {displayGauge(a.combatantId, a.gauge)}%
            </small>
            <i
              style={{
                width: (100 * displayHp(a.combatantId, a.hp)) / a.maxHp + "%",
              }}
            />
          </button>
        ))}
      </div>
      {b.status === "playing" || play ? (
        <div className={s.command}>
          {specials.length > 0 && (
            <div
              className={s.specials}
              role="group"
              aria-label="사용 가능한 운명해방"
            >
              {specials.map((c) => {
                const unit = field.find((a) => a.combatantId === c.actorId)!;
                const name = definitions[unit.battleVariantId].ultimate;
                const I = icons[c.type];
                const order = picked.indexOf(c.id);
                return (
                  <button
                    key={c.id}
                    aria-pressed={order >= 0}
                    disabled={locked || (order < 0 && picked.length >= 3)}
                    onClick={() => toggle(c.id)}
                    aria-label={unit.name + " 운명해방 " + name + " " + c.type}
                  >
                    <I size={16} />
                    <span>
                      <small>
                        {unit.name} · {c.type} 해방
                      </small>
                      <strong>{name}</strong>
                    </span>
                    {order >= 0 && <b>{order + 1}</b>}
                  </button>
                );
              })}
            </div>
          )}
          <div className={s.cards}>
            {cards
              .filter((c) => !c.ultimate)
              .map((c) => {
                const a = b.allies.find((a) => a.combatantId === c.actorId)!;
                const I = icons[c.type],
                  idx = picked.indexOf(c.id);
                return (
                  <button
                    key={c.id}
                    className={s.card}
                    data-type={c.type}
                    aria-pressed={idx >= 0}
                    disabled={
                      locked ||
                      !available.has(c.id) ||
                      (idx < 0 && picked.length >= 3)
                    }
                    aria-label={
                      a.name + " " + c.type + " · 치명 " + c.chance + "%"
                    }
                    onClick={() => toggle(c.id)}
                  >
                    <span
                      className={s.cardPortrait}
                      style={{
                        backgroundImage: "url(" + battleActorSheet(a) + ")",
                      }}
                    />
                    <small>
                      {a.name} · {c.chance}%
                    </small>
                    <b>
                      <I />
                      {c.type}
                    </b>
                    {idx >= 0 && <em>{idx + 1}</em>}
                  </button>
                );
              })}
          </div>
          <div className={s.order}>
            <span aria-live="polite">
              {play
                ? playbackCaption
                : chain.join(" · ") ||
                  selected
                    .map((c) =>
                      c.ultimate
                        ? definitions[
                            b.allies.find((a) => a.combatantId === c.actorId)!
                              .battleVariantId
                          ].ultimate
                        : c.type,
                    )
                    .join(" → ") ||
                  (b.turn === 1
                    ? "퀵은 치명타, 아츠는 게이지, 버스터는 피해"
                    : "행동 순서대로 선택")}
            </span>
            {play ? (
              <button onClick={() => animate(null)}>연출 건너뛰기</button>
            ) : (
              <>
                <button
                  aria-label="선택 취소"
                  disabled={!picked.length || busy}
                  onClick={() => pick([])}
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  className={s.confirm}
                  disabled={busy || (!picked.length && !!action.length)}
                  onClick={() => command(() => resolveTurn(b, picked, target))}
                >
                  <Check size={17} />
                  {picked.length
                    ? picked.length + "장 확정"
                    : action.length
                      ? "카드 선택"
                      : "턴 넘기기"}
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className={s.result}>
          <Flower2 />
          <h2>{b.status === "victory" ? "승리" : "패배"}</h2>
          <span>
            {b.turn}턴 · {encounters[b.encounter].name}
          </span>
          <button disabled={busy} onClick={finish}>
            {save.questId ? "이야기·의뢰로 돌아가기" : "결과 확인 · 로비로"}
          </button>
        </div>
      )}
      {save.questId === "event.lantern" && (
        <div className={s.rhythm} aria-label="모카의 박자 릴">
          {[0, 1, 2].map((i) => {
            const id = play ? b.inputs.at(-1) : undefined;
            const c =
              play && id?.kind === "turn"
                ? getActions(play.before).find((c) => c.id === id.ids[i])
                : selected[i];
            const Icon = c ? icons[c.type] : Flower2;
            return (
              <span
                key={i}
                data-roll={!!play && !minimal}
                style={{ animationDelay: i * 0.08 + "s" }}
              >
                <Icon size={15} />
                {c?.type ?? "·"}
              </span>
            );
          })}
        </div>
      )}
      {alert}
      {((tools && fighter) || log || askExit) && (
        <div className={s.shade}>
          <section
            role="dialog"
            aria-label={
              askExit ? "전투 종료" : log ? "전투 기록" : "스킬과 교대"
            }
            className={s.sheet}
          >
            {askExit ? (
              <>
                <h2>현재 전투를 종료할까요?</h2>
                <p>로비로 잠시 나가면 같은 턴에서 이어갈 수 있어요.</p>
                <button onClick={home}>진행 저장 · 로비로</button>
                <button disabled={busy} onClick={finish}>
                  전투 종료
                </button>
              </>
            ) : log ? (
              <>
                <h2>전투 기록</h2>
                {b.log.map((l, i) => (
                  <p key={i}>{l}</p>
                ))}
              </>
            ) : (
              fighter && (
                <>
                  <h2>{fighter.name}의 행동</h2>
                  {skillDefinitions(
                    fighter.battleVariantId,
                    fighter.skillLevel,
                  ).map((sk, i) => (
                    <button
                      key={i}
                      disabled={
                        busy || fighter.cooldowns[i] > 0 || fighter.stunned > 0
                      }
                      onClick={() =>
                        command(() =>
                          activateSkill(b, fighter.combatantId, i, target),
                        )
                      }
                    >
                      <strong>
                        {sk.name} · {fighter.cooldowns[i] || sk.cooldown}턴
                      </strong>
                      <small>{sk.description}</small>
                    </button>
                  ))}
                  {b.allies
                    .filter((a) => a.position >= 3 && a.hp > 0)
                    .map((r) => (
                      <button
                        key={r.combatantId}
                        disabled={busy || b.swapped}
                        onClick={() =>
                          command(() =>
                            swapReserve(b, fighter.combatantId, r.combatantId),
                          )
                        }
                      >
                        {r.name}와 교대
                      </button>
                    ))}
                </>
              )
            )}
            <button
              onClick={() => {
                openTools(false);
                openLog(false);
                retreat(false);
              }}
            >
              닫기
            </button>
          </section>
        </div>
      )}
    </section>
  );
}
