"use client";

import { BookOpen, Send } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import type { FortuneTeaHouseHoneyDropsState } from "../data/consult";
import { fortuneTeaHouseAssets } from "../data/assets";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

type HoneyDropRewardOverlayProps = {
  honeyDrops: FortuneTeaHouseHoneyDropsState | null;
  burstKey: number;
  message: string;
  onOpenTarotAlbum: () => void;
  onRequestRefresh?: () => void;
};

type PigChatMessage = {
  id: string;
  role: "user" | "pig";
  text: string;
  typing?: boolean;
};

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다.
    🔴 answers[].keywords 는 문구가 아니라 **사용자 입력과 대조하는 매칭어**다. 한국어로 두면
       다른 로케일에서는 어떤 질문도 걸리지 않고 항상 defaultAnswer 로 떨어지므로, 각 로케일에
       그 언어로 실제로 입력될 법한 말을 넣는다.
    {count}·{progress} 는 런타임 치환 자리다. */
const KO = {
  answers: [
    { keywords: ["남자친구", "남친", "연애", "사귀"], answer: "꿀꿀~ 있었어요! 네오라는 백사자 오빠인데... 운세 상담사였다가 저한테 '평생 꿀 빨게 해줄게'라고 하더니 갑자기 회사 때려치우고 뭔가 열심히 만들고 있어요 🦁 응원은 하는데 언제 꿀 빨 수 있는 건지 모르겠어요~ 꿀꿀 💛" },
    { keywords: ["전남친", "헤어", "이별", "전 남자친구"], answer: "전남친은 아니고 현재진행형이에요! 네오 오빠가 저를 위해 code-destiny.com 만들고 있다고 하더라고요~ 뭔지는 잘 모르겠지만 열심히 하는 거 보면 귀엽긴 해요 🐾 꿀꿀~" },
    { keywords: ["좋아하는 음식", "좋아하는 거", "뭐 좋아해", "음식"], answer: "당연히 꿀이죠! 🍯 진짜 꿀에 막 빠져 있어요. 꿀 케이크, 꿀 라떼, 꿀 떡볶이... 뭐든 꿀 들어가면 최고예요. 꿀꿀 그래서 제 이름도 꿀꿀 운세예요~" },
    { keywords: ["꿈", "장래희망", "되고 싶"], answer: "운명을 알려주는 꽃돼지로 계속 살고 싶어요! 🌸 사람들이 오늘 하루 조금 더 씩씩하게 살 수 있도록 달콤한 운세를 전해주는 거요~ 네오 오빠랑 같이 code-destiny.com 크게 키우는 것도 꿈이에요 💪 꿀꿀!" },
    { keywords: ["취미", "좋아하는 것"], answer: "저는요~ 달빛 아래에서 꽃 구경하기랑 🌙 연이 언니 노래 듣기를 엄청 좋아해요! 가끔 운세 카드도 뒤적이고요. 꿀꿀 최근엔 네오 오빠가 만든 숙요점 공부도 하고 있어요 📚" },
    { keywords: ["나이", "몇 살", "생일"], answer: "꽃돼지는 나이를 안 먹어요~ 🌸 꽃처럼 항상 봄이에요! 꿀꿀. 그냥 꽃이 피는 날이 제 생일이에요. 매년 봄마다 생일이니까 엄청 자주 오는 셈이죠 😆" },
    { keywords: ["연이", "언니"], answer: "연이 언니요~? 저의 소울 메이트예요! 💜 언니는 엄청 따뜻하고 감성적이에요. 저는 씩씩하고 언니는 부드럽고~ 둘이서 code-destiny.com 사람들 운세 봐주고 있어요. 꿀꿀 최고의 짝꿍~" },
    { keywords: ["네오", "백사자", "오빠"], answer: "네오 오빠는요~ 🦁 원래 엄청 유명한 운세 상담사였는데 저한테 '너 하나만 평생 책임지겠다'고 하더니 갑자기 개발자가 된 거예요 꿀꿀. 처음엔 황당했는데... 지금은 응원해요! code-destiny.com 잘 되길 바라요 💛" },
    { keywords: ["운세", "오늘 운세", "내 운세"], answer: "꿀꿀~ 운세는 code-destiny.com에서 제대로 봐드려요! 🔮 저는 여기서 귀여운 얘기만 해드릴 수 있고, 진짜 사주 팔자랑 별자리는 저희 홈에서 연이 언니랑 같이 봐줄게요 💜" },
    { keywords: ["무서워", "걱정", "힘들어", "슬퍼"], answer: "괜찮아요? 🌸 꽃돼지가 옆에 있을게요! 꿀꿀. 힘든 날일수록 달콤한 거 하나 먹고~ code-destiny.com에서 오늘의 운세 한 번 봐요. 분명 좋은 일이 기다리고 있을 거예요 💛" },
  ],
  defaultAnswer: "꿀꿀~ 그건 저도 잘 모르겠어요 😅 하지만 궁금한 건 code-destiny.com에서 운세로 알아볼 수 있어요! 연이 언니가 잘 알려줄 거예요 💜",
  quickQuestions: [
    "꽃돼지야~ 남자친구 있어? 💛",
    "제일 좋아하는 음식이 뭐야? 🍯",
    "네오 오빠 어떤 사람이야?",
    "연이 언니랑 사이 어때?",
    "꿈이 뭐야? 🌸",
    "오늘 내 운세 어때?",
    "취미가 뭐야?",
    "나이가 몇 살이야? 🐷",
  ],
  greeting: "꿀 모드가 열렸어요. 꽃돼지에게 궁금한 걸 물어봐요. 꿀꿀~",
  qnaAria: "꽃돼지 꿀 모드 대화",
  qnaBadge: "✦ 꿀방울 10개 달성 · 꽃돼지에게 물어봐",
  meterAria: "꿀방울 10개 중 10개 달성",
  pigName: "꽃돼지",
  pigStatus: "달콤한 꿀 모드 상담 대기 중",
  typingAria: "꽃돼지가 답변을 쓰는 중",
  quickAria: "추천 질문",
  placeholder: "꽃돼지야~ 뭐든 물어봐요 ✨",
  sendAria: "꽃돼지에게 질문 보내기",
  albumOpen: "열림",
  counterAria: "꿀방울 {count}개, 상담 혜택 보기",
  honeyLabel: "꿀방울",
  countValue: "{count}개",
  albumAriaUnlocked: "달빛 타로 앨범 보기",
  albumAriaLocked: "달빛 타로 앨범 열기, 꿀방울 {progress}/10",
  albumText: "달빛 앨범",
  honeyModeClose: "꿀 모드 닫기",
  honeyModeOpen: "꿀 모드 활성화",
  albumTitleUnlocked: "달빛 타로 앨범이 손님 곁에 열려 있어요.",
  albumTitleLocked: "꿀방울 10개면 연이의 비밀 카드첩을 열 수 있어요.",
  albumDescUnlocked: "해금 완료 · 꿀방울이 0개여도 언제든 78장의 카드를 감상할 수 있어요.",
  albumDescLocked: "보유 꿀방울 {count}개 / 해금 필요 10개. 운명의 찻집에서 상담을 마치면 꿀방울이 하나씩 모여요.",
  albumMeterAria: "달빛 타로 앨범 진행도 {progress}/10",
  albumBtnUnlocked: "앨범 감상하기",
  albumBtnLocked: "달빛 앨범 살펴보기",
  burstUnlocked: "꽃돼지의 꿀 모드도 함께 열려 있어요.",
  burstLocked: "운명의 찻집에서 상담이 완성될 때마다 조용히 쌓이는 작은 보상이에요.",
};

// QUICK_QUESTIONS 는 KO.quickQuestions 로 옮겼다.

const dropFrames = [
  { left: "12%", delay: "0ms", scale: "0.54", frameX: "0%", frameY: "0%" },
  { left: "24%", delay: "90ms", scale: "0.7", frameX: "33.333%", frameY: "0%" },
  { left: "38%", delay: "20ms", scale: "0.62", frameX: "66.666%", frameY: "0%" },
  { left: "53%", delay: "140ms", scale: "0.86", frameX: "100%", frameY: "0%" },
  { left: "67%", delay: "60ms", scale: "0.66", frameX: "0%", frameY: "100%" },
  { left: "80%", delay: "170ms", scale: "0.78", frameX: "66.666%", frameY: "100%" },
];

function normalizePigQuestion(question: string) {
  return question.toLowerCase().replace(/\s/g, "");
}

function getPigAnswer(question: string, copy: typeof KO) {
  const normalized = normalizePigQuestion(question);
  for (const entry of copy.answers) {
    if (entry.keywords.some((keyword) => normalized.includes(keyword.replace(/\s/g, "").toLowerCase()))) {
      return entry.answer;
    }
  }
  return copy.defaultAnswer;
}

function renderPigAnswerText(text: string): ReactNode {
  const parts = text.split("code-destiny.com");
  return parts.map((part, index) => (
    <span key={`${part}-${index}`}>
      {part}
      {index < parts.length - 1 ? (
        <a href="https://code-destiny.com" target="_blank" rel="noreferrer">
          code-destiny.com
        </a>
      ) : null}
    </span>
  ));
}

function TypewriterText({ text }: { text: string }) {
  const [visibleLength, setVisibleLength] = useState(0);

  useEffect(() => {
    setVisibleLength(0);
    const timer = window.setInterval(() => {
      setVisibleLength((current) => {
        if (current >= text.length) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, 18);
    return () => window.clearInterval(timer);
  }, [text]);

  return <>{renderPigAnswerText(text.slice(0, visibleLength))}</>;
}

function HoneyPigQnaPanel() {
  const copy = useTeaHouseCopy("honeyReward", KO);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<PigChatMessage[]>([
    {
      id: "pig-greeting",
      role: "pig",
      text: copy.greeting,
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const lastQuestionRef = useRef("");
  const lastSentAtRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  const canSend = useMemo(() => input.trim().length > 0 && !isTyping, [input, isTyping]);

  function submitQuestion(nextQuestion = input) {
    const question = nextQuestion.trim().slice(0, 100);
    const normalized = normalizePigQuestion(question);
    const now = Date.now();
    if (!question || isTyping) return;
    if (normalized === lastQuestionRef.current) return;
    if (now - lastSentAtRef.current < 600) return;

    lastQuestionRef.current = normalized;
    lastSentAtRef.current = now;
    setInput("");
    setMessages((current) => [
      ...current.slice(-8),
      { id: `user-${now}`, role: "user", text: question },
    ]);
    setIsTyping(true);

    window.setTimeout(() => {
      const answer = getPigAnswer(question, copy);
      setMessages((current) => [
        ...current.slice(-8),
        { id: `pig-${Date.now()}`, role: "pig", text: answer, typing: true },
      ]);
      setIsTyping(false);
    }, 600);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    submitQuestion();
  }

  return (
    <section className={styles.honeyPigQnaSection} aria-label={copy.qnaAria}>
      <div className={styles.honeyPigQnaBadge}>{copy.qnaBadge}</div>
      <div className={styles.honeyPigMeter} aria-label={copy.meterAria}>
        <span>
          {Array.from({ length: 10 }, (_, index) => (
            <svg key={index} viewBox="0 0 18 18" aria-hidden>
              <path d="M9 2 C9 2 3 8 3 12 a6 6 0 0 0 12 0 C15 8 9 2 9 2Z" />
            </svg>
          ))}
        </span>
        <strong>10 / 10</strong>
      </div>
      <div className={styles.honeyPigChatCard}>
        <header className={styles.honeyPigChatHeader}>
          <span className={styles.honeyPigAvatar} aria-hidden>
            🐷
          </span>
          <div>
            <strong>{copy.pigName}</strong>
            <p>{copy.pigStatus}</p>
          </div>
        </header>
        <div className={styles.honeyPigChatLog} role="log" aria-live="polite">
          {messages.map((chat) => (
            <div key={chat.id} className={styles.honeyPigBubbleRow} data-role={chat.role}>
              <div className={styles.honeyPigBubble}>
                {chat.role === "pig" && chat.typing ? <TypewriterText text={chat.text} /> : renderPigAnswerText(chat.text)}
              </div>
            </div>
          ))}
          {isTyping ? (
            <div className={styles.honeyPigBubbleRow} data-role="pig">
              <div className={`${styles.honeyPigBubble} ${styles.honeyPigTypingDots}`} aria-label={copy.typingAria}>
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>
        <div className={styles.honeyPigQuickQuestions} aria-label={copy.quickAria}>
          {copy.quickQuestions.map((question) => (
            <button key={question} type="button" onClick={() => setInput(question)}>
              {question}
            </button>
          ))}
        </div>
        <div className={styles.honeyPigInputRow}>
          <input
            type="text"
            value={input}
            maxLength={100}
            placeholder={copy.placeholder}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button type="button" aria-label={copy.sendAria} disabled={!canSend} onClick={() => submitQuestion()}>
            <Send size={16} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </section>
  );
}

export default function HoneyDropRewardOverlay({ honeyDrops, burstKey, message, onOpenTarotAlbum, onRequestRefresh }: HoneyDropRewardOverlayProps) {
  const copy = useTeaHouseCopy("honeyReward", KO);
  const [showInfo, setShowInfo] = useState(false);
  const [honeyModeActive, setHoneyModeActive] = useState(false);
  const honeyDropGradientId = useId();
  const count = honeyDrops?.currentHoneyDrops ?? 0;
  const unlocked = count >= 10 || Boolean(honeyDrops?.unlocked);
  const tarotAlbumUnlocked = Boolean(honeyDrops?.tarotAlbumUnlocked);
  const albumProgress = Math.min(10, count);
  const albumProgressPercent = `${albumProgress * 10}%`;
  const showBurst = burstKey > 0 && Boolean(honeyDrops?.earnedThisResult);
  const albumStatusLabel = tarotAlbumUnlocked ? copy.albumOpen : `${albumProgress}/10`;
  const albumProgressStyle = {
    "--honey-album-progress": albumProgressPercent,
  } as CSSProperties;
  const flowerPigStyle = {
    "--honey-pig-image": `url("${fortuneTeaHouseAssets.rewards.flowerPigHoneyHug}")`,
  } as CSSProperties;

  return (
    <aside className={styles.honeyRewardLayer} data-mode={honeyModeActive ? "active" : "compact"} aria-live="polite">
      <div className={styles.honeyHeaderDock} data-unlocked={unlocked ? "true" : "false"} data-open={showInfo ? "true" : "false"}>
        <button
          type="button"
          className={styles.honeyCounter}
          aria-expanded={showInfo}
          aria-controls="fortuneTeaHoneyInfo"
          aria-label={copy.counterAria.replace("{count}", String(count))}
          onClick={() => {
            if (!showInfo) onRequestRefresh?.();
            setShowInfo((current) => !current);
          }}
        >
          <span className={styles.honeyCounterIcon} aria-hidden>
            <svg viewBox="0 0 18 22" aria-hidden>
              <defs>
                <linearGradient id={honeyDropGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fff3c4" />
                  <stop offset="55%" stopColor="#ffce54" />
                  <stop offset="100%" stopColor="#e9a63a" />
                </linearGradient>
              </defs>
              <path
                d="M9 1.4C9 1.4 2.4 9.2 2.4 13.6a6.6 6.6 0 0 0 13.2 0C15.6 9.2 9 1.4 9 1.4Z"
                fill={`url(#${honeyDropGradientId})`}
              />
              <ellipse cx="6.4" cy="12.3" rx="1.5" ry="2.4" fill="#fff8df" opacity="0.55" />
            </svg>
          </span>
          <div>
            <span>{copy.honeyLabel}</span>
            <strong>{copy.countValue.replace("{count}", String(count))}</strong>
          </div>
        </button>

        <button
          type="button"
          className={styles.honeyAlbumButton}
          data-unlocked={tarotAlbumUnlocked ? "true" : "false"}
          style={albumProgressStyle}
          onClick={() => {
            setShowInfo(false);
            setHoneyModeActive(false);
            onRequestRefresh?.();
            onOpenTarotAlbum();
          }}
          aria-label={tarotAlbumUnlocked ? copy.albumAriaUnlocked : copy.albumAriaLocked.replace("{progress}", String(albumProgress))}
        >
          <BookOpen size={14} strokeWidth={2.2} aria-hidden />
          <span className={styles.honeyAlbumText}>{copy.albumText}</span>
          <span className={styles.honeyAlbumProgress} aria-hidden>
            <i />
          </span>
          <em>{albumStatusLabel}</em>
        </button>
      </div>

      {unlocked ? (
        <button
          type="button"
          className={styles.honeyModeToggle}
          data-active={honeyModeActive ? "true" : "false"}
          aria-expanded={honeyModeActive}
          onClick={() => {
            setHoneyModeActive((current) => !current);
            setShowInfo(false);
          }}
        >
          {honeyModeActive ? copy.honeyModeClose : copy.honeyModeOpen}
        </button>
      ) : null}

      {showInfo ? (
        <div id="fortuneTeaHoneyInfo" className={styles.honeyInfoPanel} data-unlocked={unlocked ? "true" : "false"}>
          <span className={styles.honeyInfoPigBubble} aria-hidden>
            <span className={styles.honeyInfoPig} style={flowerPigStyle} />
          </span>
          <div>
            <strong>{tarotAlbumUnlocked ? copy.albumTitleUnlocked : copy.albumTitleLocked}</strong>
            <p>
              {tarotAlbumUnlocked
                ? copy.albumDescUnlocked
                : copy.albumDescLocked.replace("{count}", String(count))}
            </p>
            <div className={styles.honeyAlbumMeter} aria-label={copy.albumMeterAria.replace("{progress}", String(albumProgress))}>
              <span style={{ width: `${albumProgress * 10}%` }} />
            </div>
            <button type="button" className={styles.honeyAlbumPanelButton} onClick={onOpenTarotAlbum}>
              {tarotAlbumUnlocked ? copy.albumBtnUnlocked : copy.albumBtnLocked}
            </button>
          </div>
        </div>
      ) : null}

      {honeyModeActive && unlocked ? <HoneyPigQnaPanel /> : null}

      {showBurst ? (
        <div className={styles.honeyDropBurst} key={burstKey} aria-hidden>
          {dropFrames.map((drop, index) => (
            <span
              key={`${burstKey}-${index}`}
              style={{
                "--drop-left": drop.left,
                "--drop-delay": drop.delay,
                "--drop-scale": drop.scale,
                "--drop-frame-x": drop.frameX,
                "--drop-frame-y": drop.frameY,
                "--honey-sprite": `url("${fortuneTeaHouseAssets.rewards.honeyDrop2}")`,
              } as CSSProperties}
            />
          ))}
        </div>
      ) : null}

      {showBurst ? (
        <div className={styles.honeyRewardToast} key={`toast-${burstKey}`} data-unlocked={unlocked ? "true" : "false"}>
          <span className={styles.honeyRewardPig} style={flowerPigStyle} aria-hidden />
          <div>
            <strong>{message}</strong>
            <p>
              {unlocked
                ? copy.burstUnlocked
                : copy.burstLocked}
            </p>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
