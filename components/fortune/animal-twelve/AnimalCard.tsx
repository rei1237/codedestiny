import type { AnimalDestinyData } from "@/app/saju/animal-destiny/lib/types";
import AnimalCharacterSvg from "./AnimalCharacterSvg";

type Props = {
  animal: AnimalDestinyData;
  representativeStageLabel: string;
  oneLine: string;
};

const ENERGY_LABELS: Array<{ key: keyof AnimalDestinyData["energyScores"]; label: string }> = [
  { key: "charm", label: "매력" },
  { key: "drive", label: "추진력" },
  { key: "recovery", label: "회복력" },
  { key: "money", label: "재물감각" },
  { key: "love", label: "연애온도" },
  { key: "intuition", label: "직감력" },
];

function scoreTone(score: number) {
  if (score >= 86) return "매우 강함";
  if (score >= 74) return "강함";
  if (score >= 62) return "균형";
  return "보강 필요";
}

export default function AnimalCard({ animal, representativeStageLabel, oneLine }: Props) {
  const palette = animal.palette;

  return (
    <article
      className="relative overflow-hidden rounded-[34px] border p-6 shadow-[0_26px_70px_rgba(19,28,48,0.17)] sm:p-7"
      style={{
        borderColor: `${palette.accent}66`,
        background: `linear-gradient(160deg, rgba(255,255,255,0.95) 0%, ${palette.background} 62%, #ffffff 100%)`,
      }}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl"
        style={{ backgroundColor: `${palette.primary}2e` }}
      />
      <div
        className="pointer-events-none absolute -left-16 -bottom-16 h-56 w-56 rounded-full blur-3xl"
        style={{ backgroundColor: `${palette.secondary}52` }}
      />

      <div className="relative z-10 grid gap-7 lg:grid-cols-[200px_1fr] lg:items-center">
        <div className="mx-auto w-full max-w-[200px]">
          <AnimalCharacterSvg animal={animal} className="h-auto w-full" />
        </div>

        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className="rounded-full px-3.5 py-1.5 text-[11px] font-black tracking-[0.2em] uppercase"
              style={{ backgroundColor: `${palette.accent}22`, color: palette.accent }}
            >
              운명 동물 카드
            </span>
            <span className="rounded-full border border-black/5 bg-white/70 px-3.5 py-1.5 text-xs font-bold text-[#3f2f4f]">
              십이운성 {representativeStageLabel}
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="text-[2rem] font-black leading-tight text-[#2d1f40]">당신의 운명 동물은 {animal.animal_ko}입니다</h3>
            <p className="max-w-3xl text-[15px] font-semibold leading-relaxed text-[#4b3b60]">{oneLine}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {animal.keywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full px-3 py-1 text-xs font-bold"
                style={{ backgroundColor: `${palette.primary}1a`, color: "#4b3b60" }}
              >
                #{keyword}
              </span>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ENERGY_LABELS.map((item) => {
              const score = animal.energyScores[item.key];
              return (
                <div key={item.key} className="rounded-2xl border border-black/5 bg-white/70 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs font-bold text-[#56456c]">
                    <span>{item.label}</span>
                    <span>{score}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#ece8f8]">
                    <div
                      className="h-2.5 rounded-full"
                      style={{
                        width: `${score}%`,
                        background: `linear-gradient(90deg, ${palette.primary}, ${palette.accent})`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] font-semibold text-[#6a5a7f]">{scoreTone(score)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </article>
  );
}
