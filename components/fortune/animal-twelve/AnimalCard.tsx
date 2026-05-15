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
      className="relative overflow-hidden rounded-[30px] border p-6 shadow-[0_20px_60px_rgba(28,10,46,0.22)]"
      style={{
        borderColor: `${palette.accent}66`,
        background: `linear-gradient(145deg, ${palette.background}, #ffffff)`,
      }}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full blur-3xl"
        style={{ backgroundColor: `${palette.primary}40` }}
      />
      <div
        className="pointer-events-none absolute -left-14 -bottom-14 h-48 w-48 rounded-full blur-3xl"
        style={{ backgroundColor: `${palette.secondary}66` }}
      />

      <div className="relative z-10 grid gap-6 lg:grid-cols-[220px_1fr] lg:items-center">
        <div className="mx-auto w-full max-w-[220px]">
          <AnimalCharacterSvg animal={animal} className="h-auto w-full" />
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-3 py-1 text-[11px] font-black tracking-[0.22em] uppercase"
              style={{ backgroundColor: `${palette.accent}22`, color: palette.accent }}
            >
              운명 동물 카드
            </span>
            <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-bold text-[#3f2f4f]">
              십이운성 {representativeStageLabel}
            </span>
          </div>

          <h3 className="text-3xl font-black text-[#2d1f40]">당신의 운명 동물은 {animal.animal_ko}입니다</h3>
          <p className="text-sm font-semibold leading-relaxed text-[#4b3b60]">{oneLine}</p>

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
                  <div className="h-2.5 rounded-full bg-[#ede8f7]">
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
