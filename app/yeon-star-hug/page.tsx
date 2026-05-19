"use client";

import Image from "next/image";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import html2canvas from "html2canvas";
import {
  BatteryLow,
  Cloud,
  CloudRain,
  Coins,
  Download,
  Heart,
  Moon,
  Share2,
  Smile,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";

type EmotionKey = "happy" | "calm" | "tired" | "worried" | "flutter" | "blue";

type EmotionOption = {
  key: EmotionKey;
  label: string;
  Icon: LucideIcon;
  tone: string;
};

type HoroscopePack = {
  sign: string;
  period: string;
  overall: number;
  love: number;
  money: number;
  luckyItem: string;
  warmMessage: string;
};

const HERO_IMAGE = "/fuctionassets/%EC%97%B0%EC%9D%B4%EC%9D%98%20%EB%A7%88%EC%9D%8C%20%EB%B3%84%EC%9E%90%EB%A6%AC.webp";
const SPRITE_SHEET =
  "/fuctionassets/%EC%97%B0%EC%9D%B4%20%EC%BA%90%EB%A6%AD%ED%84%B0%20%EC%8A%A4%ED%94%84%EB%9D%BC%EC%9D%B4%ED%8A%B8%20%EC%8B%9C%ED%8A%B8.webp";

const EMOTIONS: EmotionOption[] = [
  { key: "happy", label: "행복해", Icon: Smile, tone: "from-pink-300 to-orange-200" },
  { key: "calm", label: "편안해", Icon: Cloud, tone: "from-cyan-200 to-purple-200" },
  { key: "tired", label: "지쳤어", Icon: BatteryLow, tone: "from-amber-200 to-rose-200" },
  { key: "worried", label: "걱정돼", Icon: CloudRain, tone: "from-blue-200 to-purple-200" },
  { key: "flutter", label: "설레어", Icon: Sparkles, tone: "from-pink-200 to-fuchsia-200" },
  { key: "blue", label: "우울해", Icon: Moon, tone: "from-indigo-200 to-blue-200" },
];

const HOROSCOPE_BY_EMOTION: Record<EmotionKey, HoroscopePack> = {
  happy: {
    sign: "사자자리",
    period: "7.23 - 8.22",
    overall: 5,
    love: 4,
    money: 4,
    luckyItem: "핑크 로즈",
    warmMessage: "웃음이 퍼지는 날, 네 온기가 주변을 환하게 밝혀줘.",
  },
  calm: {
    sign: "천칭자리",
    period: "9.24 - 10.22",
    overall: 4,
    love: 4,
    money: 3,
    luckyItem: "라벤더 티",
    warmMessage: "고요한 마음은 오늘의 최고의 직감이야. 천천히 걸어도 괜찮아.",
  },
  tired: {
    sign: "염소자리",
    period: "12.25 - 1.19",
    overall: 3,
    love: 4,
    money: 3,
    luckyItem: "포근한 담요",
    warmMessage: "오늘은 조금 천천히 가도 괜찮아. 숨을 고르면 다시 빛나.",
  },
  worried: {
    sign: "처녀자리",
    period: "8.23 - 9.23",
    overall: 3,
    love: 3,
    money: 4,
    luckyItem: "코랄 노트",
    warmMessage: "불안은 네가 성실하다는 증거야. 작은 확신부터 차근차근.",
  },
  flutter: {
    sign: "물고기자리",
    period: "2.19 - 3.20",
    overall: 5,
    love: 5,
    money: 3,
    luckyItem: "진주 헤어핀",
    warmMessage: "설렘이 좋은 방향으로 흐르는 날. 마음이 가는 쪽을 믿어봐.",
  },
  blue: {
    sign: "게자리",
    period: "6.22 - 7.22",
    overall: 3,
    love: 4,
    money: 2,
    luckyItem: "바닐라 캔들",
    warmMessage: "괜찮지 않은 날도 괜찮아. 오늘의 너를 부드럽게 안아줄게.",
  },
};

const STAR_DOTS = [
  { left: "6%", top: "12%", delay: 0.1 },
  { left: "18%", top: "24%", delay: 0.8 },
  { left: "32%", top: "9%", delay: 1.3 },
  { left: "44%", top: "20%", delay: 1.8 },
  { left: "58%", top: "13%", delay: 0.4 },
  { left: "72%", top: "29%", delay: 1.2 },
  { left: "85%", top: "18%", delay: 1.7 },
  { left: "91%", top: "34%", delay: 0.6 },
  { left: "11%", top: "41%", delay: 1.1 },
  { left: "27%", top: "49%", delay: 1.9 },
  { left: "48%", top: "43%", delay: 0.7 },
  { left: "66%", top: "52%", delay: 1.6 },
  { left: "82%", top: "47%", delay: 1.5 },
  { left: "7%", top: "70%", delay: 0.9 },
  { left: "22%", top: "79%", delay: 1.4 },
  { left: "38%", top: "72%", delay: 0.3 },
  { left: "53%", top: "86%", delay: 1.8 },
  { left: "71%", top: "74%", delay: 0.5 },
  { left: "86%", top: "82%", delay: 1.25 },
];

const SPRITE_FRAMES = 6;

function RatingStars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${value}점`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < value ? "fill-pink-400 text-pink-400" : "text-pink-200/60"}`}
          strokeWidth={1.8}
        />
      ))}
    </div>
  );
}

export default function YeonStarHugPage() {
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionKey>("calm");
  const [spriteError, setSpriteError] = useState(false);
  const [heroError, setHeroError] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(" ");
  const [frame, setFrame] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const selectedData = HOROSCOPE_BY_EMOTION[selectedEmotion];
  const activeEmotion = useMemo(
    () => EMOTIONS.find((item) => item.key === selectedEmotion) ?? EMOTIONS[0],
    [selectedEmotion]
  );

  const spriteStyle = useMemo<CSSProperties>(() => {
    const frameStep = SPRITE_FRAMES > 1 ? (frame / (SPRITE_FRAMES - 1)) * 100 : 0;
    return {
      backgroundImage: `url(${SPRITE_SHEET})`,
      backgroundSize: `${SPRITE_FRAMES * 100}% 100%`,
      backgroundPosition: `${frameStep}% 50%`,
      imageRendering: "auto",
    };
  }, [frame]);

  const handleShare = async () => {
    if (!cardRef.current || isExporting) return;

    setIsExporting(true);
    setShareFeedback("카드를 준비하고 있어요...");

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: Math.min(window.devicePixelRatio || 2, 2.2),
        useCORS: true,
      });

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png", 1);
      });

      const shareText = `${activeEmotion.label} 감정의 오늘, ${selectedData.sign} 별빛으로 연이가 따뜻한 위로를 전해요.`;
      const fileName = `yeon-heart-card-${selectedEmotion}.png`;

      if (blob) {
        const file = new File([blob], fileName, { type: "image/png" });

        if (navigator.share && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "연이의 마음 별자리",
            text: shareText,
            files: [file],
          });
          setShareFeedback("이미지 카드 공유가 완료됐어요.");
        } else {
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = fileName;
          link.click();
          URL.revokeObjectURL(link.href);

          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
            setShareFeedback("이미지는 저장했고, 공유 문구는 클립보드에 복사했어요.");
          } else {
            setShareFeedback("이미지 저장이 완료됐어요.");
          }
        }
      } else {
        setShareFeedback("이미지 변환에 실패했어요. 잠시 후 다시 시도해 주세요.");
      }
    } catch {
      setShareFeedback("공유 도중 문제가 생겼어요. 다시 눌러볼까요?");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-pink-200 via-purple-100 to-yellow-100 px-4 py-8 text-slate-700 md:px-8 lg:px-10">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-20 top-12 h-72 w-72 rounded-full bg-pink-300/35 blur-3xl" />
        <div className="absolute right-[-6rem] top-[-4rem] h-80 w-80 rounded-full bg-purple-200/45 blur-3xl" />
        <div className="absolute bottom-[-7rem] left-1/2 h-80 w-[30rem] -translate-x-1/2 rounded-full bg-yellow-100/70 blur-3xl" />
        <div className="absolute left-6 top-20 h-24 w-44 rounded-full bg-white/40 blur-2xl" />
        <div className="absolute right-10 top-32 h-20 w-36 rounded-full bg-white/45 blur-2xl" />
        {STAR_DOTS.map((dot, idx) => (
          <motion.span
            key={idx}
            className="absolute text-pink-300/80"
            style={{ left: dot.left, top: dot.top }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 2.8, repeat: Infinity, delay: dot.delay, ease: "easeInOut" }}
          >
            ✦
          </motion.span>
        ))}
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="grid gap-5 rounded-[2.2rem] border border-white/40 bg-white/65 p-5 shadow-[0_8px_30px_rgb(244,114,182,0.2)] backdrop-blur-sm md:grid-cols-[1.15fr_0.85fr] md:p-8"
        >
          <div className="space-y-4">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white/80 px-4 py-2 text-sm font-semibold text-pink-500"
            >
              <Heart className="h-4 w-4 fill-pink-300 text-pink-400" />
              오늘 하루 어땠어?
            </motion.div>

            <h1 className="font-['ui-rounded','Nunito',sans-serif] text-3xl font-black leading-tight md:text-5xl">
              <span className="bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">
                연이의 마음 별자리
              </span>
            </h1>
            <p className="font-['ui-rounded','Nunito',sans-serif] text-sm text-slate-600 md:text-base">
              꽃돼지 연이가 전하는 따뜻한 별자리 위로
            </p>
            <p className="max-w-2xl text-sm text-slate-500">
              감정을 고르고, 오늘의 별빛 흐름을 만나보세요. 한 장의 마음 카드로 저장하고 공유할 수 있어요.
            </p>
          </div>

          <div className="relative flex items-center justify-center overflow-hidden rounded-[1.8rem] border border-pink-100 bg-gradient-to-br from-pink-100/80 via-white/75 to-orange-100/70 p-4">
            {!heroError ? (
              <Image
                src={HERO_IMAGE}
                alt="연이의 마음 별자리 아트"
                width={900}
                height={620}
                className="h-auto w-full rounded-[1.3rem] object-cover"
                onError={() => setHeroError(true)}
                priority
              />
            ) : (
              <div className="flex h-full min-h-40 w-full flex-col items-center justify-center rounded-[1.3rem] bg-pink-50/80 text-pink-400">
                <Sparkles className="mb-2 h-8 w-8" />
                <p className="text-sm font-semibold">몽글한 별빛 무드 로딩중</p>
              </div>
            )}

            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-3 left-4"
            >
              {!spriteError ? (
                <button
                  type="button"
                  onClick={() => setFrame((prev) => (prev + 1) % SPRITE_FRAMES)}
                  className="group rounded-2xl border border-pink-200/80 bg-white/80 p-2 shadow-[0_10px_28px_rgba(244,114,182,0.28)]"
                  aria-label="연이 캐릭터 프레임 넘기기"
                >
                  <div
                    className="h-20 w-20 rounded-xl bg-no-repeat"
                    style={spriteStyle}
                    onError={() => setSpriteError(true)}
                  />
                  <span className="mt-1 block text-[10px] font-semibold text-pink-500 opacity-80 group-hover:opacity-100">연이 톡!</span>
                </button>
              ) : (
                <div className="rounded-2xl border border-pink-200 bg-white/85 p-3 text-pink-400">
                  <Heart className="h-8 w-8 fill-pink-200 text-pink-400" />
                </div>
              )}
            </motion.div>
          </div>
        </motion.section>

        <section className="grid gap-5 xl:grid-cols-4">
          <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="rounded-[2rem] border border-white/50 bg-white/90 p-5 shadow-[0_8px_30px_rgb(244,114,182,0.2)] backdrop-blur-sm"
          >
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-pink-400">STEP 1</p>
            <h2 className="text-lg font-black text-slate-700">감정 선택</h2>
            <p className="mb-4 mt-1 text-sm text-slate-500">오늘의 마음과 가장 가까운 버튼을 눌러줘.</p>

            <div className="grid grid-cols-3 gap-2">
              {EMOTIONS.map((emotion) => {
                const isActive = selectedEmotion === emotion.key;
                return (
                  <motion.button
                    key={emotion.key}
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ y: -3 }}
                    onClick={() => setSelectedEmotion(emotion.key)}
                    className={`rounded-2xl border px-2 py-3 text-center transition-all ${
                      isActive
                        ? `border-pink-300 bg-gradient-to-br ${emotion.tone} shadow-[0_8px_20px_rgba(244,114,182,0.26)]`
                        : "border-pink-100 bg-white"
                    }`}
                  >
                    <emotion.Icon className="mx-auto mb-1 h-4 w-4 text-pink-500" />
                    <span className="text-xs font-bold text-slate-700">{emotion.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.18 }}
            className="rounded-[2rem] border border-white/50 bg-white/90 p-5 shadow-[0_8px_30px_rgb(244,114,182,0.2)] backdrop-blur-sm"
          >
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-pink-400">STEP 2</p>
            <h2 className="text-lg font-black text-slate-700">따뜻한 위로</h2>
            <div className="mt-4 rounded-2xl bg-gradient-to-br from-pink-100/70 via-white to-purple-100/70 p-4">
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-pink-400 shadow">
                <Heart className="h-5 w-5 fill-pink-200" />
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={selectedEmotion}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  className="text-sm font-semibold leading-relaxed text-slate-700"
                >
                  {selectedData.warmMessage}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.26 }}
            className="rounded-[2rem] border border-white/50 bg-white/90 p-5 shadow-[0_8px_30px_rgb(244,114,182,0.2)] backdrop-blur-sm"
          >
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-pink-400">STEP 3</p>
            <h2 className="text-lg font-black text-slate-700">별자리 운세</h2>

            <div className="mt-3 rounded-2xl border border-pink-100 bg-pink-50/70 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-pink-500 shadow-sm">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-700">{selectedData.sign}</p>
                  <p className="text-xs text-slate-500">{selectedData.period}</p>
                </div>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>전체 운세</span>
                  <RatingStars value={selectedData.overall} />
                </div>
                <div className="flex items-center justify-between">
                  <span>연애 운세</span>
                  <RatingStars value={selectedData.love} />
                </div>
                <div className="flex items-center justify-between">
                  <span>금전 운세</span>
                  <RatingStars value={selectedData.money} />
                </div>
              </div>
              <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold text-pink-500">
                행운 아이템: {selectedData.luckyItem}
              </p>
            </div>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.34 }}
            className="rounded-[2rem] border border-white/50 bg-white/90 p-5 shadow-[0_8px_30px_rgb(244,114,182,0.2)] backdrop-blur-sm"
          >
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-pink-400">STEP 4</p>
            <h2 className="text-lg font-black text-slate-700">마음 카드 공유</h2>

            <div
              ref={cardRef}
              className="mt-3 rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-200/60 via-white to-purple-200/60 p-4"
            >
              <p className="text-xs font-bold text-pink-500">YEON HEART CARD</p>
              <p className="mt-2 text-sm font-black text-slate-700">오늘의 감정: {activeEmotion.label}</p>
              <p className="mt-1 text-xs text-slate-600">별자리: {selectedData.sign}</p>
              <p className="mt-3 text-sm font-semibold text-slate-700">{selectedData.warmMessage}</p>
            </div>

            <button
              type="button"
              onClick={handleShare}
              disabled={isExporting}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-400 to-pink-400 px-4 py-3 text-sm font-bold text-white shadow-[0_10px_18px_rgba(251,113,133,0.36)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isExporting ? <Download className="h-4 w-4 animate-pulse" /> : <Share2 className="h-4 w-4" />}
              {isExporting ? "마음 카드 준비중..." : "공유하기"}
            </button>
            <p className="mt-2 min-h-5 text-xs text-slate-500">{shareFeedback}</p>
          </motion.article>
        </section>

        <motion.nav
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.4 }}
          className="grid grid-cols-2 gap-2 pb-2 sm:grid-cols-4"
          aria-label="기능 요약 배지"
        >
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-pink-200 bg-white/85 px-4 py-2 text-xs font-semibold text-pink-500 shadow-sm">
            <Heart className="h-4 w-4" /> 감정 선택
          </div>
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-purple-200 bg-white/85 px-4 py-2 text-xs font-semibold text-purple-500 shadow-sm">
            <Sparkles className="h-4 w-4" /> 별자리 운세
          </div>
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-200 bg-white/85 px-4 py-2 text-xs font-semibold text-amber-500 shadow-sm">
            <Cloud className="h-4 w-4" /> 힐링 메시지
          </div>
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-white/85 px-4 py-2 text-xs font-semibold text-rose-500 shadow-sm">
            <Coins className="h-4 w-4" /> 공유 카드
          </div>
        </motion.nav>
      </div>
    </main>
  );
}
