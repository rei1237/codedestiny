"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";

type Totem = {
  id: string;
  name: string;
  icon: string;
  category: "기본" | "지상" | "공중" | "물/기타";
  keyword: string;
  advice: string;
};

const TOTEMS: Totem[] = [
  {
    id: "cat",
    name: "고양이",
    icon: "🐱",
    category: "기본",
    keyword: "독립심과 직관",
    advice: "당신만의 페이스로 걸어가도 괜찮아요. 야옹!",
  },
  {
    id: "squirrel",
    name: "다람쥐",
    icon: "🐿️",
    category: "기본",
    keyword: "준비와 활기",
    advice: "작은 노력이 큰 결실이 될 거예요. 도토리를 모으듯 차근차근!",
  },
  {
    id: "bluebird",
    name: "파랑새",
    icon: "🐦",
    category: "기본",
    keyword: "희망과 소식",
    advice: "행운은 멀리 있지 않아요. 바로 당신의 어깨 위에 있죠.",
  },
  {
    id: "puppy",
    name: "강아지",
    icon: "🐶",
    category: "기본",
    keyword: "충성심과 사랑",
    advice: "당신은 혼자가 아니에요. 곁에 있는 소중한 인연을 믿으세요.",
  },
  {
    id: "rabbit",
    name: "토끼",
    icon: "🐰",
    category: "기본",
    keyword: "도약과 풍요",
    advice: "겁내지 말고 폴짝 뛰어보세요. 새로운 세상이 기다려요!",
  },
  {
    id: "wolf",
    name: "늑대",
    icon: "🐺",
    category: "지상",
    keyword: "직관, 자유",
    advice: "자신의 본능을 믿으세요. 공동체와 함께하되 개성을 잃지 마세요.",
  },
  {
    id: "bear",
    name: "곰",
    icon: "🐻",
    category: "지상",
    keyword: "성찰, 치유",
    advice: "지금은 내면으로 들어갈 시간입니다. 휴식을 통해 힘을 회복하세요.",
  },
  {
    id: "deer",
    name: "사슴",
    icon: "🦌",
    category: "지상",
    keyword: "부드러움, 민감",
    advice: "강함보다 부드러움이 필요한 때입니다. 주변의 변화를 예민하게 살피세요.",
  },
  {
    id: "tiger",
    name: "호랑이",
    icon: "🐯",
    category: "지상",
    keyword: "용기, 의지력",
    advice: "당신은 충분한 힘을 가졌습니다. 목표를 향해 집중하고 돌진하세요.",
  },
  {
    id: "owl",
    name: "올빼미",
    icon: "🦉",
    category: "공중",
    keyword: "지혜, 통찰",
    advice: "겉모습 너머의 진실을 보세요. 밤의 어둠 속에서도 길을 찾을 수 있습니다.",
  },
  {
    id: "eagle",
    name: "독수리",
    icon: "🦅",
    category: "공중",
    keyword: "고결, 시야",
    advice: "사소한 문제에서 벗어나 더 넓은 시야로 인생의 큰 그림을 그리세요.",
  },
  {
    id: "butterfly",
    name: "나비",
    icon: "🦋",
    category: "공중",
    keyword: "변화, 가벼움",
    advice: "변화는 아름다운 것입니다. 과거의 허물을 벗고 새로운 모습으로 날아오르세요.",
  },
  {
    id: "crow",
    name: "까마귀",
    icon: "🐦‍⬛",
    category: "공중",
    keyword: "마법, 창조",
    advice: "우연한 일들에 주목하세요. 지금 당신 주변에는 변화의 마법이 일어나고 있습니다.",
  },
  {
    id: "dolphin",
    name: "돌고래",
    icon: "🐬",
    category: "물/기타",
    keyword: "조화, 유희",
    advice: "삶을 너무 심각하게 생각하지 마세요. 호흡하고, 즐기고, 소통하세요.",
  },
  {
    id: "turtle",
    name: "거북이",
    icon: "🐢",
    category: "물/기타",
    keyword: "인내, 보호",
    advice: "천천히 가도 괜찮습니다. 자신의 속도를 유지하며 꾸준히 나아가세요.",
  },
  {
    id: "snake",
    name: "뱀",
    icon: "🐍",
    category: "물/기타",
    keyword: "재생, 생명력",
    advice: "낡은 감정을 벗어던질 때입니다. 생명 에너지를 회복하고 다시 태어나세요.",
  },
  {
    id: "fox",
    name: "여우",
    icon: "🦊",
    category: "물/기타",
    keyword: "기지, 적응",
    advice: "상황에 맞춰 유연하게 대처하세요. 지혜로운 관찰이 문제를 해결해 줄 것입니다.",
  },
];

const STAR_FIELD = Array.from({ length: 28 }, (_, idx) => ({
  id: idx,
  top: `${(idx * 13) % 100}%`,
  left: `${(idx * 19) % 100}%`,
  delay: (idx % 7) * 0.25,
  duration: 2.2 + (idx % 5) * 0.45,
}));

function shuffle<T>(items: T[]) {
  const cloned = [...items];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

const CATEGORY_WEIGHTS: Record<Totem["category"], number> = {
  기본: 0.2,
  지상: 0.33,
  공중: 0.27,
  "물/기타": 0.2,
};

function pickDeck(pool: Totem[], size: number) {
  const grouped = pool.reduce<Record<string, Totem[]>>((acc, item) => {
    const key = item.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  Object.keys(grouped).forEach((key) => {
    grouped[key] = shuffle(grouped[key]);
  });

  const picked: Totem[] = [];
  let guard = 0;
  while (picked.length < size && guard < 120) {
    guard += 1;
    const candidates = Object.entries(grouped)
      .filter(([, list]) => list.length > 0)
      .map(([category]) => ({
        category,
        weight: CATEGORY_WEIGHTS[category as Totem["category"]] ?? 0.1,
      }));
    if (candidates.length === 0) break;
    const total = candidates.reduce((sum, item) => sum + item.weight, 0);
    const rand = Math.random() * total;
    let acc = 0;
    let selected = candidates[0].category;
    for (const candidate of candidates) {
      acc += candidate.weight;
      if (rand <= acc) {
        selected = candidate.category;
        break;
      }
    }
    const card = grouped[selected].pop();
    if (card) picked.push(card);
  }
  return picked;
}

export default function AnimalTotem() {
  const deck = useMemo(() => pickDeck(TOTEMS, 5), []);
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [selectedTotem, setSelectedTotem] = useState<Totem | null>(null);
  const [query, setQuery] = useState("");

  const normalized = query.trim();
  const suggestedTotems = useMemo(() => {
    if (!normalized) return TOTEMS;
    return TOTEMS.filter((totem) => totem.name.includes(normalized));
  }, [normalized]);

  const onFlip = (totem: Totem) => {
    if (!flippedIds.includes(totem.id)) {
      setFlippedIds((prev) => [...prev, totem.id]);
    }
    setSelectedTotem(totem);
    setQuery(totem.name);
  };

  const ANIMAL_FIGURES = ["🐱", "🐶", "🐰", "🦊", "🐻", "🐦", "🦋", "🦉", "🐬", "🐢", "🐿️", "🦌", "🐺", "🦅"];
  const animalPositions = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: `animal-${i}`,
        icon: ANIMAL_FIGURES[i % ANIMAL_FIGURES.length],
        top: `${(i * 7 + 5) % 95}%`,
        left: `${(i * 11 + 3) % 92}%`,
        size: 18 + (i % 4) * 4,
        delay: i * 0.3,
        duration: 12 + (i % 5) * 2,
      })),
    []
  );

  return (
    <section className="relative min-h-[120vh] overflow-hidden bg-gradient-to-br from-[#1a1533] via-[#372d62] to-[#0e1f45] px-4 py-14 text-white sm:px-8 sm:py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(244,114,182,0.28),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(125,211,252,0.2),transparent_30%),radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.16),transparent_45%)]" />

      {STAR_FIELD.map((star) => (
        <motion.span
          key={star.id}
          className="pointer-events-none absolute h-1 w-1 rounded-full bg-yellow-100 shadow-[0_0_12px_rgba(253,224,71,0.9)]"
          style={{ top: star.top, left: star.left }}
          initial={{ opacity: 0.2, scale: 0.6 }}
          animate={{ opacity: [0.2, 0.9, 0.25], scale: [0.6, 1.2, 0.7] }}
          transition={{
            duration: star.duration,
            repeat: Number.POSITIVE_INFINITY,
            delay: star.delay,
            ease: "easeInOut",
          }}
        />
      ))}
      {animalPositions.map((a) => (
        <motion.span
          key={a.id}
          className="pointer-events-none absolute select-none"
          style={{
            top: a.top,
            left: a.left,
            fontSize: a.size,
            filter: "drop-shadow(0 0 6px rgba(250,204,21,0.85)) drop-shadow(0 0 12px rgba(253,224,71,0.5))",
          }}
          initial={{ opacity: 0.4, y: 20 }}
          animate={{
            opacity: [0.4, 0.85, 0.5],
            y: [20, -10, 20],
          }}
          transition={{
            duration: a.duration,
            repeat: Number.POSITIVE_INFINITY,
            delay: a.delay,
            ease: "easeInOut",
          }}
          aria-hidden
        >
          {a.icon}
        </motion.span>
      ))}

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8">
        <motion.header
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="rounded-[2rem] border border-white/30 bg-white/10 px-6 py-8 text-center shadow-[0_22px_55px_rgba(15,23,42,0.42)] backdrop-blur-xl"
        >
          <p className="mb-3 inline-flex rounded-full border border-yellow-200/70 bg-yellow-200/20 px-4 py-1.5 text-[11px] font-semibold tracking-[0.2em] text-yellow-100">
            MYSTIC ANIMAL TOTEM
          </p>
          <h1 className="text-2xl font-bold leading-snug text-pink-50 sm:text-4xl">
            당신을 지켜주는 작은 영혼을 만나보세요
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-violet-100/90 sm:text-base">
            별빛이 인도하는 카드를 한 장 골라, 오늘의 수호 동물 메시지를 받아보세요.
          </p>
        </motion.header>

        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-[2rem] border border-white/25 bg-white/10 p-5 shadow-[0_20px_48px_rgba(76,29,149,0.28)] backdrop-blur-xl sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-pink-50 sm:text-xl">카드 뽑기</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {deck.map((totem, index) => {
                const flipped = flippedIds.includes(totem.id);
                return (
                  <motion.button
                    key={totem.id}
                    type="button"
                    onClick={() => onFlip(totem)}
                    whileHover={{ y: -8, scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="group relative h-44 [perspective:1000px] sm:h-52"
                  >
                    <motion.div
                      animate={{ rotateY: flipped ? 360 : 0 }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                      className="relative h-full w-full rounded-3xl border border-white/30 [transform-style:preserve-3d]"
                    >
                      <div className="absolute inset-0 flex h-full w-full items-center justify-center rounded-3xl bg-gradient-to-b from-[#2f2961] via-[#1d1e4f] to-[#11183b] shadow-[0_16px_36px_rgba(15,23,42,0.45)] [backface-visibility:hidden]">
                        <span className="text-4xl drop-shadow-[0_0_8px_rgba(253,224,71,0.85)]">✦</span>
                        <span className="absolute bottom-4 text-xs tracking-[0.2em] text-violet-100/90">TOTEM CARD {index + 1}</span>
                      </div>

                      <div className="absolute inset-0 flex h-full w-full flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-pink-200/90 via-violet-200/90 to-sky-200/85 text-slate-900 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                        <div className="mb-2 text-5xl">{totem.icon}</div>
                        <p className="text-lg font-bold">{totem.name}</p>
                        <p className="mt-1 px-3 text-center text-xs font-medium text-slate-700">{totem.keyword}</p>
                      </div>
                    </motion.div>

                    <motion.span
                      className="pointer-events-none absolute -right-1 top-2 h-3 w-3 rounded-full bg-yellow-200/90"
                      animate={{ opacity: [0.25, 1, 0.25], scale: [0.75, 1.35, 0.75] }}
                      transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                    />
                    <motion.span
                      className="pointer-events-none absolute left-2 top-1 h-2 w-2 rounded-full bg-pink-100/90"
                      animate={{ opacity: [0.2, 0.9, 0.2], scale: [0.7, 1.2, 0.7] }}
                      transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.3 }}
                    />

                    <span className="pointer-events-none absolute inset-0 rounded-3xl border border-transparent transition-all duration-300 group-hover:border-yellow-100/60 group-hover:shadow-[0_0_24px_rgba(250,204,21,0.5)]" />
                  </motion.button>
                );
              })}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-[2rem] border border-white/25 bg-white/10 p-5 shadow-[0_20px_48px_rgba(30,58,138,0.24)] backdrop-blur-xl sm:p-6">
              <label className="mb-2 block text-sm font-semibold text-pink-50">동물 이름 검색</label>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="예: 고양이, 늑대, 올빼미"
                className="w-full rounded-2xl border border-violet-100/45 bg-slate-900/35 px-4 py-3 text-sm text-white placeholder:text-violet-100/70 outline-none transition-all duration-300 focus:border-pink-200/80 focus:ring-2 focus:ring-pink-200/55"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                {suggestedTotems.length > 0 ? (
                  suggestedTotems.map((totem) => (
                    <button
                      type="button"
                      key={totem.id}
                      onClick={() => onFlip(totem)}
                      className="rounded-full border border-pink-100/55 bg-pink-100/18 px-3 py-1.5 text-xs font-semibold text-pink-50 transition-all duration-300 hover:-translate-y-0.5 hover:border-yellow-200/90 hover:bg-yellow-100/25 hover:text-yellow-100"
                    >
                      {totem.icon} {totem.name}
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-violet-100/85">검색 결과가 없어요. 다른 동물을 입력해 보세요.</p>
                )}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {selectedTotem ? (
                <motion.div
                  key={selectedTotem.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 18 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="rounded-[2rem] border border-yellow-100/45 bg-gradient-to-br from-white/20 via-pink-100/10 to-violet-100/20 p-5 shadow-[0_22px_46px_rgba(250,204,21,0.2)] backdrop-blur-xl sm:p-6"
                >
                  <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-yellow-100">YOUR GUARDIAN TOTEM</p>
                  <h3 className="text-2xl font-bold text-pink-50">{selectedTotem.name}</h3>
                  <p className="mt-1 text-sm text-violet-50/95">
                    {selectedTotem.category} · {selectedTotem.keyword}
                  </p>

                  <div className="mt-4 rounded-3xl border border-white/35 bg-white/20 p-4">
                    <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-b from-yellow-100/85 via-pink-200/75 to-violet-200/85 text-5xl shadow-[0_10px_25px_rgba(168,85,247,0.35)]">
                      {selectedTotem.icon}
                    </div>
                    <p className="mt-3 text-center text-xs font-medium text-slate-700">
                      동화책 속 귀여운 수호신 느낌의 일러스트 플레이스홀더
                    </p>
                  </div>

                  <blockquote className="mt-4 rounded-2xl border border-pink-100/45 bg-pink-100/20 px-4 py-3 text-sm leading-6 text-violet-50">
                    &ldquo;{selectedTotem.advice}&rdquo;
                  </blockquote>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 14 }}
                  className="rounded-[2rem] border border-white/25 bg-white/10 p-5 text-sm text-violet-100/90 backdrop-blur-xl sm:p-6"
                >
                  카드 한 장을 뽑거나 검색 칩을 눌러 오늘의 애니멀 토템을 확인해 보세요.
                </motion.div>
              )}
            </AnimatePresence>
          </aside>
        </div>
      </div>
    </section>
  );
}
