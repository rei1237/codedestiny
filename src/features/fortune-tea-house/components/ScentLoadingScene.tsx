"use client";

import type { FortuneTeaHouseConsultMode } from "../data/consult";
import { type TeaHouseCup } from "../data/teaCups";
import styles from "../styles/tea-room.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

type ScentLoadingSceneProps = {
  selectedCup?: TeaHouseCup | null;
  consultationMode?: FortuneTeaHouseConsultMode;
  progress?: {
    percent: number;
    label: string;
    message: string;
    delayed?: boolean;
    status?: "running" | "complete" | "error";
  };
};

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다.
    대사 배열은 원래 컴포넌트 안 useMemo 에 있었는데, 사전 조회는 모듈 최상위 원문을 필요로 해서 밖으로 뺐다. */
const KO = {
  chatLines: {
    saju: [
      "잠깐만요. 사주의 결은 서두르면 놓치는 향이 있어서, 잔을 조금 더 데워 볼게요.",
      "찻잎이 태어난 계절의 흐름을 우려내고 있어요. 조금만 기다려 주세요.",
      "오행의 온도를 손끝으로 재보는 중이에요. 곧 말이 골라질 거예요.",
    ],
    sukuyo: [
      "두 사람의 달빛이 서로 어떻게 닿는지 보고 있어요. 말은 천천히 골라드릴게요.",
      "27숙의 별자리 사이 거리를 재는 중이에요. 인연의 온도가 떠오르고 있어요.",
      "달빛이 두 잔 위에서 겹치는 순간을 기다리고 있어요.",
    ],
    tarot: [
      "킁킁… 이 질문에는 아직 말하지 못한 마음이 묻어 있어요.",
      "찻잎이 당신의 운을 우려내고 있어요. 카드가 천천히 깨어나는 중이에요.",
      "달빛 아래에서 카드 한 장이 먼저 몸을 뒤척였어요. 조금만 더요.",
    ],
  },
  title: {
    sajuCompatibility: "연이가 두 사람의 사주 궁합을 살피고 있어요",
    saju: "연이가 사주의 향을 살피고 있어요",
    sukuyo: "연이가 27숙 인연의 흐름을 살피고 있어요",
    tarot: "연이가 마음의 향을 살짝 맡아보고 있어요",
  },
  progress: { label: "요청 접수", message: "찻잔 위에 질문을 올리고 있어요." },
  sceneAria: "연이가 상담문을 준비하는 중",
  loadingAlt: "달빛 찻잔이 떠오르는 로딩 장면",
  yeoniAria: "찻잔을 건네는 연이",
  progressAria: "상담문 생성 진행",
  delayNotice: "상담문을 조금 더 깊게 엮고 있어요. 내 상담함에서 생성 상태를 다시 확인할 수 있어요.",
  libraryLink: "내 상담함에서 이어보기",
  retryNotice: "흐름이 끊기면 입력 화면에서 같은 질문으로 다시 시도할 수 있어요.",
};

export default function ScentLoadingScene({ selectedCup, consultationMode = "tarot", progress }: ScentLoadingSceneProps) {
  const copy = useTeaHouseCopy("scentLoading", KO);
  const activeProgress = progress || { percent: 5, label: copy.progress.label, message: copy.progress.message, status: "running" };
  const complete = activeProgress.status === "complete";
  return <section className={styles.loading} aria-label={copy.sceneAria} aria-busy={!complete}>
    <img src={`/images/fortune-tea-house/renewal/${activeProgress.status === "error" ? "state-retry" : complete ? "state-completed" : "state-brewing"}.webp`} width="200" height="220" alt="" />
    <h2>{copy.title[consultationMode]}</h2>
    <p role="status">{activeProgress.label}</p><p>{activeProgress.message}</p>
    <progress max={100} value={complete ? 100 : Math.max(5, Math.min(95, activeProgress.percent))} aria-label={copy.progressAria}/>
    {activeProgress.delayed && <p>{copy.delayNotice}</p>}
    {activeProgress.status === "error" && <p>{copy.retryNotice}</p>}
    <a href="/fortune-tea-house/?history=1">{copy.libraryLink}</a>
  </section>;
}
