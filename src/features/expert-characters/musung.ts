import { defineLines } from "./lines";
import type { ExpertCharacter, ExpertSprite } from "./types";

/* 무성 — 자미두수 AI·심층 리포트. 원작대로 10대 중반 소년이다.
   강점은 까마귀 망토가 아니라 '노래로 化忌를 化祿으로 푸는 능력'이다.
   🔴 remaster/crow/*(악역 형태)와 깃털에 조종당하던 시기 표정(mu-02/04/06)은 쓰지 않는다.
   🔴 미성년 캐릭터 — 외모를 내세우는 문구·친밀감 연출 금지. */
const SPRITE_BASE = "/images/expert-characters/musung";

function sprite(file: string, alt: string): ExpertSprite {
  return { src: `${SPRITE_BASE}/${file}.webp`, alt };
}

/** 깃털 컷은 글리프+깃털 전체를 담은 세로형(240x870)이다. 표정 프레임(1:1)에 넣으면 깃털이 잘린다. */
export const MUSUNG_FEATHER_ASPECT = "240 / 870";

export const MUSUNG_FEATHER_STAGES = [
  sprite("feather-ink", "막힌 별(化忌)을 품은 먹색 깃털"),
  sprite("feather-ash", "잿빛으로 풀려 가는 깃털"),
  sprite("feather-gold", "녹(化祿)의 빛으로 바뀐 금빛 깃털"),
] as const;

export const musungCharacter: ExpertCharacter = {
  key: "musung",
  enabled: true,
  name: { ko: "무성", en: "Museong" },
  title: { ko: "막힌 별을 녹으로 바꾸는 판결", en: "Turning a blocked star into fortune" },
  spriteFit: "card",
  spriteAspect: "1 / 1",
  moods: {
    idle: sprite("gentle", "눈을 감고 명반에 귀 기울이는 무성"),
    greet: sprite("composed", "명반 앞에서 단정하게 맞이하는 무성"),
    thinking: sprite("thinking", "열두 궁을 살피는 무성"),
    reveal: sprite("verdict", "막힌 자리를 판결하는 무성"),
    caution: sprite("verdict", "조심할 궁을 짚는 무성"),
    comfort: sprite("smile", "처방을 건네며 옅게 웃는 무성"),
    error: sprite("sorry", "잠시 멈춰 사과하는 무성"),
    empty: sprite("gentle", "명반이 펼쳐지길 기다리는 무성"),
  },
  hero: {
    src: "/images/expert-characters/musung/hero.webp",
    alt: "열두 궁 궁전에서 금빛 깃털을 지휘봉처럼 들어 별등을 밝히는 무성",
    width: 1536,
    height: 1024,
  },
  lines: defineLines("musung", [
    ["hero", "greet", "명반을 펼치겠습니다. 태어난 시각이 정확할수록 판결도 정확합니다."],
    ["hero.sub", "idle", "막힌 자리를 짚고, 그 자리를 풀어 갈 행동을 처방합니다."],
    ["loading.request", "thinking", "열두 궁을 하나씩 심리하고 있습니다."],
    ["loading.stream", "reveal", "판결을 적고 있습니다. 막힌 별부터 짚겠습니다."],
    ["loading.done", "comfort", "이제 이 자리를 노래로 바꿔 볼게요."],
    ["empty", "empty", "아직 펼칠 명반이 없습니다. 생년월일과 시각을 먼저 적어 주십시오."],
    ["error", "error", "심리가 잠시 멈췄습니다. 입력은 그대로 있으니 다시 청해 주십시오."],
    ["result.open", "reveal", "판결합니다. 막힌 자리와 풀리는 자리를 함께 적었습니다."],
    ["result.close", "comfort", "이제 이 자리를 노래로 바꿔 볼게요."],
    ["pdf.byline", "idle", "판결 · 무성"],
  ]),
  linesEn: {
    hero: "I will open your chart. The more exact your birth time, the more exact the verdict.",
    "hero.sub": "I name where you are blocked, then prescribe how to loosen it.",
    "loading.request": "Examining the twelve palaces, one by one.",
    "loading.stream": "Writing the verdict. The blocked star comes first.",
    "loading.done": "Now let's turn this place into a song.",
    empty: "There is no chart to open yet. Please enter your birth date and time first.",
    error: "The hearing paused. Your input is safe — please ask again.",
    "result.open": "The verdict: where you are blocked, and where it loosens.",
    "result.close": "Now let's turn this place into a song.",
    "pdf.byline": "Verdict · Museong",
  },
};
