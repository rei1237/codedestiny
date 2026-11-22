"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  EyeOff,
  Headphones,
  History,
  MoonStar,
  Shield,
  Swords,
} from "lucide-react";
import {
  beginCampaignQuest,
  campaignEvent,
  turnCampaignPage,
} from "./campaign";
import {
  campaignQuests,
  questById,
  questLock,
  sceneById,
  restoreCampaign,
  type CampaignProgress,
  type Encounter,
  type Scene,
} from "./campaign-data";
import { loadCollection, type Collection } from "./collection";
import { Portrait } from "./Dialogue";
import css from "./campaign.module.css";

type Props = {
  scope: string;
  screen: "story" | "archive" | "event" | "history";
  startBattle: (encounter: Encounter, questId: string) => void;
  still: boolean;
  sound: boolean;
  openGrowth?: () => void;
};

function useStoryAudio(allowed: boolean) {
  const ctx = useRef<AudioContext | null>(null);
  const clock = useRef<ReturnType<typeof setInterval> | null>(null);
  const [playing, setPlaying] = useState(false);
  function stop() {
    if (clock.current !== null) clearInterval(clock.current);
    clock.current = null;
    if (ctx.current) void ctx.current.close().catch(() => {});
    ctx.current = null;
    setPlaying(false);
  }
  function note(frequency: number, duration: number, volume: number) {
    const audio = ctx.current;
    if (!audio || audio.state !== "running") return;
    const osc = audio.createOscillator(),
      gain = audio.createGain(),
      t = audio.currentTime;
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(t);
    osc.stop(t + duration);
  }
  async function toggle() {
    if (ctx.current) {
      stop();
      return;
    }
    if (!allowed) return;
    try {
      const audio = new AudioContext();
      ctx.current = audio;
      await audio.resume();
      if (ctx.current !== audio) return;
      let beat = 0;
      const melody = [293.66, 369.99, 440, 493.88, 440, 369.99, 329.63, 246.94];
      const chime = () => {
        if (document.hidden) return;
        note(melody[beat % melody.length], 1.8, 0.042);
        if (beat % 4 === 0) note(146.83, 3, 0.025);
        beat++;
      };
      chime();
      clock.current = setInterval(chime, 1050);
      setPlaying(true);
    } catch {
      stop();
    }
  }
  useEffect(() => {
    if (!allowed) stop();
    return stop;
  }, [allowed]);
  return { toggle, playing, tick: () => note(880, 0.095, 0.02) };
}

function StoryLine({
  scene,
  fast,
  still,
  onReady,
}: {
  scene: Scene;
  fast: boolean;
  still: boolean;
  onReady: (v: boolean) => void;
}) {
  const [visible, setVisible] = useState(0);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion:reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  const instant = still || fast || reduced,
    done = instant || visible >= scene.text.length;
  useEffect(() => {
    onReady(done);
  }, [done, onReady]);
  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setVisible((n) => n + 1), 35);
    return () => clearInterval(t);
  }, [done]);
  const talking =
    !done && (scene.speaker === "영냥이" || scene.speaker === "연이");
  const frame = talking ? [0, 2, 3, 2][Math.floor(visible / 2) % 4] : 0;
  return (
    <>
      <div className={css.actor} aria-hidden="true">
        {scene.chapter === "프롤로그" ? (
          <Portrait index={0} frame={frame} />
        ) : scene.speaker === "영냥이" ? (
          <Portrait index={1} frame={frame} />
        ) : (
          <img
            src={
              "/images/novel/remaster/v2/yeoni/" +
              (frame > 0
                ? "talk"
                : scene.id === "name"
                  ? "determined"
                  : scene.id === "mirror"
                    ? "sad"
                    : "neutral") +
              ".webp"
            }
            alt=""
          />
        )}
      </div>
      <div className={css.line}>
        <b>{scene.speaker}</b>
        <p aria-label={scene.text}>
          <span aria-hidden="true">
            {instant ? scene.text : scene.text.slice(0, visible)}
          </span>
        </p>
        {!done && (
          <button
            className={css.reveal}
            onClick={() => setVisible(scene.text.length)}
          >
            문장 전체 보기
          </button>
        )}
      </div>
    </>
  );
}

export default function StoryCampaign(p: Props) {
  const [state, setState] = useState<CampaignProgress | null>(null),
    [message, setMessage] = useState(""),
    [request, refresh] = useState(0);
  const [practice, setPractice] = useState<
    NonNullable<Collection["battleHistory"]>
  >([]);
  const [busy, setBusy] = useState(false),
    locked = useRef(false);
  const [quest, setQuest] = useState(""),
    [tab, setTab] = useState<"read" | "log">("read");
  const [archive, setArchive] = useState(""),
    [hidden, setHidden] = useState(false),
    [auto, setAuto] = useState(false);
  const [fast, setFast] = useState(false),
    [ready, setReady] = useState(false);
  const sound = useStoryAudio(p.sound);
  useEffect(() => {
    let current = true;
    if (!p.scope) return;
    loadCollection(p.scope)
      .then((c) => {
        if (!current) return;
        setState(restoreCampaign(c.campaign));
        setPractice(c.battleHistory ?? []);
      })
      .catch(() => {
        if (current) setMessage("이 기기의 이야기 기록을 읽을 수 없어요.");
      });
    return () => {
      current = false;
    };
  }, [p.scope, request]);
  useEffect(() => {
    const changed = (e: Event) => {
      if ((e as CustomEvent<string>).detail === p.scope) refresh((n) => n + 1);
    };
    window.addEventListener(campaignEvent, changed);
    return () => window.removeEventListener(campaignEvent, changed);
  }, [p.scope]);
  const scene = sceneById[archive || state?.node || "room"];
  const isReading =
    p.screen === "story" || (p.screen === "archive" && !!archive);
  const chapterGate =
    p.screen === "story" &&
    scene.id === "corridor" &&
    !state?.completed["study.growth"];
  const archiveIndex = state?.read.indexOf(archive) ?? -1;
  async function turn(choice?: string) {
    if (!state || locked.current) return;
    if (archive) {
      const next = state.read[archiveIndex + 1];
      setArchive(next || "");
      setReady(false);
      return;
    }
    locked.current = true;
    setBusy(true);
    setMessage("");
    try {
      const s = await turnCampaignPage(p.scope, scene.id, choice);
      setState(s);
      setReady(false);
      sound.tick();
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "문장을 저장할 수 없어요. 다시 시도해 주세요.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function start(id: string) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setMessage("");
    try {
      const s = await beginCampaignQuest(p.scope, id);
      setState(s);
      setAuto(false);
      p.startBattle(questById[id].encounter, id);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "출전 기록을 저장할 수 없어요.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    if (
      !isReading ||
      !auto ||
      hidden ||
      tab === "log" ||
      !ready ||
      busy ||
      !state ||
      chapterGate ||
      document.hidden
    )
      return;
    if (!archive && (scene.gate || scene.choices || !scene.next || scene.clear))
      return;
    const timer = setTimeout(() => {
      if (!document.hidden) void turn();
    }, 1700);
    return () => clearTimeout(timer);
  }, [
    isReading,
    auto,
    hidden,
    tab,
    ready,
    busy,
    state,
    scene,
    archive,
    chapterGate,
  ]);
  if (!state)
    return (
      <div className={css.body}>
        <p role="status">{message || "이야기 기록을 펼치고 있어요."}</p>
        {message && (
          <button onClick={() => refresh((n) => n + 1)}>다시 읽기</button>
        )}
      </div>
    );
  const feedback = message && <p role="alert">{message}</p>;
  const receipts = Object.entries(state.receipts).reverse();
  const selected = questById[quest];
  if (p.screen === "history")
    return (
      <section className={css.body}>
        <h2>
          <History size={20} /> 전투 수첩
        </h2>
        {!receipts.length && !practice.length && (
          <p>본편이나 의뢰의 전투를 마치면 이곳에 기록됩니다.</p>
        )}
        {practice.map((r) => (
          <p key={r.id}>
            자유 전투 · {r.name} · {r.won ? "승리" : "패배"} · {r.turns}턴
          </p>
        ))}
        {receipts.map(([id, r]) => (
          <details key={id}>
            <summary>
              {questById[r.questId]?.title} · {r.victory ? "승리" : "패배"}
            </summary>
            <p>
              {r.victory
                ? questById[r.questId]?.ending
                : "전열과 예장을 살펴보고 다시 도전할 수 있어요."}
            </p>
            <small>
              {r.first ? "첫 승리" : r.victory ? "반복 승리" : "재도전 가능"} ·
              개발용 조각 {r.reward}개
            </small>
          </details>
        ))}
      </section>
    );
  if (p.screen === "event" || chapterGate) {
    const quests = campaignQuests.filter((q) => !q.gate);
    return (
      <section className={css.body}>
        <header className={css.chapterHeader}>
          <MoonStar />
          <div>
            <small>비겁의 섬</small>
            <h2>달빛 선착장의 의뢰</h2>
          </div>
        </header>
        {chapterGate && (
          <p>
            제1장을 마쳤어요. 거울 파편 첫 승리로 얻은 조각 4개를 수첩에서
            확인하세요. 다음 장에 들어가기 전 영냥이의 수업이 열립니다.
          </p>
        )}
        {feedback}
        <div className={css.questList}>
          {quests.map((q) => (
            <button
              key={q.id}
              aria-pressed={quest === q.id}
              onClick={() => setQuest(q.id)}
            >
              <b>{q.title}</b>
              <small>
                {questLock(state, q) ||
                  (state.completed[q.id] ? "재도전" : "출전 가능")}
              </small>
            </button>
          ))}
        </div>
        {selected && (
          <article className={css.quest}>
            <h3>{selected.title}</h3>
            <p>{selected.intro}</p>
            {state.completed[selected.id] > 0 && <p>{selected.ending}</p>}
            <small>
              게임 각색 · 첫 승리 조각 {selected.first}개
              {selected.repeat > 0 && " · 반복 " + selected.repeat + "개"}
            </small>
            <button
              disabled={busy || !!questLock(state, selected)}
              onClick={() => start(selected.id)}
            >
              <Swords size={16} /> {questLock(state, selected) || "의뢰 출전"}
            </button>
          </article>
        )}
        {p.openGrowth && state.completed["study.growth"] > 0 && (
          <button onClick={p.openGrowth}>강화 열기</button>
        )}
      </section>
    );
  }
  if (p.screen === "archive" && !archive)
    return (
      <section className={css.body}>
        <h2>
          <BookOpen size={20} /> 장면 서고
        </h2>
        <p>지나온 장면을 순서대로 다시 읽을 수 있어요.</p>
        <div className={css.questList}>
          {state.read.map((id) => (
            <button
              key={id}
              onClick={() => {
                setArchive(id);
                setReady(false);
                setTab("read");
              }}
            >
              {sceneById[id].title}
              <small>{sceneById[id].chapter}</small>
            </button>
          ))}
        </div>
        {!state.read.length && <p>본편에서 첫 문장을 넘기면 열립니다.</p>}
        <a href="/codedestiny-novel.html">원작 소설 열기</a>
      </section>
    );
  if (!isReading) return null;
  if (tab === "log")
    return (
      <section className={css.body}>
        <h2>읽은 대사</h2>
        {state.read.map((id) => (
          <p key={id}>
            <b>{sceneById[id].speaker}</b>　{sceneById[id].text}
          </p>
        ))}
        <button onClick={() => setTab("read")}>장면으로 돌아가기</button>
      </section>
    );
  return (
    <section
      className={css.story}
      style={{
        backgroundImage: `linear-gradient(100deg,rgba(47,24,51,.45),rgba(47,24,51,.08)),url("/images/novel/mobile/${scene.bg}.webp")`,
      }}
    >
      {hidden ? (
        <button className={css.restore} onClick={() => setHidden(false)}>
          대사창 표시
        </button>
      ) : (
        <>
          <header className={css.chapterHeader}>
            <BookOpen size={20} />
            <div>
              <small>
                {scene.chapter} · {archive ? "서고 다시 보기" : "게임 각색"}
              </small>
              <h2>{scene.title}</h2>
            </div>
          </header>
          <div className={css.tools}>
            <button aria-label="대사창 숨기기" onClick={() => setHidden(true)}>
              <EyeOff size={16} />
            </button>
            <button onClick={() => setTab("log")}>로그</button>
            <button aria-pressed={auto} onClick={() => setAuto(!auto)}>
              자동
            </button>
            <button aria-pressed={fast} onClick={() => setFast(!fast)}>
              {fast ? "즉시 표시" : "글자 속도"}
            </button>
            <button
              aria-label={
                p.sound
                  ? "배경음과 효과음"
                  : "설정에서 소리를 켜면 배경음을 재생할 수 있어요"
              }
              disabled={!p.sound}
              aria-pressed={sound.playing}
              onClick={sound.toggle}
            >
              <Headphones size={16} />
            </button>
          </div>
          <StoryLine
            key={scene.id}
            scene={scene}
            fast={fast}
            still={p.still}
            onReady={setReady}
          />
          <footer className={css.controls}>
            {feedback}
            {!archive && scene.id === "corridor" && p.openGrowth && (
              <button onClick={p.openGrowth}>강화 열기</button>
            )}
            {archive ? (
              <>
                <button onClick={() => setArchive("")}>서고로</button>
                <button onClick={() => turn()}>
                  {archiveIndex + 1 === state.read.length
                    ? "다 읽었어요"
                    : "다음 장면"}
                </button>
              </>
            ) : scene.gate && !state.completed[scene.gate] ? (
              <>
                <small>스토리 지원 · 연이와 영냥이</small>
                <button disabled={busy} onClick={() => start(scene.gate!)}>
                  <Shield size={16} /> {questById[scene.gate].title} 출전
                </button>
              </>
            ) : scene.choices ? (
              scene.choices.map((choice) => (
                <button
                  disabled={busy}
                  key={choice.to}
                  onClick={() => turn(choice.to)}
                >
                  {choice.label}
                </button>
              ))
            ) : scene.next ? (
              <button disabled={busy} onClick={() => turn()}>
                {scene.clear ? "제1장 마치기" : "다음 문장"}{" "}
                <ChevronRight size={16} />
              </button>
            ) : !state.read.includes(scene.id) ? (
              <button onClick={() => turn()}>도입부 기록하기</button>
            ) : (
              <small>제2장 도입부까지 읽었어요.</small>
            )}
            {!archive &&
              state.read.includes(scene.id) &&
              scene.next &&
              !scene.choices &&
              !scene.gate && (
                <button onClick={() => turn()}>읽은 문장 건너뛰기</button>
              )}
          </footer>
        </>
      )}
    </section>
  );
}
