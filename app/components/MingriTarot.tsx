"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TarotMode = "one" | "three";

type TarotCategory =
  | "love"
  | "reunion"
  | "friendship"
  | "wealth"
  | "loss"
  | "contract"
  | "travel"
  | "creative"
  | "health";

type DrawnCard = {
  cardId: string;
  name?: string;
  nameKr?: string;
  position?: string;
  orientation?: string;
};

type ReadingPayload = Record<string, string | string[]>;

type MingriTarotProps = {
  initialMode?: TarotMode;
  initialCategory?: TarotCategory;
  lockCategory?: boolean;
  heading?: string;
  subtitle?: string;
};

const CATEGORY_OPTIONS: Array<{ value: TarotCategory; label: string }> = [
  { value: "love", label: "연애/애정" },
  { value: "reunion", label: "재회운" },
  { value: "friendship", label: "우정/관계" },
  { value: "wealth", label: "사업운" },
  { value: "loss", label: "재물운" },
  { value: "contract", label: "계약/문서" },
  { value: "travel", label: "이동/해외" },
  { value: "creative", label: "창의/예술" },
  { value: "health", label: "건강/휴식" },
];

function spreadTypeForMode(mode: TarotMode) {
  return mode === "three" ? "three_card_past_present_future" : "one_card";
}

const ONE_CARD_POSITION = ["현재의 핵심"];
const THREE_CARD_POSITIONS = ["과거", "현재", "가까운 미래"];
const READING_CHAR_DELAY_MS = 75;

const TAROT_IMAGE_MAP: Record<string, string> = {
  M00:"thefool.webp",M01:"themagician.webp",M02:"thehighpriestess.webp",M03:"theempress.webp",
  M04:"theemperor.webp",M05:"thehierophant.webp",M06:"TheLovers.webp",M07:"thechariot.webp",
  M08:"thestrength.webp",M09:"thehermit.webp",M10:"wheeloffortune.webp",M11:"justice.webp",
  M12:"thehangedman.webp",M13:"death.webp",M14:"temperance.webp",M15:"thedevil.webp",
  M16:"thetower.webp",M17:"thestar.webp",M18:"themoon.webp",M19:"thesun.webp",
  M20:"judgement.webp",M21:"theworld.webp",
  W01:"aceofwands.webp",W02:"twoofwands.webp",W03:"threeofwands.webp",W04:"fourofwands.webp",
  W05:"fiveofwands.webp",W06:"sixofwands.webp",W07:"sevenofwands.webp",W08:"eightofwands.webp",
  W09:"nineofwands.webp",W10:"tenofwands.webp",W11:"pageofwands.webp",W12:"knightofwands.webp",
  W13:"queenofwands.webp",W14:"kingofwands.webp",
  C01:"aceofcups.webp",C02:"twoofcups.webp",C03:"threeofcups.webp",C04:"fourofcups.webp",
  C05:"fiveofcups.webp",C06:"sixofcups.webp",C07:"sevenofcups.webp",C08:"eightofcups.webp",
  C09:"nineofcups.webp",C10:"tenofcups.webp",C11:"pageofcups.webp",C12:"knightofcups.webp",
  C13:"queenofcups.webp",C14:"kingofcups.webp",
  S01:"aceofswords.webp",S02:"twoofswords.webp",S03:"threeofswords.webp",S04:"fourofswords.webp",
  S05:"fiveofswords.webp",S06:"sixofswords.webp",S07:"sevenofswords.webp",S08:"eightofswords.webp",
  S09:"nineofswords.webp",S10:"tenofswords.webp",S11:"pageofswords.webp",S12:"knightofswords.webp",
  S13:"queenofswords.webp",S14:"kingofswords.webp",
  P01:"aceofpentacles.webp",P02:"twoofpentacles.webp",P03:"threeofpentacles.webp",P04:"fourofpentacles.webp",
  P05:"fiveofpentacles.webp",P06:"sixofpentacles.webp",P07:"sevenofpentacles.webp",P08:"eightofpentacles.webp",
  P09:"nineofpentacles.webp",P10:"tenofpentacles.webp",P11:"pageofpentacles.webp",P12:"knightofpentacles.webp",
  P13:"queenofpentacles.webp",P14:"kingofpentacles.webp",
};

function cardImageUrl(cardId: string) {
  const key = String(cardId || "").toUpperCase();
  const fn = TAROT_IMAGE_MAP[key];
  return fn ? `/tarot-cards/${fn}` : `/tarot-cards/thefool.webp`;
}

const MAJOR_KR = [
  "바보", "마법사", "여사제", "여황제", "황제", "교황", "연인", "전차", "힘", "은둔자", "운명의 수레바퀴",
  "정의", "매달린 사람", "죽음", "절제", "악마", "탑", "별", "달", "태양", "심판", "세계",
];

const SUIT_KR: Record<string, string> = {
  W: "완드",
  C: "컵",
  S: "소드",
  P: "펜타클",
};

const RANK_KR: Record<string, string> = {
  "01": "에이스",
  "02": "2",
  "03": "3",
  "04": "4",
  "05": "5",
  "06": "6",
  "07": "7",
  "08": "8",
  "09": "9",
  "10": "10",
  "11": "페이지",
  "12": "나이트",
  "13": "퀸",
  "14": "킹",
};

function cardNameKr(cardId: string) {
  const key = String(cardId || "").toUpperCase();
  if (key.startsWith("M")) {
    const idx = Number(key.slice(1));
    return Number.isFinite(idx) && idx >= 0 && idx < MAJOR_KR.length
      ? MAJOR_KR[idx]
      : `메이저 ${key.slice(1)}`;
  }
  const suit = SUIT_KR[key[0]] || "타로";
  const rank = RANK_KR[key.slice(1)] || key.slice(1);
  return `${suit} ${rank}`;
}

function orientationKr(orientation?: string) {
  return orientation === "reversed" ? "역방향" : "정방향";
}

function shuffle<T>(arr: T[]) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function generateLocalReading(category: TarotCategory, mode: TarotMode, selectedCards: DrawnCard[]): ReadingPayload {
  const catLabel = CATEGORY_OPTIONS.find((c) => c.value === category)?.label || "일반";
  const summary = selectedCards
    .map((card, idx) => `${idx + 1}. ${card.position || `자리 ${idx + 1}`} · ${card.nameKr || card.cardId} (${orientationKr(card.orientation)})`)
    .join("\n");

  const opening =
    mode === "three"
      ? `${catLabel}의 기운을 원인, 현재, 다음 선택의 세 문으로 펼쳤습니다. 이번 리딩의 핵심은 단정이 아니라 흐름의 순서를 읽는 데 있습니다.`
      : `${catLabel}의 중심 기운을 한 장의 카드에 모았습니다. 지금 가장 먼저 붙잡아야 할 선택의 결을 비춥니다.`;

  const context =
    category === "love" || category === "reunion"
      ? "상대의 마음을 단정하기보다 내가 보내는 말의 온도와 간격을 먼저 정돈할 때 관계의 기운이 안정됩니다."
      : category === "wealth" || category === "contract"
        ? "손익의 크기보다 새어 나가는 기운과 감당 가능한 범위를 먼저 보면 재물의 결이 선명해집니다."
        : category === "health"
          ? "속도를 잠시 낮추고 몸이 보내는 작은 신호를 회복의 리듬으로 다시 묶어야 합니다."
          : "지금은 결과를 맞히려 하기보다 오늘 움직일 수 있는 한 걸음을 분명히 잡는 것이 유리합니다.";

  const actionPlan = [
    "오늘 안에 지킬 작은 선택 하나를 적고, 해가 지기 전에 마무리하세요.",
    "감정의 파동과 실제로 확인된 일을 분리해 적어 마음의 안개를 걷어내세요.",
    "일주일 뒤 같은 질문을 다시 열어 카드의 기운이 어떻게 변했는지 살펴보세요.",
  ];

  return {
    "명리의 첫 문": opening,
    "펼쳐진 카드": summary,
    "오행과 카드의 결": `${context}\n\n카드들은 공통적으로 "서두르지 말고 중심 기준을 먼저 세우라"는 메시지를 반복합니다.`,
    "오늘의 작은 의식": actionPlan,
    "봉인 문장": "이번 리딩은 고정된 예언이 아니라, 지금의 선택을 더 맑게 바라보도록 돕는 명리의 거울입니다.",
  };
}

export default function MingriTarot({
  initialMode = "one",
  initialCategory = "love",
  lockCategory = false,
  heading = "명리학 오라클 타로",
  subtitle = "오행의 결 위에 타로 카드를 올려 오늘의 선택 방향을 읽습니다.",
}: MingriTarotProps) {
  const router = useRouter();
  const [mode, setMode] = useState<TarotMode>(initialMode);
  const [category, setCategory] = useState<TarotCategory>(initialCategory);
  const [cards, setCards] = useState<DrawnCard[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [readingRaw, setReadingRaw] = useState<ReadingPayload | null>(null);
  const [typedReading, setTypedReading] = useState<Record<string, string>>({});

  const spreadType = useMemo(() => spreadTypeForMode(mode), [mode]);
  const requiredRevealCount = mode === "three" ? 3 : 1;
  const canRead = cards.length >= requiredRevealCount && revealedCount >= requiredRevealCount && !loading;

  useEffect(() => {
    if (!readingRaw) {
      setTypedReading({});
      return;
    }

    const entries = Object.entries(readingRaw)
      .map(([key, value]) => {
        const text = Array.isArray(value) ? value.join("\n") : String(value || "");
        return [key, text] as const;
      })
      .filter(([, text]) => text.trim().length > 0);

    if (!entries.length) {
      setTypedReading({});
      return;
    }

    setTypedReading(Object.fromEntries(entries.map(([key]) => [key, ""])));

    let sectionIdx = 0;
    let charIdx = 0;
    const timer = window.setInterval(() => {
      const current = entries[sectionIdx];
      if (!current) {
        window.clearInterval(timer);
        return;
      }
      const [key, fullText] = current;
      const nextChar = fullText.charAt(charIdx);

      if (nextChar) {
        setTypedReading((prev) => ({
          ...prev,
          [key]: (prev[key] || "") + nextChar,
        }));
        charIdx += 1;
        return;
      }

      sectionIdx += 1;
      charIdx = 0;
      if (sectionIdx >= entries.length) {
        window.clearInterval(timer);
      }
    }, READING_CHAR_DELAY_MS);

    return () => window.clearInterval(timer);
  }, [readingRaw]);

  async function startDraw() {
    setLoading(true);
    setError("");
    setReadingRaw(null);
    setCards([]);
    setRevealedCount(0);

    try {
      const deckIds = shuffle(Object.keys(TAROT_IMAGE_MAP));
      const positions = mode === "three" ? THREE_CARD_POSITIONS : ONE_CARD_POSITION;
      const picked = deckIds.slice(0, requiredRevealCount).map((cardId, idx) => ({
        cardId,
        nameKr: cardNameKr(cardId),
        position: positions[idx],
        orientation: Math.random() < 0.2 ? "reversed" : "upright",
      }));
      if (!picked.length) throw new Error("카드의 문이 아직 열리지 않았습니다.");
      setCards(picked);
    } catch (e: any) {
      setError(e?.message || "카드 뽑기 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function loadReading() {
    if (!canRead) return;
    setLoading(true);
    setError("");
    try {
      const payloadCards = cards.slice(0, requiredRevealCount);
      const localReading = generateLocalReading(category, mode, payloadCards);
      window.setTimeout(() => {
        setReadingRaw(localReading);
      }, 320);
    } catch (e: any) {
      setError(e?.message || "해석 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-3xl space-y-5">
        <section className="rounded-2xl border border-violet-500/30 bg-violet-950/35 p-5">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold">{heading}</h1>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm"
            >
              홈으로
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-300">{subtitle}</p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span>리딩 모드</span>
              <select
                className="rounded-md border border-slate-600 bg-slate-900 px-2 py-2"
                value={mode}
                onChange={(e) => setMode(e.target.value as TarotMode)}
              >
                <option value="one">원카드</option>
                <option value="three">3카드</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
                <span>질문의 문</span>
              <select
                className="rounded-md border border-slate-600 bg-slate-900 px-2 py-2"
                value={category}
                onChange={(e) => setCategory(e.target.value as TarotCategory)}
                disabled={lockCategory}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={startDraw}
            disabled={loading}
            className="mt-4 rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "카드의 결을 여는 중..." : "카드의 문 열기"}
          </button>
        </section>

        {cards.length > 0 ? (
          <section className="rounded-2xl border border-slate-700 bg-slate-900/65 p-5">
            <h2 className="mb-3 text-lg font-semibold">펼쳐진 카드</h2>
            <div className={`grid gap-3 ${mode === "three" ? "md:grid-cols-3" : "md:grid-cols-1"}`}>
              {cards.map((card, idx) => {
                const isRevealed = idx < revealedCount;
                const canReveal = idx === revealedCount && revealedCount < requiredRevealCount;
                return (
                  <button
                    key={`${card.cardId}-${idx}`}
                    type="button"
                    onClick={() => canReveal && setRevealedCount((prev) => prev + 1)}
                    disabled={!canReveal}
                    className="relative aspect-[3/4] overflow-hidden rounded-xl border border-slate-700 bg-slate-800 text-left"
                  >
                    {isRevealed ? (
                      <>
                        <Image
                          src={cardImageUrl(card.cardId)}
                          alt={card.nameKr || card.name || `tarot-${idx + 1}`}
                          fill
                          sizes="(max-width: 768px) 90vw, 300px"
                          className="object-cover"
                        />
                        <div className="absolute inset-x-2 bottom-2 rounded-md bg-black/60 px-2 py-1 text-xs">
                          {(card.nameKr || card.name || "Unknown").trim()}
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-slate-300">
                        {canReveal ? "카드의 빛 열기" : "앞선 카드의 빛을 먼저 여세요"}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={loadReading}
                disabled={!canRead}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                리딩 열기
              </button>
              <span className="text-xs text-slate-400">
                열린 카드: {revealedCount}/{requiredRevealCount}
              </span>
            </div>
          </section>
        ) : null}

        {error ? (
          <section className="rounded-xl border border-rose-600/40 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</section>
        ) : null}

        {readingRaw ? (
          <section className="rounded-2xl border border-emerald-600/35 bg-emerald-950/20 p-5">
            <h2 className="mb-3 text-lg font-semibold">명리 오라클 리딩</h2>
            <p className="mb-3 text-xs text-emerald-200/75">카드의 문장이 천천히 열립니다. 잠시 흐름을 따라가 주세요.</p>
            <div className="space-y-3 text-sm leading-7 text-slate-100">
              {Object.entries(readingRaw).map(([key, value]) => {
                if (!value) return null;
                const text = Array.isArray(value) ? value.join("\n") : String(value);
                if (!text.trim()) return null;
                const typed = typedReading[key] ?? "";
                return (
                  <article key={key} className="rounded-lg border border-emerald-800/50 bg-slate-900/40 p-3">
                    <h3 className="mb-1 text-sm font-semibold text-emerald-300">{key}</h3>
                    <pre className="whitespace-pre-wrap font-sans text-sm">{typed || " "}</pre>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

