"use client";

import { AnimatePresence, m } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  LIFE_ARCHETYPES,
  LIFE_QUESTIONS,
  TRAIT_KEYS,
  type LifeArchetype,
  type TraitScores,
} from "./hwatu-life/testData";

type KakaoLike = {
  isInitialized?: () => boolean;
  Share?: {
    sendDefault?: (payload: unknown) => void;
  };
};

const HWATU_LIFE_CARD_TEST_TEXT_TRANSLATIONS = {
  ko: {
    kakaoResultButton: "결과 보러 가기",
    shareTitle: "화투 인생 패 테스트",
  },
  en: {
    kakaoResultButton: "View Result",
    shareTitle: "Hwatu Life Card Test",
  },
  ja: {
    kakaoResultButton: "結果を見る",
    shareTitle: "花札人生札テスト",
  },
} as const;

function emptyScores(): TraitScores {
  return {
    leadership: 0,
    opportunism: 0,
    strategy: 0,
    pragmatism: 0,
    endurance: 0,
    charisma: 0,
    intuition: 0,
    composure: 0,
  };
}

function addScore(base: TraitScores, partial: Partial<TraitScores>): TraitScores {
  const next = { ...base };
  Object.entries(partial).forEach(([k, v]) => {
    const key = k as keyof TraitScores;
    next[key] += v ?? 0;
  });
  return next;
}

function pickArchetype(scores: TraitScores): LifeArchetype {
  let best = LIFE_ARCHETYPES[0];
  let bestDot = Number.NEGATIVE_INFINITY;

  LIFE_ARCHETYPES.forEach((arc) => {
    const dot = TRAIT_KEYS.reduce((sum, key) => sum + scores[key] * arc.profile[key], 0);
    if (dot > bestDot) {
      bestDot = dot;
      best = arc;
    }
  });

  return best;
}

function monthlySummary(archetype: LifeArchetype) {
  const month = new Date().getMonth() + 1;
  const map: Record<string, string> = {
    samgwang: "이번 달은 네 존재감이 결정권을 만든다. 말할 자리를 먼저 잡는 사람이 판을 이긴다.",
    godori: "이번 달은 속도가 돈이다. 기회는 짧게 열리고, 빠르게 움직인 쪽이 먹는다.",
    cheongdan: "이번 달은 디테일이 승부처다. 계획표와 체크리스트가 그대로 성과가 된다.",
    hongdan: "이번 달은 사람의 온도가 자산이다. 대화 한 번이 막힌 흐름을 뚫는다.",
    chodan: "이번 달은 루틴이 방패다. 반복을 정리하면 체력과 성과가 같이 오른다.",
    bipung: "이번 달은 선택과 집중이 답이다. 버릴 카드를 먼저 정리하면 기회가 선명해진다.",
    ddonggwang: "이번 달은 느려도 강하다. 꾸준히 버틴 사람이 마지막 판돈을 가져간다.",
    bigwang: "이번 달은 변수가 기회다. 예상 밖 상황에서 포지션을 바꾸면 역전이 가능하다.",
  };
  return `이 패를 가진 당신의 ${month}월 운세: ${map[archetype.id] ?? "리듬을 지키는 사람이 끝내 웃는다."}`;
}

export default function HwatuLifeCardTest() {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<TraitScores>(emptyScores());
  const [result, setResult] = useState<LifeArchetype | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const progress = Math.round((index / LIFE_QUESTIONS.length) * 100);
  const question = LIFE_QUESTIONS[index];

  const resultText = useMemo(() => (result ? monthlySummary(result) : ""), [result]);
  const detailText = useMemo(() => {
    if (!result) return [] as string[];
    const detailById: Record<string, string[]> = {
      samgwang: [
        "판세 흐름: 시선이 모이는 자리에서 먼저 선언할수록 유리한 패다.",
        "경계 포인트: 강하게 밀어붙인 뒤 회수 타이밍을 놓치면 체력 손실이 크다.",
        "실전 수법: 오늘 중요한 대화는 네가 첫 문장으로 판을 열고 24시간 내 결론을 찍어라.",
      ],
      godori: [
        "판세 흐름: 짧게 열리는 기회를 빨리 잡는 사람이 먹는다.",
        "경계 포인트: 속도만 믿고 근거를 놓치면 후반 리스크가 커진다.",
        "실전 수법: 제안이 오면 수익/리스크/회수 3축으로 10분 내 분해하라.",
      ],
      cheongdan: [
        "판세 흐름: 문서와 일정의 작은 빈칸을 메우는 순간 승부가 기운다.",
        "경계 포인트: 완벽을 기다리다 타이밍을 놓치지 말아야 한다.",
        "실전 수법: 체크리스트 3개(마감, 비용, 책임자)만 고정하고 바로 실행하라.",
      ],
      hongdan: [
        "판세 흐름: 관계 온도를 맞추면 막힌 대화가 열린다.",
        "경계 포인트: 공감만 하고 결론을 흐리면 다시 꼬인다.",
        "실전 수법: 대화 마지막에 다음 액션 시간까지 명시해 판을 고정하라.",
      ],
      chodan: [
        "판세 흐름: 루틴과 반복이 흔들리는 판에서 방패가 된다.",
        "경계 포인트: 세부 조정에 오래 묶이면 전체 속도가 죽는다.",
        "실전 수법: 오전에 가장 무거운 일 1개를 완결해 흐름을 선점하라.",
      ],
      bipung: [
        "판세 흐름: 버릴 패를 먼저 고르는 냉정함이 수익률을 만든다.",
        "경계 포인트: 과한 손절은 기회까지 버릴 수 있다.",
        "실전 수법: 돈/시간/관계에서 불필요한 1개를 정리하고 핵심 1개에 집중하라.",
      ],
      ddonggwang: [
        "판세 흐름: 초반 답답함 뒤에 후반 역전력이 붙는 구조다.",
        "경계 포인트: 기다림을 핑계로 대응을 미루면 기회를 잃는다.",
        "실전 수법: 보류 중인 일 하나에 마감 시점을 박아두고 소폭 전진하라.",
      ],
      bigwang: [
        "판세 흐름: 변수가 많은 날일수록 포지션 전환이 빛난다.",
        "경계 포인트: 배짱만 앞세우면 리스크 과열로 번질 수 있다.",
        "실전 수법: 플랜 B를 먼저 만든 뒤 플랜 A를 공격적으로 실행하라.",
      ],
    };
    return detailById[result.id] ?? ["패는 이미 나왔다. 이제 누가 먼저 칼을 뽑느냐의 문제다."];
  }, [result]);

  const onSelect = (choiceIndex: number) => {
    if (!question) return;
    const choice = question.choices[choiceIndex];
    if (!choice) return;

    const nextScores = addScore(scores, choice.score);
    setScores(nextScores);

    if (index >= LIFE_QUESTIONS.length - 1) {
      setResult(pickArchetype(nextScores));
      setShowDetail(false);
      return;
    }

    setIndex((v) => v + 1);
  };

  const onRestart = () => {
    setStarted(false);
    setIndex(0);
    setScores(emptyScores());
    setResult(null);
    setShowDetail(false);
  };

  const shareResult = async () => {
    if (!result) return;

    const text = [
      "[화투 인생 패 테스트]",
      `나의 인생 패: ${result.name} - ${result.cardTitle}`,
      result.tagline,
      resultText,
      `지금 확인: ${typeof window !== "undefined" ? window.location.href : "https://code-destiny.com/oracle/hwatu-life"}`,
    ].join("\n");

    const kakao = (window as Window & { Kakao?: KakaoLike }).Kakao;
    if (kakao?.Share?.sendDefault && kakao?.isInitialized?.()) {
      kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: `화투 인생 패: ${result.name}`,
          description: `${result.cardTitle} | ${result.tagline}`,
          imageUrl: `https://code-destiny.com${result.cardImage}`,
          link: {
            mobileWebUrl: window.location.href,
            webUrl: window.location.href,
          },
        },
        buttons: [
          {
            title: HWATU_LIFE_CARD_TEST_TEXT_TRANSLATIONS.ko.kakaoResultButton,
            link: {
              mobileWebUrl: window.location.href,
              webUrl: window.location.href,
            },
          },
        ],
      });
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: HWATU_LIFE_CARD_TEST_TEXT_TRANSLATIONS.ko.shareTitle, text });
        return;
      } catch (e) {
        // no-op
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      alert("결과 문구를 클립보드에 복사했소.");
    } catch (e) {
      alert(text);
    }
  };

  return (
    <main className="min-h-[100dvh] px-4 py-10 text-amber-50" style={{
      background:
        "radial-gradient(1200px 500px at 10% 0%, rgba(127,29,29,.35), transparent 60%), radial-gradient(1100px 500px at 100% 10%, rgba(120,53,15,.35), transparent 62%), linear-gradient(145deg,#060708 0%,#0f1312 48%,#220808 100%)",
    }}>
      <div className="mx-auto max-w-3xl rounded-2xl border border-amber-700/50 bg-black/50 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:p-8">
        <h1 className="mb-2 text-center text-3xl font-extrabold tracking-tight text-amber-300 sm:text-4xl">타짜 컨셉 인생 패 테스트</h1>
        <p className="mb-6 text-center text-sm text-red-200/90 sm:text-base">쫄리면 뒤지시던가. 끝까지 가면 네 패가 보인다.</p>

        {!started && !result && (
          <m.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-xl border border-amber-500/50 bg-gradient-to-br from-stone-900/90 to-red-950/60 p-5">
              <p className="mb-3 text-amber-100">7문항으로 돈, 사랑, 위기에서의 본능을 읽어 네 인생 패를 매칭한다.</p>
              <button
                type="button"
                onClick={() => setStarted(true)}
                className="w-full rounded-xl border border-amber-400 bg-gradient-to-r from-red-800 via-red-700 to-amber-700 px-4 py-3 text-base font-bold text-amber-100 transition hover:brightness-110"
              >
                판에 참여하기
              </button>
            </div>
          </m.section>
        )}

        {started && !result && question && (
          <AnimatePresence mode="wait">
            <m.section
              key={question.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
            >
              <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full border border-amber-500/40 bg-zinc-900/80">
                <m.div
                  className="h-full bg-gradient-to-r from-red-700 via-red-500 to-amber-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.28 }}
                />
              </div>
              <div className="mb-2 inline-block rounded-full border border-amber-500/50 bg-amber-900/30 px-3 py-1 text-xs font-semibold text-amber-200">
                문항 {index + 1} / {LIFE_QUESTIONS.length}
              </div>
              <h2 className="mb-2 text-lg font-bold text-zinc-50 sm:text-xl">{question.title}</h2>
              <p className="mb-4 text-sm text-zinc-300">{question.sub}</p>
              <div className="space-y-2.5">
                {question.choices.map((choice, cIdx) => (
                  <m.button
                    key={choice.key}
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect(cIdx)}
                    className="block w-full rounded-xl border border-amber-500/45 bg-gradient-to-r from-slate-900/80 to-red-950/70 px-4 py-3 text-left text-sm leading-relaxed text-zinc-100 transition hover:border-amber-300/70"
                  >
                    <span className="mr-2 inline-block min-w-5 text-amber-300">{choice.key}</span>
                    {choice.text}
                  </m.button>
                ))}
              </div>
            </m.section>
          </AnimatePresence>
        )}

        {result && (
          <m.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mx-auto mb-4 w-44 overflow-hidden rounded-xl border-2 border-amber-400 bg-white shadow-[0_12px_30px_rgba(0,0,0,0.5)]">
              <m.img
                src={result.cardImage}
                alt={result.name}
                className="aspect-[2/3] w-full object-contain"
                initial={{ rotateY: 180, opacity: 0.2 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ duration: 0.55 }}
              />
            </div>
            <h2 className="mb-1 text-center text-2xl font-extrabold text-amber-300">[{result.name}] {result.cardTitle}</h2>
            <p className="mb-3 text-center text-red-200">{result.tagline}</p>
            <p className="mb-4 rounded-xl border border-amber-600/45 bg-zinc-900/70 p-3 text-sm leading-relaxed text-zinc-100">
              "{result.quote}"
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              {result.traits.map((trait) => (
                <span key={trait} className="rounded-full border border-amber-500/55 bg-amber-900/30 px-3 py-1 text-xs text-amber-100">
                  {trait}
                </span>
              ))}
              <span className="rounded-full border border-red-500/45 bg-red-900/25 px-3 py-1 text-xs text-red-100">{result.comboLabel}</span>
            </div>
            <p className="mb-5 rounded-xl border border-amber-500/40 bg-slate-900/70 p-3 text-sm leading-relaxed text-blue-100">
              {resultText}
            </p>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setShowDetail((v) => !v)}
                className="w-full rounded-xl border border-amber-400 bg-gradient-to-r from-red-900 to-amber-800 px-4 py-3 text-center font-semibold text-amber-100 transition hover:brightness-110"
              >
                {showDetail ? "상세 운세 접기" : "상세 운세 보기"}
              </button>
              <AnimatePresence>
                {showDetail && (
                  <m.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-xl border border-amber-500/40 bg-gradient-to-br from-slate-950/80 to-red-950/50 p-4 text-sm leading-relaxed text-zinc-100"
                  >
                    <div className="mb-2 text-amber-300">상세 타짜 풀이</div>
                    <div className="space-y-1.5">
                      {detailText.map((line) => (
                        <p key={line}>• {line}</p>
                      ))}
                    </div>
                    <p className="mt-2 text-amber-100/90">"패는 이미 나왔다. 이제 누가 먼저 칼을 뽑느냐의 문제다."</p>
                  </m.div>
                )}
              </AnimatePresence>
              <button
                type="button"
                onClick={shareResult}
                className="w-full rounded-xl border border-yellow-300 bg-[#FEE500] px-4 py-3 font-bold text-[#3B1E08] transition hover:brightness-95"
              >
                카카오톡 공유하기
              </button>
              <Link href="/" className="block w-full rounded-xl border border-zinc-500 bg-zinc-800 px-4 py-3 text-center font-medium text-zinc-100">
                홈 화면으로 바로 가기
              </Link>
              <button
                type="button"
                onClick={onRestart}
                className="w-full rounded-xl border border-amber-600/60 bg-transparent px-4 py-2.5 text-sm text-amber-200"
              >
                다시 테스트하기
              </button>
            </div>
          </m.section>
        )}
      </div>
    </main>
  );
}
