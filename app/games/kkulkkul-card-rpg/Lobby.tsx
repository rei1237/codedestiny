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
import SummonPreview from "./SummonPreview";
import { Dialogue, Portrait, NovelLine } from "./Dialogue";
import { usePlayer } from "./usePlayer";
import s from "./lobby.module.css";

const dock = [
  { id: "team", Icon: Shield },
  { id: "cast", Icon: Users },
  { id: "relic", Icon: Layers },
  { id: "growth", Icon: Swords },
  { id: "summon", Icon: Orbit },
  { id: "menu", Icon: Menu },
] as const;
const defaults = { sound: false, large: false, still: false, hero: 0 };
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
  const title = useRef<HTMLHeadingElement>(null);
  const hero = companions[prefs.hero];
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
  function go(id: Screen) {
    if (id === screen) return;
    chime();
    history.pushState({ cardRpgFrom: screen }, "", "#" + id);
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
  function chooseHero(id: number) {
    save({ ...prefs, hero: id });
    setLine(0);
  }
  const shortcut = (id: Screen) => (
    <button key={id} className={s.row} onClick={() => go(id)}>
      {screens[id]} <ChevronRight size={18} />
    </button>
  );
  return (
    <main className={s.game} data-still={prefs.still} data-large={prefs.large}>
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
                프롤로그 · {beat === 0 ? "첫 장면" : "읽던 문장 " + (beat + 1)}
              </small>
              <h1 tabIndex={-1} ref={title}>
                이상한 앱이
                <br />
                깔렸다
              </h1>
              <button className={s.gold} onClick={() => go("story")}>
                이야기 이어하기 <ArrowRight size={20} />
              </button>
            </article>
            <button className={s.event} onClick={() => go("event")}>
              <Music2 />
              <span>
                <b>축제의 무대</b>
                <small>EP.12 완료 후 해금 · 준비 중</small>
              </span>
              <LockKeyhole size={16} />
            </button>
          </div>
        </section>
      ) : (
        <section className={s.sub} key={screen}>
          <div className={s.panel} data-screen={screen}>
            <h1 tabIndex={-1} ref={title}>
              {screens[screen]}
            </h1>
            {screen === "cast" && (
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
            {screen === "story" && (
              <>
                <small>프롤로그 · 이상한 앱이 깔렸다</small>
                <NovelLine
                  key={opening[beat].id}
                  {...opening[beat]}
                  still={prefs.still}
                />
                <p>
                  도입부 미리보기 · {beat + 1} / {opening.length}
                </p>
                <div className={s.actions}>
                  <button disabled={!beat} onClick={() => turnPage(beat - 1)}>
                    이전 문장
                  </button>
                  {beat + 1 < opening.length ? (
                    <button onClick={() => turnPage(beat + 1)}>
                      다음 문장
                    </button>
                  ) : (
                    <a href="/codedestiny-novel.html">원작 뷰어 열기</a>
                  )}
                </div>
              </>
            )}
            {screen === "summon" && (
              <SummonPreview
                balance={player.balance}
                still={prefs.still}
                go={go}
              />
            )}
            {screen in pending && (
              <p>{pending[screen as keyof typeof pending]}</p>
            )}
            {screen === "menu" &&
              (["archive", "history", "settings", "help"] as const).map(
                shortcut,
              )}
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
