/**
 * 오늘·내일의 운세 웹툰 — 그날 실제로 계산한 값으로 7컷 대사를 채운다.
 *
 * 체계마다 화자가 한 명씩 붙는다: 사주·일진은 네오, 하늘은 윤달, 타로는 연이, 숫자판은 무성,
 * 마음·행운은 서한비. 첫 컷은 내레이션, 마지막 컷은 연이의 종합이다.
 * 자미두수·숙요는 출생 정보 없이는 일일 계산이 없으므로 그 결과를 대사로 지어내지 않는다.
 * 그림은 daily-webtoon-slots.ts 의 예화 컷이다.
 */
import type { WebtoonCut, WebtoonLine } from "@/app/components/webtoon/CutReader";
import { dailyTarotReading } from "@/lib/tarot/yeongnyangi-daily-card";
import type { DailySignEntry } from "./daily-data";
import { branchOfAnimal, dayBranchOf, dayStemOf, elementOfStem, ganjiKo, hanjaKo, sunSignIdOf, type DayRelation } from "./day-relation";
import type { ScoreAxis } from "./fortune-score";
import { getSignProfile, zodiacNameKoFromEn, type SignProfile } from "./sign-profiles";
import { resolveSlotArt, type DailyWebtoonSlot } from "./daily-webtoon-slots";

export type DailySkyFacts = { ilchin: string; moonSign: string; moonPhase: string };

export type DailyWebtoonInput = {
  period: "today" | "tomorrow";
  dateKey: string;
  profile: SignProfile;
  entry: DailySignEntry;
  score: { overall: number; love: number; money: number; health: number; work: number };
  basis: ScoreAxis[];
  relation: DayRelation | null;
  sky: DailySkyFacts;
};

export type DailyWebtoon = { heading: string; lead: string; note: string; cuts: WebtoonCut[] };

/** 첫 문장. 마침표 없이 끝나면 전체를 돌려준다. */
export function firstSentence(text: string): string {
  const clean = String(text || "").trim();
  const hit = clean.match(/^.*?[.!?。](?=\s|$)/);
  return hit ? hit[0] : clean;
}

/** 마지막 한글 글자에 받침이 있는지. 괄호 속 한자 등은 건너뛴다. */
function hasBatchim(word: string): boolean {
  const hangul = String(word).replace(/\([^)]*\)/g, "").match(/[가-힣]/g);
  if (!hangul) return false;
  return (hangul[hangul.length - 1].charCodeAt(0) - 0xac00) % 28 !== 0;
}
const josa = (word: string, withBatchim: string, without: string) => `${word}${hasBatchim(word) ? withBatchim : without}`;
const copula = (word: string) => josa(word, "이에요", "예요");

/** "꿀꿀 연이: …" 같은 화자 머리말을 뗀다. */
function stripSpeakerLabel(text: string): string {
  return String(text || "").trim().replace(/^[^:：]{0,12}연이\s*[:：]\s*/, "");
}

const KST_DAY_MS = 86_400_000;
function dayIndex(dateKey: string): number {
  return Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / KST_DAY_MS);
}

const NEO_KIND_LINE: Record<DayRelation["kind"], string> = {
  trine: "같은 판에 서는 기운이라, 혼자 끌기보다 역할부터 맞춰.",
  clash: "부딪히는 기운이니까, 감정 실린 결정은 하루 미뤄.",
  same: "같은 기운이 겹쳐서 힘이 세. 대신 과속은 조심해.",
  neutral: "그렇다고 조용한 날이라고 단정하진 마. 육합 같은 다른 관계는 점수 근거에서 따로 봐.",
};

const STEM_LINE: Record<string, string> = {
  목: "천간이 목(木)이라 새로 뻗는 기운이야. 미뤄 둔 시작을 하나 꺼내기 좋아.",
  화: "천간이 화(火)라 드러나는 기운이야. 말과 표정이 평소보다 멀리 가.",
  토: "천간이 토(土)라 다지는 기운이야. 넓히기보다 정리하는 쪽이 남아.",
  금: "천간이 금(金)이라 가르는 기운이야. 미뤄 둔 결정을 끊어 내기 좋아.",
  수: "천간이 수(水)라 스며드는 기운이야. 말하기보다 듣는 쪽이 이기는 하루야.",
};

const AXES = [
  ["love", "애정운", "애정"],
  ["money", "재물운", "재물"],
  ["health", "건강운", "건강"],
  ["work", "직장운", "직장"],
] as const;

function band(overall: number): string {
  if (overall >= 8) return "바람이 등을 밀어 주는 날";
  if (overall >= 6) return "무난하게 흘러가는 날";
  if (overall >= 5) return "고르게 나눠 써야 하는 날";
  return "속도를 늦추면 오히려 지켜지는 날";
}

const say = (speaker: string, ...parts: Array<string | false | null | undefined>): WebtoonLine => ({
  speaker,
  text: parts.filter(Boolean).join(" "),
});

const BRANCH_ORDER = "子丑寅卯辰巳午未申酉戌亥";
const ELEMENT_HANJA: Record<string, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };

/** 십성 이름 → 대사에 붙는 풀이. 표에 없으면 산출 근거의 풀이를 그대로 쓴다. */
const TEN_GOD_PHRASE: Record<string, string> = {
  인성: "나를 돕는 기운",
  비겁: "나와 같은 기운",
  재성: "내가 다루는 기운",
  식상: "밖으로 나가는 기운",
  관성: "나를 누르는 기운",
};

/** 배지를 낭독하지 않고, 띠와 그날 지지의 관계를 말로 풀어 쓴다. */
function relationSentence(input: DailyWebtoonInput, relation: DayRelation): string {
  const name = input.profile.nameKo;
  const own = branchOfAnimal(input.profile.id);
  const day = dayBranchOf(input.sky.ilchin);
  const withName = josa(name, "과", "와");
  const tail = relation.badge.split("· ")[1]?.trim() || relation.badge;
  if (relation.kind === "same") return `${withName} 같은 지지가 겹치는 비화(比和)의 날이야.`;
  if (relation.kind === "clash") {
    // 충 이름은 지지 순서로 부른다(巳亥沖을 해사충이라 하지 않는다).
    const pair = own && day ? [own, day].sort((a, b) => BRANCH_ORDER.indexOf(a) - BRANCH_ORDER.indexOf(b)) : [];
    const ko = pair.map(hanjaKo);
    const clash = pair.length === 2 && ko.every(Boolean) ? `${ko.join("")}충(${pair.join("")}沖)` : tail;
    return `${withName} 정면으로 부딪히는 ${josa(clash, "이", "가")} 든 날이야.`;
  }
  if (relation.kind === "trine") return `${withName} ${tail} 삼합 그룹으로 이어지는 날이야.`;
  const dayKo = day && hanjaKo(day);
  return dayKo
    ? `${dayKo}(${day})의 날이라 ${withName}는 삼합도 충도 아니야.`
    : `${withName}는 삼합도 충도 아닌 날이야.`;
}

/** "화(丙) → 수 · 재성 — 내가 다루는 기운" → 말로 풀어 쓴 문장. 형식이 다르면 원문. */
function elementSentence(value: string, name: string): string {
  const hit = value.match(/^(.)\((.)\)\s*→\s*(.)\s*·\s*([^—]+?)\s*—\s*(.+)$/);
  const stemKo = hit && hanjaKo(hit[2]);
  if (!hit || !stemKo || !ELEMENT_HANJA[hit[1]] || !ELEMENT_HANJA[hit[3]]) return `천간 쪽은 ${value}.`;
  const [, dayEl, stem, ownEl, god, gloss] = hit;
  const phrase = TEN_GOD_PHRASE[god] || gloss.trim();
  return `천간 ${josa(`${stemKo}(${stem})`, "은", "는")} ${josa(`${dayEl}(${ELEMENT_HANJA[dayEl]})`, "이라", "라")}, ${ownEl}(${ELEMENT_HANJA[ownEl]})인 ${name}에겐 ${god}, 곧 ${phrase}이야.`;
}

function sajuLine(input: DailyWebtoonInput, dayWord: string): WebtoonLine {
  const { profile, relation, basis, sky } = input;
  const name = profile.nameKo;
  const day = `${dayWord} 일진은 ${ganjiKo(sky.ilchin)}일이야.`;
  if (profile.kind === "animal") {
    const element = basis.find((row) => row.label === "오행 생극");
    return say(
      "네오",
      day,
      relation && relationSentence(input, relation),
      relation && NEO_KIND_LINE[relation.kind],
      element && elementSentence(String(element.value), name),
    );
  }
  // 별자리에는 지지가 없다 — 띠 관계(합·충)를 빌려 오지 않고 천간 오행만 짚는다.
  const stem = dayStemOf(sky.ilchin);
  const element = stem ? elementOfStem(stem) : null;
  return say(
    "네오",
    `${day} 별자리엔 지지가 없으니, ${name}에겐 사주 쪽에서 하루의 큰 날씨만 짚을게.`,
    element && STEM_LINE[element],
  );
}

function skyLine(input: DailyWebtoonInput, dayWord: string): WebtoonLine {
  const { profile, relation, sky, dateKey } = input;
  const name = profile.nameKo;
  const moonKo = zodiacNameKoFromEn(sky.moonSign);
  const phaseKo = (sky.moonPhase.split("/")[1] || sky.moonPhase).trim();
  const phase = /full/i.test(sky.moonPhase)
    ? `달이 가득 찬 날이라 ${name}의 감정도 크게 출렁여요. 결론은 한 템포 늦게 내세요.`
    : /new moon|waxing|first quarter/i.test(sky.moonPhase)
      ? `차오르는 달이라 ${josa(name, "이", "가")} 새로 심는 일이 자라기 좋아요.`
      : `기우는 달이라 ${name}에겐 덜어 내고 마무리하는 쪽이 잘 맞아요.`;
  if (profile.kind === "zodiac") {
    const sunId = sunSignIdOf(dateKey);
    const sunKo = sunId ? getSignProfile(sunId)?.nameKo : null;
    const kindLine = relation?.kind === "same"
      ? `자기 궁에 태양이 든 시기라, ${name}에겐 내 이야기를 꺼내기 가장 좋은 구간이에요.`
      : relation?.kind === "trine"
        ? `달이 ${josa(name, "을", "를")} 지나는 날이라 감정이 선명해져요. 마음이 기우는 쪽을 믿어 보세요.`
        : `${name}에게는 하늘이 크게 끌어당기지 않는 날이에요. 내 계획표대로 가는 편이 좋아요.`;
    return say(
      "윤달",
      `${dayWord} 태양은 ${sunKo ? `${sunKo}에 있고` : "제자리를 돌고"}, 달은 ${josa(moonKo, "을", "를")} 지나요. 위상은 ${copula(phaseKo)}.`,
      kindLine,
      phase,
    );
  }
  return say("윤달", `${dayWord} 달은 ${josa(moonKo, "을", "를")} 지나고, 위상은 ${copula(phaseKo)}.`, phase);
}

function tarotLines(input: DailyWebtoonInput, dayWord: string): WebtoonLine[] {
  const card = dailyTarotReading(input.dateKey, `fortune-sign:${input.profile.id}`);
  // 카드 풀이는 "오늘은 …"으로 쓰여 있다. 내일 페이지에서는 그 날을 가리키도록 맞춘다.
  const reading = input.period === "tomorrow" ? card.reading.replace(/^오늘/, "내일") : card.reading;
  return [
    say("연이", `${input.profile.nameKo}에게 펼쳐진 ${dayWord}의 카드는 「${card.cardName}」 ${card.orientationLabel}이에요.`, reading),
    { speaker: "", text: `카드의 조언 — ${card.advice}` },
  ];
}

function boardLine(input: DailyWebtoonInput): WebtoonLine {
  const { score, entry } = input;
  const ranked = [...AXES].sort((a, b) => score[b[0]] - score[a[0]]);
  const [top, low] = [ranked[0], ranked[ranked.length - 1]];
  const tally = AXES.map(([key, , short]) => `${short} ${score[key]}`).join(" · ");
  const head = `${tally}. 총운은 ${score.overall}점입니다.`;
  if (score[top[0]] === score[low[0]]) {
    return say("무성", head, `네 갈래가 고르게 ${score[top[0]]}점이라, 어느 한쪽으로 몰지 않는 편이 좋습니다.`, firstSentence(entry.sections.overall?.kr || ""));
  }
  // 애정운 문장은 서한비 컷이 인용하므로, 애정운이 가장 높으면 가장 낮은 갈래를 짚는다.
  const quoted = top[0] === "love"
    ? `${josa(low[1], "은", "는")} 이렇게 챙기세요 — ${firstSentence(entry.sections[low[0]]?.kr || "")}`
    : `${josa(top[1], "은", "는")} 이렇게 읽힙니다 — ${firstSentence(entry.sections[top[0]]?.kr || "")}`;
  return say("무성", head, `가장 높은 갈래는 ${top[1]}, 가장 아껴 써야 할 갈래는 ${low[1]}입니다.`, quoted);
}

function heartLine(input: DailyWebtoonInput): WebtoonLine {
  const { entry } = input;
  const love = firstSentence(entry.sections.love?.kr || "");
  return say(
    "서한비",
    love && `마음 쪽은 이렇게 보여요. ${love}`,
    `행운의 색은 ${entry.lucky.color_kr}, 숫자는 ${entry.lucky.number}. 작은 부적처럼 곁에 두세요.`,
  );
}

export function buildDailyWebtoon(input: DailyWebtoonInput): DailyWebtoon {
  const { profile, entry, score, dateKey, period } = input;
  const name = profile.nameKo;
  const dayWord = period === "today" ? "오늘" : "내일";
  const [, month, day] = dateKey.split("-").map(Number);
  const seed = `${dateKey}|${profile.id}`;
  const keyword = entry.keyword?.kr?.trim();

  const cut = (slot: DailyWebtoonSlot, kind: string, lines: WebtoonLine[]): WebtoonCut => ({
    ...resolveSlotArt(slot, seed),
    kind,
    lines: lines.filter((line) => line.text),
  });

  const middle: WebtoonCut[] = [
    cut("saju", "dialogue", [sajuLine(input, dayWord)]),
    cut("sky", "dialogue", [skyLine(input, dayWord)]),
    cut("tarot", "dialogue", tarotLines(input, dayWord)),
    cut("board", "dialogue", [boardLine(input)]),
    cut("heart", "dialogue", [heartLine(input)]),
  ];
  // 가운데 다섯 컷은 날마다 한 칸씩 돈다 — 같은 sign 도 날마다 다른 순서로 읽힌다.
  const offset = ((dayIndex(dateKey) % middle.length) + middle.length) % middle.length;
  const rotated = [...middle.slice(offset), ...middle.slice(0, offset)];

  const advice = stripSpeakerLabel(entry.sections.advice?.kr || "");
  return {
    heading: `${name} ${dayWord}의 운세 웹툰`,
    lead: "사주·별·타로·숫자판·마음, 다섯 갈래 운세가 한 컷씩 말을 걸고 마지막에 연이가 하나로 묶어 드려요.",
    note: `그림은 상담 웹툰에서 빌려 온 예화 컷이고, 말풍선은 ${month}월 ${day}일 일진·하늘·카드로 계산한 ${name}의 값입니다. 태어난 시각까지 넣은 개인 풀이와는 다릅니다.`,
    cuts: [
      cut("opening", "place", [
        { speaker: "", text: `${month}월 ${day}일, ${name}의 ${dayWord}을 네오·윤달·연이·무성·서한비가 한 장씩 펼쳐 봅니다.` },
        { speaker: "", text: keyword ? `${dayWord}의 열쇠말은 「${keyword}」.` : "" },
      ]),
      ...rotated,
      cut("closing", "dialogue", [
        say("연이", `다섯 갈래를 겹쳐 보면 ${dayWord}의 ${josa(name, "은", "는")} ${score.overall}점, ${band(score.overall)}이에요.`, advice),
      ]),
    ],
  };
}
