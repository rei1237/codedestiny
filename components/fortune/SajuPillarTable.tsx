import { elementOfBranch, elementOfStem, FIVE_ELEMENT_TOKENS, splitGanji } from "@/lib/five-element-colors";

export type SajuPillarInput = {
  label: string;
  ganji: string;
  tenGod?: string;
  emphasis?: boolean;
};

function PillarCell({ char, element }: { char: string; element: ReturnType<typeof elementOfStem> }) {
  const token = element ? FIVE_ELEMENT_TOKENS[element] : null;
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl py-2"
      style={token ? { backgroundColor: token.soft, color: token.color } : undefined}
    >
      <span className="text-2xl font-bold leading-none">{char || "-"}</span>
      {token && <span className="mt-1 text-[10px] font-medium tracking-wide opacity-80">{token.hanja}</span>}
    </div>
  );
}

export default function SajuPillarTable({ pillars, className = "" }: { pillars: SajuPillarInput[]; className?: string }) {
  if (!pillars.length) return null;
  // 모바일에서는 2열, 데스크탑에서는 전체 열(보통 4~5)로 — 인라인 style로 열 수를 고정하면
  // 반응형 Tailwind 클래스가 항상 밀리므로 breakpoint별 grid-cols-* 클래스만 사용한다.
  const desktopCols = pillars.length >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-4";
  return (
    <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${desktopCols} ${className}`}>
      {pillars.map((pillar, index) => {
        // 계산 실패/출생시간 모름 등의 안내 문구("계산 제한", "출생시간 모름")가 간지 자리에
        // 대신 들어올 때가 있다 — 정확히 2글자인 실제 간지일 때만 오행 카드로 쪼갠다.
        const isValidGanji = pillar.ganji.trim().length === 2;
        const { stem, branch } = isValidGanji ? splitGanji(pillar.ganji) : { stem: "", branch: "" };
        return (
          <div
            key={`${pillar.label}-${index}`}
            className={`rounded-2xl border p-2 text-center ${pillar.emphasis ? "border-white/25 bg-white/[0.06]" : "border-white/10 bg-white/[0.03]"}`}
          >
            <p className="text-xs font-semibold opacity-70">{pillar.label}</p>
            {isValidGanji ? (
              <div className="mt-1.5 grid grid-cols-2 gap-1">
                <PillarCell char={stem} element={elementOfStem(stem)} />
                <PillarCell char={branch} element={elementOfBranch(branch)} />
              </div>
            ) : (
              <p className="mt-1.5 py-2 text-xs opacity-60">{pillar.ganji || "-"}</p>
            )}
            {pillar.tenGod && <p className="mt-1.5 text-[11px] opacity-70">{pillar.tenGod}</p>}
          </div>
        );
      })}
    </div>
  );
}
