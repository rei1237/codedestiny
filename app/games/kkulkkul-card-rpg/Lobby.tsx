"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  CircleHelp,
  Gem,
  Layers,
  LockKeyhole,
  Mail,
  Menu,
  MoonStar,
  Music2,
  Orbit,
  Settings,
  Shield,
  Swords,
  Users,
} from "lucide-react";
import {
  companions,
  GAME_TITLE,
  pending,
  screens,
  type Screen,
} from "./catalog";
import BattleScreen from "./BattleScreen";
import type { EncounterId } from "./battle";
import StoryCampaign from "./StoryCampaign";
import Growth from "./GrowthScreen";
import CollectionViews from "./CollectionViews";
import { sceneById } from "./campaign-data";
import { loadCollection } from "./collection";
import { wardrobeKey } from "./battle-appearance";
import SummonPreview from "./SummonPreview";
import { Dialogue, Portrait, NovelLine } from "./Dialogue";
import { usePlayer } from "./usePlayer";
import s from "./lobby.module.css";
import book from "./story-entry.module.css";

const dock = [
  { id: "team", Icon: Shield },
  { id: "cast", Icon: Users },
  { id: "relic", Icon: Layers },
  { id: "growth", Icon: Swords },
  { id: "summon", Icon: Orbit },
  { id: "menu", Icon: Menu },
] as const;
const defaults = {
  sound: false,
  large: false,
  still: false,
  hero: 0,
  heroVariant: "",
};
const storageKey = "kkulkkul-card-rpg.lobby.v1";

function readScreen(): Screen {
  const hash = location.hash.slice(1);
  return Object.prototype.hasOwnProperty.call(screens, hash)
    ? (hash as Screen)
    : "home";
}

export default function Lobby({
  opening,
}: {
  opening: { id: string; text: string; speaker: string }[];
}) {
  const player = usePlayer();
  const [screen, setScreen] = useState<Screen>("home");
  const [prefs, setPrefs] = useState(defaults);
  const [warning, setWarning] = useState("");
  const [line, setLine] = useState(0);
  const [beat, setBeat] = useState(0);
  const [target, setTarget] = useState({ scope: "", screen: "", ownedId: "" });
  const [met, setMet] = useState("");
  function openOwned(screen: "cast" | "team" | "relic", ownedId: string) {
    setTarget({ screen, ownedId, scope: player.scope });
    go(screen);
  }
  const title = useRef<HTMLHeadingElement>(null);
  const hero = companions[prefs.hero];
  const heroVariant = prefs.heroVariant || hero.speaker + "-base";
  const [bookmark, setBookmark] = useState({ scope: "", node: "" });
  const nextScene =
    bookmark.scope === player.scope ? sceneById[bookmark.node] : undefined;
  const [look, setLook] = useState({ scope: "", variant: "", key: "" });
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "development" ||
      !player.scope ||
      screen !== "home"
    )
      return;
    let current = true;
    loadCollection(player.scope)
      .then((data) => {
        if (current)
          setBookmark({
            scope: player.scope,
            node: data.campaign?.read.length ? data.campaign.node : "",
          });
        const unit = data.units.find((u) => u.battleVariantId === heroVariant);
        if (current)
          setLook({
            scope: player.scope,
            variant: heroVariant,
            key: unit
              ? wardrobeKey(hero.speaker, heroVariant, unit.costumeId)
              : "",
          });
      })
      .catch(() => {
        if (current) setLook({ scope: "", variant: "", key: "" });
      });
    return () => {
      current = false;
    };
  }, [player.scope, screen, hero.speaker, heroVariant]);
  const checkpointKey = player.scope
    ? storageKey + ".opening." + player.scope
    : "";
  useEffect(() => {
    try {
      const id = checkpointKey && localStorage.getItem(checkpointKey);
      setBeat(
        Math.max(
          0,
          opening.findIndex((scene) => scene.id === id),
        ),
      );
    } catch {
      setBeat(0);
      setWarning("이 기기의 읽던 위치를 불러올 수 없어요.");
    }
  }, [checkpointKey, opening]);
  useEffect(() => {
    if (!checkpointKey) return;
    try {
      if (screen === "story")
        localStorage.setItem(checkpointKey + ".visited", "1");
      setMet(
        localStorage.getItem(checkpointKey + ".visited") ||
          localStorage.getItem(checkpointKey)
          ? player.scope
          : "",
      );
    } catch {
      setMet(screen === "story" ? player.scope : "");
    }
  }, [checkpointKey, player.scope, screen]);
  function turnPage(next: number) {
    setBeat(next);
    if (checkpointKey) {
      try {
        localStorage.setItem(checkpointKey, opening[next].id);
      } catch {
        setWarning("읽던 위치를 이 기기에 저장할 수 없어요.");
      }
    }
  }
  useEffect(() => {
    const sync = () => setScreen(readScreen());
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      setPrefs({
        heroVariant:
          typeof saved.heroVariant === "string" ? saved.heroVariant : "",
        hero:
          Number.isInteger(saved.hero) && companions[saved.hero]
            ? saved.hero
            : 0,
        sound: saved.sound === true,
        large: saved.large === true,
        still: saved.still === true,
      });
    } catch {
      setWarning("이 기기의 설정을 불러올 수 없어요.");
    }
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, [screen]);
  function save(next: typeof prefs) {
    setPrefs(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setWarning("");
    } catch {
      setWarning("이번 화면에만 적용했어요. 기기에 저장할 수 없어요.");
    }
  }
  function chime() {
    if (!prefs.sound) return;
    try {
      const ctx = new AudioContext(),
        tone = ctx.createOscillator(),
        gain = ctx.createGain();
      tone.frequency.value = 587;
      gain.gain.setValueAtTime(0.035, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      tone.connect(gain);
      gain.connect(ctx.destination);
      tone.onended = () => {
        void ctx.close();
      };
      tone.start();
      tone.stop(ctx.currentTime + 0.13);
    } catch {
      /* Audio may be unavailable on this device. */
    }
  }
  function go(
    id: Screen,
    request?: { encounter: EncounterId; questId: string; preset?: number },
  ) {
    if (id === screen) return;
    chime();
    history.pushState(
      { cardRpgFrom: screen, battleRequest: request },
      "",
      "#" + id,
    );
    setScreen(id);
  }
  function back() {
    if (screen === "home") {
      location.assign("/");
      return;
    }
    if (history.state?.cardRpgFrom) {
      history.back();
      return;
    }
    history.replaceState(null, "", "#home");
    setScreen("home");
  }
  function chooseHero(id: number, battleVariantId?: string) {
    save({
      ...prefs,
      hero: id,
      heroVariant: battleVariantId || companions[id].speaker + "-base",
    });
    setLine(0);
  }
  const shortcut = (id: Screen) => (
    <button key={id} className={s.row} onClick={() => go(id)}>
      {screens[id]} <ChevronRight size={18} />
    </button>
  );
  return (
    <main
      data-dev={process.env.NODE_ENV === "development"}
      className={s.game}
      data-still={prefs.still}
      data-large={prefs.large}
    >
      <header className={s.top}>
        <button
          aria-label={screen === "home" ? "서비스 복귀" : "뒤로"}
          onClick={back}
        >
          <ArrowLeft />
        </button>
        <div className={s.brand}>
          <MoonStar />
          <span>{GAME_TITLE}</span>
        </div>
        <div className={s.player}>
          <b>{player.name}</b>
          <small>계정 레벨 · {player.level}</small>
        </div>
        <div className={s.wallet}>
          <Gem />
          <span>
            월정석 <b>{player.balance}</b>
          </span>
        </div>
        <button aria-label="우편" onClick={() => go("mail")}>
          <Mail />
        </button>
        <button aria-label="설정" onClick={() => go("settings")}>
          <Settings />
        </button>
      </header>
      <p className={s.rotate}>가로로 돌리면 전장을 넓게 볼 수 있어요.</p>
      {screen === "home" ? (
        <section className={s.stage} aria-label="게임 로비">
          <Dialogue
            key={hero.name + line}
            index={prefs.hero}
            wardrobe={
              look.scope === player.scope && look.variant === heroVariant
                ? look.key
                : ""
            }
            line={line}
            still={prefs.still}
            next={() => setLine((line + 1) % hero.lines.length)}
            swap={() => chooseHero((prefs.hero + 1) % companions.length)}
          />
          <div className={s.quests}>
            <article className={s.storyCard}>
              <span className={s.kicker}>
                <BookOpen size={14} /> MAIN STORY
              </span>
              <small>
                {nextScene
                  ? nextScene.chapter + " · 읽던 장면"
                  : "프롤로그 · " +
                    (beat === 0 ? "첫 장면" : "읽던 문장 " + (beat + 1))}
              </small>
              <h1 tabIndex={-1} ref={title}>
                {nextScene ? (
                  nextScene.title
                ) : (
                  <>
                    이상한 앱이
                    <br />
                    깔렸다
                  </>
                )}
              </h1>
              <button
                className={s.gold}
                onClick={() => go(nextScene ? "campaign" : "story")}
              >
                이야기 이어하기 <ArrowRight size={20} />
              </button>
            </article>
            <div className={s.exits}>
              {process.env.NODE_ENV === "development" && (
                <button className={s.event} onClick={() => go("battle")}>
                  <Swords />
                  <span>
                    <b>달빛 전장</b>
                    <small>저장 편성 출전</small>
                  </span>
                </button>
              )}
              <button className={s.event} onClick={() => go("event")}>
                <Music2 />
                <span>
                  <b>축제의 무대</b>
                  <small>
                    {process.env.NODE_ENV === "development"
                      ? "의뢰와 해금 조건"
                      : "EP.12 완료 후 해금 · 준비 중"}
                  </small>
                </span>
              </button>
            </div>
          </div>
        </section>
      ) : screen === "battle" && process.env.NODE_ENV === "development" ? (
        player.scope ? (
          <BattleScreen
            key={player.scope}
            scope={player.scope}
            requested={
              typeof window !== "undefined"
                ? history.state?.battleRequest
                : undefined
            }
            still={prefs.still}
            sound={prefs.sound}
            home={() => go("home")}
            team={() => go("team")}
            returnQuest={(id) =>
              go(id.startsWith("chapter1.") ? "campaign" : "event")
            }
          />
        ) : (
          <p>계정 상태 확인 중</p>
        )
      ) : screen === "story" ? (
        <section className={book.spread} aria-labelledby="story-entry-title">
          <figure className={book.coverScene}>
            <div className={book.cover}>
              <img
                src="/images/novel/yeoni-youngyangi-hero-v1.webp"
                width="1024"
                height="1536"
                alt="꽃 사이에서 별빛 도시를 바라보는 연이와 영냥이의 소설 표지"
              />
              <span className={book.coverTitle}>운명의 연대기</span>
            </div>
          </figure>
          <article className={book.paper}>
            <header className={book.chapter}>
              <small>
                <MoonStar size={16} aria-hidden="true" /> 프롤로그
              </small>
              <h1 id="story-entry-title" tabIndex={-1} ref={title}>
                이상한 앱이 깔렸다
              </h1>
            </header>
            <div
              key={opening[beat].id}
              className={book.passage}
              tabIndex={0}
              aria-label="현재 문장"
            >
              <NovelLine {...opening[beat]} still={prefs.still} />
            </div>
            <footer className={book.controls}>
              <span
                aria-label={`도입부 미리보기 ${beat + 1} / ${opening.length}문장`}
              >
                <BookOpen size={16} aria-hidden="true" />{" "}
                {String(beat + 1).padStart(2, "0")} /{" "}
                {String(opening.length).padStart(2, "0")}
              </span>
              <button
                disabled={!beat}
                onClick={() => turnPage(beat - 1)}
                aria-label="이전 문장"
              >
                <ArrowLeft size={18} />
              </button>
              {process.env.NODE_ENV === "development" &&
                beat === opening.length - 1 && (
                  <button onClick={() => go("campaign")}>
                    본편 시작 · 비겁의 섬
                  </button>
                )}
              {beat + 1 < opening.length ? (
                <button
                  className={book.forward}
                  onClick={() => turnPage(beat + 1)}
                >
                  다음 문장 <ArrowRight size={16} />
                </button>
              ) : (
                <a className={book.forward} href="/codedestiny-novel.html">
                  원작 뷰어 열기 <ArrowRight size={16} />
                </a>
              )}
            </footer>
          </article>
        </section>
      ) : (
        <section className={s.sub} key={screen}>
          <div className={s.panel} data-screen={screen}>
            <h1 tabIndex={-1} ref={title}>
              {screens[screen]}
            </h1>
            {process.env.NODE_ENV === "development" &&
              (screen === "cast" || screen === "team" || screen === "relic") &&
              (player.scope ? (
                <CollectionViews
                  key={player.scope + screen}
                  scope={player.scope}
                  screen={screen}
                  target={
                    target.scope === player.scope && target.screen === screen
                      ? target.ownedId
                      : ""
                  }
                  hero={prefs.hero}
                  chooseHero={chooseHero}
                  heroVariant={heroVariant}
                  depart={(preset) =>
                    go("battle", { preset, encounter: "tutorial", questId: "" })
                  }
                  go={openOwned}
                  still={prefs.still}
                  metYeon={met === player.scope}
                />
              ) : (
                <p>계정 상태 확인 중 · {player.name}</p>
              ))}
            {screen === "cast" && process.env.NODE_ENV !== "development" && (
              <>
                <p>대표 캐릭터를 고르면 로비에서 대화를 나눌 수 있어요.</p>
                {companions.map((c, i) => (
                  <button
                    className={s.row}
                    key={c.name}
                    aria-pressed={i === prefs.hero}
                    onClick={() => chooseHero(i)}
                  >
                    <Portrait index={i} />
                    <span>
                      {c.name} · {c.role}
                    </span>
                    <b>{i === prefs.hero ? "대표" : "선택"}</b>
                  </button>
                ))}
                <p>캐릭터 성장 레벨은 강화 기능에서 열립니다.</p>
              </>
            )}
            {process.env.NODE_ENV === "development" &&
              player.scope &&
              (screen === "campaign" ||
                screen === "archive" ||
                screen === "event" ||
                screen === "history") && (
                <StoryCampaign
                  key={player.scope + screen}
                  scope={player.scope}
                  screen={screen === "campaign" ? "story" : screen}
                  still={prefs.still}
                  sound={prefs.sound}
                  startBattle={(encounter, questId) =>
                    go("battle", { encounter, questId })
                  }
                  openGrowth={() => go("growth")}
                />
              )}
            {process.env.NODE_ENV === "development" &&
              screen === "growth" &&
              player.scope && (
                <Growth key={player.scope} scope={player.scope} />
              )}
            {screen === "summon" && (
              <SummonPreview
                balance={player.balance}
                still={prefs.still}
                scope={player.scope}
                go={openOwned}
              />
            )}
            {screen in pending &&
              !(
                process.env.NODE_ENV === "development" &&
                ["team", "relic", "growth", "history", "event"].includes(screen)
              ) && <p>{pending[screen as keyof typeof pending]}</p>}
            {screen === "menu" &&
              (
                [
                  "archive",
                  "history",
                  ...(process.env.NODE_ENV === "development"
                    ? (["battle", "campaign"] as const)
                    : []),
                  "settings",
                  "help",
                ] as const
              ).map(shortcut)}
            {screen === "archive" && (
              <>
                <p>프롤로그 · 이상한 앱이 깔렸다</p>
                {shortcut("story")}
              </>
            )}
            {screen === "settings" && (
              <>
                {(
                  [
                    ["sound", "화면 이동 소리"],
                    ["large", "큰 대사 글자"],
                    ["still", "움직임 줄이기"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    className={s.row}
                    role="switch"
                    aria-checked={prefs[key]}
                    key={key}
                    onClick={() => save({ ...prefs, [key]: !prefs[key] })}
                  >
                    {label}
                    <b>{prefs[key] ? "켜짐" : "꺼짐"}</b>
                  </button>
                ))}
                <p>설정과 대표 캐릭터는 이 기기에 저장됩니다.</p>
              </>
            )}
            {screen === "help" && (
              <p>
                <CircleHelp size={18} /> 로비에서 대사를 눌러 다음 말을 듣거나
                교체 버튼으로 대표 캐릭터를 바꿔 보세요. 이야기 이어하기에서
                프롤로그를 읽을 수 있어요. 상단 화살표로 이전 화면에 돌아갑니다.
              </p>
            )}
          </div>
        </section>
      )}
      {warning && (
        <p role="status" className={s.warning}>
          {warning}
        </p>
      )}
      <nav className={s.dock} aria-label="게임 메뉴">
        {dock.map(({ id, Icon }) => (
          <button
            key={id}
            aria-current={screen === id ? "page" : undefined}
            onClick={() => go(id)}
          >
            <Icon />
            <span>{screens[id]}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
