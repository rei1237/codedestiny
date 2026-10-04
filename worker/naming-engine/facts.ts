// 엔진 결과의 저장용 요약(view)과 결정론 서술(설계서 §9·§10). LLM 서술이 실패하거나 대조기를 어긴 문단을 이것으로 대신한다.
// 숫자는 전부 엔진 값에서만 온다 — 여기서 새로 계산하는 획수·수리는 없다.

import type { NamingResultV2 } from "./engine";
import type { NamedCandidate } from "./score";
import { firstHun } from "./config/negative-meaning";
import { GRID_NAMES, type GridName } from "./suri";
import type { Element, Grade, Relation } from "./types";

export const ELEMENT_LABEL: Readonly<Record<Element, string>> = { wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)" };
export const GRADE_LABEL: Readonly<Record<Grade, string>> = { good: "길", half: "반길", bad: "흉" };
export const GRID_LABEL: Readonly<Record<GridName, string>> = { won: "원격", hyeong: "형격", i: "이격", jeong: "정격" };
export const RELATION_LABEL: Readonly<Record<Relation, string>> = { generate: "상생", same: "비화", control: "상극" };

export interface EngineCharView {
  ch: string;
  hangul: string;
  hun: string | null;
  strokes: number;
  /** 강희 부수 번호(1~214). 2026-10-04 이전 레코드에는 없다. */
  radical?: number;
  jawon: Element | null;
  /** low-confidence · disputed · court-code-variant · no-hun · buryong · rare-in-names */
  flags: string[];
}

export interface EngineCandidateView {
  rank: number;
  hangul: string;
  hanja: string;
  chars: EngineCharView[];
  strokes: { surname: number[]; name: number[]; method: string };
  grids: Record<GridName, number>;
  grades: Record<GridName, Grade>;
  samjae: { heaven: number; human: number; earth: number; total: number; combo: Element[]; grade: Grade; disputed: boolean };
  sound: { elements: Element[]; relations: Relation[]; mapping: string };
  scores: Record<string, number>;
  total: number;
  reasonKeys: string[];
}

export interface EngineView {
  engineVersion: string;
  dataVersion: string;
  schoolPreset: string;
  inputHash: string;
  tier: string;
  relaxationStage: number;
  surname: { hangul: string; hanja: string; strokes: number[]; compound: boolean; source: string };
  saju: {
    useful: Element[];
    caution: Element[];
    derivedSupport: Element[];
    timeUnknown: boolean;
    jongConditional: boolean;
    /** 원국 기둥·오행 개수(화면 요약용). 2026-10-04 이전 레코드에는 없다 — service.ts compute 가 채운다. */
    pillars?: Record<string, { g: string; j: string; gE?: string }>;
    counts?: Partial<Record<Element, number>>;
  };
  /** 추천 방식. Phase 6.5(2026-10-04) 이전 레코드에는 없다 — 없으면 "recommend" 로 읽는다. */
  strategy?: "recommend" | "choose";
  /** strategy 가 "choose" 일 때만 — 부모가 고른 한글 이름(입력 순서). */
  desiredNames?: string[];
  notices: string[];
  candidates: EngineCandidateView[];
}

const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

function candidateView(candidate: NamedCandidate, rank: number): EngineCandidateView {
  const { suri, samjae } = candidate;
  return {
    rank,
    hangul: candidate.hangul,
    hanja: candidate.hanja.join(""),
    chars: candidate.chars.map((char, k) => ({
      ch: char.ch,
      hangul: char.hangul,
      hun: char.hun ? char.hun.slice(0, 80) : null,
      strokes: char.strokes,
      radical: char.radical,
      jawon: char.jawon,
      flags: candidate.reasonKeys
        .filter((key) => key.startsWith(`char.${k}.`) || key === `practical.${k}.buryong` || key === `practical.${k}.rare-in-names`)
        .map((key) => key.split(".").pop() as string),
    })),
    strokes: { surname: [...candidate.strokes.surname], name: [...candidate.strokes.name], method: candidate.strokes.method },
    grids: { won: suri.won, hyeong: suri.hyeong, i: suri.i, jeong: suri.jeong },
    grades: { ...suri.grades },
    samjae: { heaven: samjae.heaven, human: samjae.human, earth: samjae.earth, total: samjae.total, combo: [...samjae.combo], grade: samjae.grade, disputed: samjae.disputed },
    sound: { elements: [...candidate.sound.elements], relations: [...candidate.sound.relations], mapping: candidate.sound.mapping },
    scores: Object.fromEntries(Object.entries(candidate.scores).map(([key, value]) => [key, round(value, 3)])),
    total: round(candidate.total, 1),
    reasonKeys: [...candidate.reasonKeys],
  };
}

/** 저장·응답용 요약. 결과 레코드에 그대로 들어가므로 데이터 원본(태그 전체·근거 코드)은 싣지 않는다. */
export function engineView(result: NamingResultV2): EngineView {
  return {
    engineVersion: result.engineVersion,
    dataVersion: result.dataVersion,
    schoolPreset: result.schoolPreset,
    inputHash: result.inputHash,
    tier: result.tier,
    relaxationStage: result.relaxationStage,
    surname: {
      hangul: result.surname.hangul,
      hanja: result.surname.hanja.join(""),
      strokes: [...result.surname.strokes],
      compound: result.surname.compound,
      source: result.surname.source,
    },
    saju: {
      useful: [...result.saju.useful],
      caution: [...result.saju.caution],
      derivedSupport: [...result.saju.derivedSupport],
      timeUnknown: result.saju.timeUnknown,
      jongConditional: result.saju.jongConditional,
    },
    strategy: result.strategy,
    ...(result.strategy === "choose" ? { desiredNames: [...result.desiredNames] } : {}),
    notices: [...result.notices],
    candidates: result.candidates.map((candidate, index) => candidateView(candidate, index + 1)),
  };
}

// ── 한국어 조사 ──

function lastHangul(word: string): string | null {
  const chars = Array.from(String(word || ""));
  for (let k = chars.length - 1; k >= 0; k--) if (chars[k] >= "가" && chars[k] <= "힣") return chars[k];
  return null;
}

/** 마지막 한글 음절의 받침으로 조사를 고른다. "으로/로"는 ㄹ 받침도 "로". 한글이 없으면 받침 없는 쪽. */
export function particle(word: string, withBatchim: string, without: string): string {
  const syllable = lastHangul(word);
  if (!syllable) return without;
  const jong = (syllable.charCodeAt(0) - 0xac00) % 28;
  if (withBatchim === "으로" && jong === 8) return without;
  return jong ? withBatchim : without;
}

// ── 결정론 서술 ──

export { firstHun };

const labels = (elements: Element[]) => elements.map((e) => ELEMENT_LABEL[e]).join("·");
export function fullName(view: EngineView, candidate: EngineCandidateView): string {
  return `${view.surname.hangul}${candidate.hangul}(${view.surname.hanja}${candidate.hanja})`;
}

const METHOD_LABEL: Record<string, string> = { won: "원획 기준", pil: "필획 기준" };

/** 후보 하나의 계산값 문단. 대조기가 어긴 문단을 이것으로 바꾼다. */
export function factParagraph(view: EngineView, candidate: EngineCandidateView): string {
  const surnameChars = Array.from(view.surname.hanja);
  const strokes = [
    ...surnameChars.map((ch, k) => `${ch} ${view.surname.strokes[k]}획`),
    ...candidate.chars.map((char) => `${char.ch} ${char.strokes}획`),
  ].join(", ");
  const grids = GRID_NAMES.map((grid) => `${GRID_LABEL[grid]} ${candidate.grids[grid]}(${GRADE_LABEL[candidate.grades[grid]]})`).join(" · ");
  const samjae = `삼재는 ${labels(candidate.samjae.combo)} 조합으로 ${GRADE_LABEL[candidate.samjae.grade]}${candidate.samjae.disputed ? "(출처마다 해석이 갈림)" : ""}이며 참고 지표로만 봅니다.`;
  return `${fullName(view, candidate)}의 획수는 ${strokes}입니다(${METHOD_LABEL[candidate.strokes.method] || "원획 기준"}). 수리 4격은 ${grids}입니다. ${samjae}`;
}

export function meaningText(view: EngineView, candidate: EngineCandidateView): string {
  const parts = candidate.chars.map((char) => char.hun
    ? `${char.ch}${particle(char.hangul, "은", "는")} '${firstHun(char.hun)}'`
    : `${char.ch}(${char.hangul})${particle(char.hangul, "은", "는")} 훈이 사전에 실려 있지 않아 자전 확인이 필요한 글자`);
  return `${fullName(view, candidate)}에서 ${parts.join(", ")}입니다. 글자의 훈을 함께 소리 내어 읽어 보며 이름에 담고 싶은 바람과 맞는지 살펴보세요.`;
}

export function sajuSupportText(view: EngineView, candidate: EngineCandidateView): string {
  const { useful, caution, derivedSupport } = view.saju;
  return candidate.chars.map((char) => {
    if (!char.jawon) return `${char.ch}의 자원오행은 아직 분류 근거가 확정되지 않았습니다.`;
    const label = ELEMENT_LABEL[char.jawon];
    const head = `${char.ch}의 자원오행 ${label}${particle(label, "은", "는")}`;
    if (useful.includes(char.jawon)) return `${head} 이 사주의 용신 오행이라 부족한 기운을 직접 채웁니다.`;
    if (derivedSupport.includes(char.jawon)) return `${head} 용신을 생해 주는 오행이라 간접적으로 힘을 보탭니다.`;
    if (caution.includes(char.jawon)) return `${head} 이 사주에서 주의할 오행이라, 다른 글자와의 균형을 함께 보시길 권합니다.`;
    return `${head} 용신·주의 오행 어느 쪽에도 기울지 않은 중립 오행입니다.`;
  }).join(" ");
}

export function soundFeelText(view: EngineView, candidate: EngineCandidateView): string {
  const syllables = [...Array.from(view.surname.hangul), ...Array.from(candidate.hangul)];
  const flow = candidate.sound.elements.map((element, k) => `${syllables[k]} ${ELEMENT_LABEL[element]}`).join(" → ");
  const last = ELEMENT_LABEL[candidate.sound.elements[candidate.sound.elements.length - 1]];
  const relations = candidate.sound.relations.map((relation) => RELATION_LABEL[relation]).join("·");
  const controls = candidate.sound.relations.filter((relation) => relation === "control").length;
  const tail = controls
    ? "상극 연결이 섞여 있어, 실제로 여러 번 불러 보며 어감을 확인해 보시길 권합니다."
    : "부를 때 소리가 부드럽게 이어지는 흐름입니다.";
  const school = candidate.reasonKeys.includes("sound.school-sensitive") ? " 학파에 따라 소리오행 배정이 달라질 수 있는 이름입니다." : "";
  return `소리오행은 ${flow}${particle(last, "으로", "로")} 이어지며, 이웃한 소리끼리는 ${relations} 관계입니다. ${tail}${school}`;
}

function gridsSummary(candidate: EngineCandidateView): string {
  const grades = GRID_NAMES.map((grid) => candidate.grades[grid]);
  if (grades.every((grade) => grade === "good")) return "수리 4격도 모두 길하게 맞췄습니다.";
  if (grades.includes("bad")) return "수리 4격 가운데 흉으로 분류되는 격이 있어, 다른 후보와 견주어 보시길 권합니다.";
  return "수리 4격 가운데 반길이 섞여 있어, 다른 후보와 견주어 보시길 권합니다.";
}

export function letterText(view: EngineView, candidate: EngineCandidateView): string {
  const glosses = candidate.chars.map((char) => firstHun(char.hun)).filter(Boolean);
  const usefulChars = candidate.chars.filter((char) => char.jawon && view.saju.useful.includes(char.jawon));
  const saju = usefulChars.length
    ? `사주에 필요한 ${labels([...new Set(usefulChars.map((char) => char.jawon as Element))])} 기운을 이름 글자가 채워 줍니다.`
    : "사주의 균형을 해치지 않는 글자로 골랐습니다.";
  return [
    `${fullName(view, candidate)}${particle(candidate.hangul, "이라는", "라는")} 이름을 건넵니다.`,
    glosses.length ? `${glosses.map((gloss) => `'${gloss}'`).join(", ")}의 뜻을 담았습니다.` : "",
    saju,
    gridsSummary(candidate),
    "이름은 불릴 때마다 아이에게 건네는 첫인사입니다. 가족이 소리 내어 여러 번 불러 보고, 가장 마음이 편한 이름을 골라 주세요.",
  ].filter(Boolean).join(" ");
}

export function gridsText(candidate: EngineCandidateView): string {
  return GRID_NAMES.map((grid) => `${GRID_LABEL[grid]} ${candidate.grids[grid]}(${GRADE_LABEL[candidate.grades[grid]]})`).join("·");
}

export function summaryText(view: EngineView, candidate: EngineCandidateView): string {
  const useful = candidate.chars.some((char) => char.jawon && view.saju.useful.includes(char.jawon));
  const allGood = GRID_NAMES.every((grid) => candidate.grades[grid] === "good");
  const smooth = !candidate.sound.relations.includes("control");
  return [
    useful ? "용신 오행을 담은 이름" : "사주 균형을 해치지 않는 이름",
    allGood ? "수리 4격 모두 길" : "수리 4격 일부 반길·흉",
    smooth ? "소리 흐름 상생" : "소리 흐름 일부 상극",
  ].join(" · ");
}

export interface NarrationEntry { rank: number; meaning: string; sajuSupport: string; soundFeel: string }
export interface LetterEntry { rank: number; letter: string }
export interface Narration { source: "llm" | "llm-corrected" | "engine"; names: NarrationEntry[]; letters: LetterEntry[]; corrections?: { replaced: number; filled: number } }

export const NARRATION_NAME_COUNT = 6;
export const NARRATION_LETTER_COUNT = 3;

export function deterministicNarration(view: EngineView): Narration {
  const top = view.candidates.slice(0, NARRATION_NAME_COUNT);
  return {
    source: "engine",
    names: top.map((candidate) => ({
      rank: candidate.rank,
      meaning: meaningText(view, candidate),
      sajuSupport: sajuSupportText(view, candidate),
      soundFeel: soundFeelText(view, candidate),
    })),
    letters: top.slice(0, NARRATION_LETTER_COUNT).map((candidate) => ({ rank: candidate.rank, letter: letterText(view, candidate) })),
  };
}

/** v1 카드 모양(name·hanja·meaning·elements·soundFlow·suri·summary) + 엔진 값. 서술이 있으면 그 문장을 쓴다. */
export function engineCards(view: EngineView, narration: Narration | null) {
  const cards = view.candidates.map((candidate) => {
    const told = narration?.names.find((entry) => entry.rank === candidate.rank);
    const letter = narration?.letters.find((entry) => entry.rank === candidate.rank)?.letter || "";
    return {
      rank: candidate.rank,
      name: candidate.hangul,
      hanja: candidate.hanja,
      fullName: `${view.surname.hangul}${candidate.hangul}`,
      fullHanja: `${view.surname.hanja}${candidate.hanja}`,
      meaning: told?.meaning || meaningText(view, candidate),
      elements: candidate.chars.map((char) => (char.jawon ? ELEMENT_LABEL[char.jawon] : "미분류")).join("·"),
      soundFlow: told?.soundFeel || soundFeelText(view, candidate),
      suri: gridsText(candidate),
      summary: summaryText(view, candidate),
      sajuSupport: told?.sajuSupport || sajuSupportText(view, candidate),
      letter,
      chars: candidate.chars,
      grids: candidate.grids,
      grades: candidate.grades,
      samjae: candidate.samjae,
      total: candidate.total,
    };
  });
  const first = cards[0];
  return { cards, finalPick: first ? { name: first.name, hanja: first.hanja, reason: first.letter || first.summary } : null };
}

// ── 결정론 장(LLM 이 끝내 못 쓴 장을 채운다) ──

export interface SajuLines {
  yearPillar?: string; monthPillar?: string; dayPillar?: string; hourPillar?: string;
  dayMaster?: string; monthCommand?: string; fiveElementBalance?: string; strengthAnalysis?: string;
}

const SOUND_MAPPING_LABEL: Record<string, string> = {
  modern: "현대 작명 실무에서 널리 쓰는 배정(ㅇ·ㅎ은 토, ㅁ·ㅂ·ㅍ은 수)",
  hunminjeongeum: "훈민정음 해례본 배정(ㅁ·ㅂ·ㅍ은 토, ㅇ·ㅎ은 수)",
};

function narrationFor(view: EngineView, narration: Narration | null, candidate: EngineCandidateView) {
  const told = narration?.names.find((entry) => entry.rank === candidate.rank);
  return {
    meaning: told?.meaning || meaningText(view, candidate),
    sajuSupport: told?.sajuSupport || sajuSupportText(view, candidate),
    soundFeel: told?.soundFeel || soundFeelText(view, candidate),
    letter: narration?.letters.find((entry) => entry.rank === candidate.rank)?.letter || letterText(view, candidate),
  };
}

function strongest(candidates: EngineCandidateView[], key: string): EngineCandidateView {
  return candidates.reduce((best, candidate) => ((candidate.scores[key] ?? 0) > (best.scores[key] ?? 0) ? candidate : best), candidates[0]);
}

export function engineChapterBody(id: number, view: EngineView, saju: SajuLines, narration: Narration | null): string {
  const { useful, caution, derivedSupport, timeUnknown, jongConditional } = view.saju;
  const first = view.candidates[0];
  const top3 = view.candidates.slice(0, 3);
  const cautionText = caution.length ? labels(caution) : "뚜렷한 주의 오행 없음";
  switch (id) {
    case 1:
      return [
        `${view.surname.hangul}씨 성을 이을 아이의 사주를 펼쳐 보면, 이름으로 채워 주면 좋은 오행은 ${labels(useful)}이고 조심해서 다룰 오행은 ${cautionText}입니다.`,
        timeUnknown ? "출생 시간을 모르는 상태라 시주를 뺀 세 기둥으로 판단했습니다. 시간을 알게 되면 용신 판단이 달라질 수 있습니다." : "",
        jongConditional ? "이 명식은 종격으로 볼 여지가 있어, 용신 판단에 조건이 붙는다는 점을 함께 말씀드립니다." : "",
        `이번 작명은 인명용 한자 전체를 대상으로 자원오행·수리 4격·소리오행·실제 쓰임을 함께 계산해 후보를 골랐습니다.${first ? ` 첫 번째 후보는 ${fullName(view, first)}입니다.` : ""}`,
        first ? narrationFor(view, narration, first).meaning : "",
      ].filter(Boolean).join("\n\n");
    case 2:
      return [
        `명식은 년주 ${saju.yearPillar || "미상"}, 월주 ${saju.monthPillar || "미상"}, 일주 ${saju.dayPillar || "미상"}, 시주 ${saju.hourPillar || "미상"}입니다. 일간은 ${saju.dayMaster || "미상"}이고 월령은 ${saju.monthCommand || "미상"}입니다.`,
        saju.fiveElementBalance ? `원국의 오행 분포는 ${saju.fiveElementBalance}입니다.${saju.strengthAnalysis ? ` 일간의 힘은 ${saju.strengthAnalysis}입니다.` : ""}` : "",
        `메인 사주 엔진이 정한 최종 용신은 ${labels(useful)}, 주의 오행은 ${cautionText}입니다. 작명 엔진은 이 값을 다시 계산하지 않고 그대로 받아, 이름 글자의 자원오행이 용신과 맞으면 점수를 더하고 주의 오행이면 점수를 덜었습니다.${derivedSupport.length ? ` 용신을 생해 주는 ${labels(derivedSupport)}도 보조로 반영했습니다.` : ""}`,
      ].filter(Boolean).join("\n\n");
    case 3:
      return [
        "이 아이의 이름은 네 가지 기준을 차례로 맞췄습니다.",
        `첫째, 자원오행입니다. 한자가 본래 지닌 오행이 용신 ${labels(useful)}에 맞는 글자를 앞세웠습니다.${caution.length ? ` ${labels(caution)} 오행의 글자는 점수를 낮췄습니다.` : ""}`,
        "둘째, 수리 4격입니다. 성과 이름의 획수로 원격·형격·이격·정격을 셈하고 81수리의 길흉을 따졌습니다. 특히 정격이 흉한 조합은 처음부터 후보에서 뺐습니다.",
        `셋째, 소리오행입니다. ${SOUND_MAPPING_LABEL[first?.sound.mapping || "modern"] || SOUND_MAPPING_LABEL.modern}을 기준으로, 이웃한 소리끼리 상생·비화로 이어지는지를 보았습니다.`,
        "넷째, 실제로 쓰기 좋은지입니다. 교육용 기초한자인지, 불용한자 관행에 걸리는지, 첫소리 ㄹ이나 같은 음절 반복처럼 부르기 불편한 점이 없는지를 함께 보았습니다. 삼재는 학파마다 해석이 달라 참고 지표로만 반영했습니다.",
      ].join("\n\n");
    case 4: {
      const detailed = view.candidates.slice(0, NARRATION_NAME_COUNT).map((candidate) => {
        const told = narrationFor(view, narration, candidate);
        return [`### ${candidate.rank}. ${fullName(view, candidate)}`, factParagraph(view, candidate), told.meaning, told.sajuSupport, told.soundFeel].join("\n\n");
      });
      const rest = view.candidates.slice(NARRATION_NAME_COUNT);
      if (rest.length) detailed.push(`그 밖에 ${rest.map((candidate) => fullName(view, candidate)).join(", ")}도 같은 기준으로 계산된 후보입니다.`);
      return detailed.join("\n\n");
    }
    case 5: {
      if (!top3.length) return "";
      const lines = top3.map((candidate) => `${fullName(view, candidate)}${particle(candidate.hangul, "은", "는")} ${summaryText(view, candidate)}입니다.`);
      const bySaju = strongest(top3, "saju");
      const bySuri = strongest(top3, "suri");
      const bySound = strongest(top3, "sound");
      lines.push(`용신 기운을 가장 직접 채우고 싶다면 ${fullName(view, bySaju)}, 수리 균형을 중시한다면 ${fullName(view, bySuri)}, 부르는 소리를 우선한다면 ${fullName(view, bySound)}${particle(bySound.hangul, "이", "가")} 잘 맞습니다.`);
      return lines.join("\n\n");
    }
    case 6:
      if (!first) return "";
      return [
        `여러 후보 가운데 ${fullName(view, first)}${particle(first.hangul, "을", "를")} 첫 번째로 권합니다.`,
        factParagraph(view, first),
        narrationFor(view, narration, first).letter,
      ].join("\n\n");
    case 7:
      return [
        caution.length
          ? `이 사주에서는 ${labels(caution)} 오행의 한자를 이름 글자로 겹쳐 쓰는 조합을 피하는 것이 좋습니다.`
          : "이 사주에서는 특정 오행을 크게 피할 필요는 없지만, 한 오행으로만 이름을 채우는 조합은 권하지 않습니다.",
        "수리에서는 정격이 흉수로 떨어지는 조합을 후보에서 뺐습니다.",
        "소리에서는 같은 음절이 이어지는 이름, 모든 음절에 받침이 있어 발음이 무거운 이름, 이름 첫소리가 ㄹ인 이름의 점수를 낮췄고, 놀림이 되기 쉬운 소리 목록에 걸리는 이름은 빼거나 점수를 낮췄습니다.",
        "뜻에서는 첫째 훈이 부정적인 뜻을 지닌 한자와 성별 관례상 어색한 글자를 걸렀습니다.",
      ].join("\n\n");
    case 8: {
      const top = view.candidates.slice(0, NARRATION_NAME_COUNT);
      const charsWith = (flag: string) => [...new Set(top.flatMap((candidate) => candidate.chars.filter((char) => char.flags.includes(flag)).map((char) => char.ch)))];
      const variant = charsWith("court-code-variant");
      const lowConfidence = charsWith("low-confidence");
      return [
        "출생신고 전에 대법원 전자가족관계등록시스템의 인명용 한자 조회에서 고른 한자가 등록 가능한지 한 번 더 확인해 주세요.",
        variant.length ? `${variant.join("·")} 글자는 법원 시스템에서 표준 코드가 아닌 이체 코드로 등록된 글자라, 신고 화면에서 글자 모양을 꼭 확인해야 합니다.` : "",
        lowConfidence.length ? `${lowConfidence.join("·")}의 자원오행은 분류 신뢰도가 낮아 전문가 검수 전의 참고값입니다.` : "",
        timeUnknown ? "출생 시간을 알게 되면 시주를 넣어 용신을 다시 확인해 보시길 권합니다." : "",
        view.notices.includes("sound.school-differs") ? "소리오행은 학파에 따라 배정이 달라질 수 있어, 다른 기준으로 보면 흐름 평가가 바뀔 수 있습니다." : "",
        "삼재는 학파마다 해석이 달라 참고 지표로만 보았습니다.",
        "마지막으로, 가족이 소리 내어 여러 번 불러 보고 아이의 형제자매 이름과도 나란히 놓아 보세요. 계산이 고른 후보 가운데 가장 마음이 편한 이름이 좋은 이름입니다.",
      ].filter(Boolean).join("\n\n");
    }
    default:
      return "";
  }
}
