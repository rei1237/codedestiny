// 오늘의 사주 상세 — 순수 판정 레이어(I/O 비의존).
//
// judgeSajuDayFortune(saju-day-fortune.js)은 십성·신강약·오행 과부족·일지 충합을 **이미 다 계산해
// 놓고 문장 한 줄만 내보낸다.** 그 값들을 섹션으로 펼치고, 아직 아무도 쓰지 않던 순수 함수
// (신살 조견표·십이운성 조견표·지지 짝 관계)를 오늘 일진에 얹는다.
//
// 명리 규칙은 새로 발명하지 않는다 — 판정은 전부 기존 정본 함수가 한다.
//   신살/지지관계  worker/lib/saju-shinsal.js  (localSajuCalculator.ts 이관본)
//   십이운성       worker/lib/saju-gyeokguk.js (js/saju-engine.js:8274 이관본)
//   십성/지장간    worker/lib/life-book-ai-saju.js
//   억부 가중치    worker/lib/saju-day-fortune.js scoreBranchForNatal()
// 이 파일이 새로 갖는 것은 **그 판정 결과를 읽는 한국어 문장표**뿐이다.
//
// 🔴 십이운성은 이름 + 한 줄까지만 쓴다. 긴 서술은 유료(animal-destiny-unlock)의 몫이다.

import { BRANCH_ELEMENT, STEM_ELEMENT } from "./life-book-ai-saju.js";
import { scoreBranchForNatal } from "./saju-day-fortune.js";
import { getTwelveLifeStage } from "./saju-gyeokguk.js";
import {
  getBranchPairRelations,
  getCheoneulBranches,
  getGongmangBranches,
  getHongyeomBranch,
  getHwagaeBranch,
  getMunchangBranch,
  getPeachBlossomBranch,
  getYanginBranch,
  getYeokmaBranch,
  toBranchKo,
  toStemKo,
} from "./saju-shinsal.js";

// ── 문장표 ────────────────────────────────────────────────────────────────

// 십성 10종 × 방향. saju-day-fortune.js 의 GROUP_ADVICE 는 5계열 × 2방향 = 10문장뿐이라
// 비견과 겁재가, 식신과 상관이 똑같은 말을 들었다. 여기서 10종으로 갈라 쓴다.
const TEN_GOD_LINE = Object.freeze({
  비견: {
    good: "내 힘이 그대로 서는 날입니다. 남의 속도에 맞추지 말고 내 리듬으로 하나를 끝내면 손에 남습니다.",
    bad: "고집과 경쟁심이 앞서기 쉽습니다. 내 몫을 지키려다 사람을 밀어내지 않도록 한 박자 물러서세요.",
  },
  겁재: {
    good: "함께 밀어붙일 사람이 붙는 날입니다. 혼자 쥐고 있던 일을 나누면 속도가 붙습니다.",
    bad: "나가는 돈과 뺏기는 시간이 늘어나는 날입니다. 보증·공동 지출·즉흥 약속은 오늘 결정하지 마세요.",
  },
  식신: {
    good: "차분히 만들어 내기 좋은 날입니다. 결과를 서두르지 않아도 손이 가는 대로 진도가 나갑니다.",
    bad: "편안함에 기대 늘어지기 쉽습니다. 시작 시각만 정해 두면 하루가 흐트러지지 않습니다.",
  },
  상관: {
    good: "말과 표현이 잘 통하는 날입니다. 미뤄 둔 제안·발표·연락을 오늘 꺼내면 반응이 옵니다.",
    bad: "한마디가 날카롭게 나가기 쉽습니다. 옳은 말일수록 오늘은 반 톤 낮춰 말하세요.",
  },
  편재: {
    good: "기회를 넓게 잡기 좋은 날입니다. 여러 갈래를 살펴보되 오늘은 고르는 데까지만 하세요.",
    bad: "욕심이 앞서 지출과 일이 함께 커집니다. 큰 결제와 새 약속은 하루 재워 두세요.",
  },
  정재: {
    good: "손에 잡히는 결과를 만들기 좋은 날입니다. 돈·일정·거래처럼 실물이 오가는 일에 힘이 실립니다.",
    bad: "아끼려다 오히려 기회를 놓치기 쉽습니다. 숫자만 보지 말고 사람 쪽도 한 번 챙기세요.",
  },
  편관: {
    good: "압박이 오히려 나를 세우는 날입니다. 어려운 것부터 먼저 치면 나머지가 가벼워집니다.",
    bad: "밖에서 오는 압박이 무겁게 느껴집니다. 정면 돌파보다 기한과 경계를 다시 정리하세요.",
  },
  정관: {
    good: "규율이 나를 지켜 주는 날입니다. 맡은 자리를 정확히 지키면 인정과 신뢰가 따라옵니다.",
    bad: "규칙과 절차가 발목을 잡는 날입니다. 예외를 요구하기보다 정해진 길을 한 번 더 확인하세요.",
  },
  편인: {
    good: "낯선 관점에서 답이 오는 날입니다. 평소 안 보던 자료·안 만나던 사람 쪽을 살펴보세요.",
    bad: "생각만 많아지고 실행이 늦어집니다. 더 알아보기보다 오늘 할 수 있는 한 가지를 끝내세요.",
  },
  정인: {
    good: "도움과 배움이 들어오는 날입니다. 혼자 끙끙대지 말고 먼저 물어보면 길이 열립니다.",
    bad: "기대던 곳에 기대가 어긋나기 쉽습니다. 도움을 기다리는 대신 스스로 반 걸음만 먼저 떼세요.",
  },
});

// 지지 십성(지장간 본기)은 하루의 바닥이다. 천간과 달리 "드러나는 일"이 아니라 "깔리는 조건"이라
// 같은 십성이라도 읽는 문장을 따로 둔다.
const BRANCH_TEN_GOD_LINE = Object.freeze({
  비견: "바닥에는 나와 같은 결이 깔려 있어, 익숙한 방식이 오늘은 더 잘 먹힙니다.",
  겁재: "바닥에 경쟁의 결이 깔립니다. 같은 것을 노리는 사람이 있다고 보고 움직이세요.",
  식신: "바닥이 넉넉합니다. 급히 몰아붙이지 않아도 하루가 제 속도로 굴러갑니다.",
  상관: "바닥에 튀어나가려는 힘이 있습니다. 하고 싶은 말을 어디까지 할지 미리 정해 두세요.",
  편재: "바닥에 돈과 기회의 결이 깔립니다. 벌이는 쪽보다 고르는 쪽에 시간을 쓰세요.",
  정재: "바닥이 실속으로 채워집니다. 숫자로 남는 일부터 처리하면 하루가 정리됩니다.",
  편관: "바닥에 긴장이 깔립니다. 갑자기 들어오는 요청이 있을 수 있으니 여유 시간을 남기세요.",
  정관: "바닥에 질서가 깔립니다. 절차대로 가는 일이 오늘은 가장 빠른 길입니다.",
  편인: "바닥에 생각의 결이 깔립니다. 판단이 길어지면 일단 적어 두고 내일 다시 보세요.",
  정인: "바닥이 나를 받쳐 줍니다. 배우거나 정리하는 일에 오늘 시간을 쓰면 남습니다.",
});

// 십이운성 — 이름과 한 줄까지만(긴 서술은 유료 기능의 몫).
const TWELVE_STAGE_LINE = Object.freeze({
  장생: "막 태어나 뻗어 나가는 자리입니다. 새로 시작하는 일에 힘이 붙습니다.",
  목욕: "다듬어지는 자리입니다. 마음이 흔들리기 쉬우니 큰 결정은 미루세요.",
  관대: "옷을 갖춰 입는 자리입니다. 드러내고 나설 일에 어울립니다.",
  건록: "제 힘으로 서는 자리입니다. 맡은 일을 스스로 밀고 나가기 좋습니다.",
  제왕: "기운이 가장 높은 자리입니다. 밀어붙일 수 있는 만큼 과하기도 쉽습니다.",
  쇠: "정점을 지난 자리입니다. 벌이기보다 지키고 다듬는 쪽이 맞습니다.",
  병: "힘이 빠지는 자리입니다. 무리한 일정을 잡지 말고 컨디션을 우선하세요.",
  사: "멈추는 자리입니다. 결론을 내기보다 자료를 모으고 쉬는 편이 낫습니다.",
  묘: "거두어 넣는 자리입니다. 정리·마무리·기록에 어울립니다.",
  절: "끊기는 자리입니다. 흐름이 한 번 끊길 수 있으니 대안을 하나 준비하세요.",
  태: "다시 잉태되는 자리입니다. 아직 형태가 없으니 조용히 구상하기 좋습니다.",
  양: "길러지는 자리입니다. 서두르지 않고 준비를 쌓는 데 시간을 쓰세요.",
});

// 지지 짝 관계 — getBranchPairRelations 가 내는 9종에 1:1로 대응한다.
const BRANCH_RELATION_LINE = Object.freeze({
  육합: "내 일지와 곧게 맞물립니다. 대화와 합의가 순하게 풀리는 날입니다.",
  삼합: "내 일지와 같은 국(局)으로 묶입니다. 함께 하는 일에 힘이 실립니다.",
  충: "내 일지를 정면으로 칩니다. 이동·약속 변경이 잦고 마음이 들썩입니다.",
  형: "내 일지와 서로 깎습니다. 서류·규정·시비가 걸릴 수 있으니 확인을 한 번 더 하세요.",
  자형: "같은 글자가 겹쳐 스스로를 깎습니다. 자책이 길어지지 않게 끊어 주세요.",
  파: "내 일지를 흔들어 깨뜨립니다. 잡아 둔 계획이 틀어질 수 있습니다.",
  해: "내 일지를 은근히 상하게 합니다. 사소한 어긋남이 쌓이니 그때그때 풀어야 합니다.",
  원진: "내 일지와 까닭 없이 불편한 자리입니다. 특정 상대와의 대화는 짧게 끝내세요.",
  귀문: "내 일지와 예민하게 얽힙니다. 잠과 생각이 얕아지니 밤에 결정하지 마세요.",
});

// 신살 — 오늘 지지가 내 명식 기준으로 그 자리에 해당할 때만 붙는다.
const SHINSAL_LINE = Object.freeze({
  천을귀인: "가장 귀한 도움자리입니다. 부탁하거나 물어볼 일이 있다면 오늘 꺼내세요.",
  문창귀인: "글과 공부가 트이는 자리입니다. 시험·문서·기획에 어울립니다.",
  역마: "움직임의 자리입니다. 이동·출장·연락이 늘고, 자리를 옮기는 결정에 힘이 붙습니다.",
  도화: "끌림의 자리입니다. 사람이 붙고 눈에 띄지만, 말이 도는 것도 함께 옵니다.",
  홍염: "은근한 매력의 자리입니다. 사적인 만남에서 분위기가 살아납니다.",
  화개: "혼자 깊어지는 자리입니다. 사람보다 작업·수행·정리에 시간을 쓰기 좋습니다.",
  양인: "칼날의 자리입니다. 추진력이 세지는 만큼 다툼과 부상도 함께 커집니다.",
  공망: "비는 자리입니다. 오늘 벌인 일은 손에 잘 안 남으니 확정보다 준비에 두세요.",
});

// 용신(부족한 오행) 보완 처방. 방위·색·숫자는 오행 상응의 기본형이다.
const ELEMENT_REMEDY = Object.freeze({
  목: { direction: "동쪽", color: "청록·초록", number: "3·8", act: "새로 시작하고 뻗는 일" },
  화: { direction: "남쪽", color: "붉은색·자주", number: "2·7", act: "드러내고 표현하는 일" },
  토: { direction: "중앙", color: "노랑·황토", number: "5·10", act: "중심을 잡고 다지는 일" },
  금: { direction: "서쪽", color: "흰색·은색", number: "4·9", act: "정리하고 매듭짓는 일" },
  수: { direction: "북쪽", color: "검정·남색", number: "1·6", act: "사색하고 흐르게 두는 일" },
});

const ELEMENT_DAY_MOOD = Object.freeze({
  목: "새로 뻗어 나가고 시작하는",
  화: "밝게 드러나고 표현하는",
  토: "중심을 잡고 다지는",
  금: "정리하고 매듭짓는",
  수: "깊이 사색하고 흐르는",
});

const STRENGTH_LABEL = Object.freeze({ strong: "신강(강한 편)", weak: "신약(약한 편)", balanced: "중화(균형)" });

const BRANCH_ANIMAL = Object.freeze({
  子: "쥐", 丑: "소", 寅: "호랑이", 卯: "토끼", 辰: "용", 巳: "뱀",
  午: "말", 未: "양", 申: "원숭이", 酉: "닭", 戌: "개", 亥: "돼지",
});

// 십이지시. 경계는 이 레포가 이미 쓰는 관례(app/insights/adsense-ready-articles.js:953)를 따른다.
const HOUR_BRANCHES = Object.freeze([
  { branch: "子", range: "23:00~01:00" },
  { branch: "丑", range: "01:00~03:00" },
  { branch: "寅", range: "03:00~05:00" },
  { branch: "卯", range: "05:00~07:00" },
  { branch: "辰", range: "07:00~09:00" },
  { branch: "巳", range: "09:00~11:00" },
  { branch: "午", range: "11:00~13:00" },
  { branch: "未", range: "13:00~15:00" },
  { branch: "申", range: "15:00~17:00" },
  { branch: "酉", range: "17:00~19:00" },
  { branch: "戌", range: "19:00~21:00" },
  { branch: "亥", range: "21:00~23:00" },
]);

// ── 유틸 ──────────────────────────────────────────────────────────────────

function branchLabel(branch) {
  const ko = toBranchKo(branch);
  return ko ? `${ko}(${branch})` : branch;
}

function hourLabel(branch, range) {
  return `${toBranchKo(branch)}시 ${range}`;
}

/** 오늘 지지가 내 명식 기준으로 해당하는 신살들. 해당하는 것만 돌려준다. */
function todayShinsal(dayMaster, myDayBranch, myDayPillar, todayBranch) {
  const hits = [];
  const push = (name) => {
    if (!hits.includes(name)) hits.push(name);
  };
  if (getCheoneulBranches(dayMaster).includes(todayBranch)) push("천을귀인");
  if (getMunchangBranch(dayMaster) === todayBranch) push("문창귀인");
  if (getHongyeomBranch(dayMaster) === todayBranch) push("홍염");
  if (getYanginBranch(dayMaster) === todayBranch) push("양인");
  if (myDayBranch) {
    if (getYeokmaBranch(myDayBranch) === todayBranch) push("역마");
    if (getPeachBlossomBranch(myDayBranch) === todayBranch) push("도화");
    if (getHwagaeBranch(myDayBranch) === todayBranch) push("화개");
  }
  if (getGongmangBranches(myDayPillar).includes(todayBranch)) push("공망");
  return hits;
}

/** 십이지시를 억부 기준으로 점수화해 좋은 시간 2개·주의 시간 1개를 뽑는다. */
function buildHourWindows(verdict) {
  const scored = HOUR_BRANCHES.map(({ branch, range }) => {
    const judged = scoreBranchForNatal({
      dayMaster: verdict.dayMaster,
      branch,
      strengthMode: verdict.strengthMode,
      lackingElement: verdict.lackingElement,
      excessElement: verdict.excessElement,
    });
    return { branch, range, weight: judged ? judged.weight : 0, tenGod: judged ? judged.tenGod : "" };
  }).filter((row) => row.tenGod);
  if (scored.length < 3) return null;

  const byWeight = [...scored].sort((a, b) => b.weight - a.weight);
  const best = byWeight.slice(0, 2);
  const worst = byWeight[byWeight.length - 1];
  return { best, worst };
}

// ── 개인 판정(생년 있음) ───────────────────────────────────────────────────

/**
 * 오늘의 사주 상세.
 *
 * @param {object} params
 * @param {object} params.verdict judgeSajuDayFortune() 결과
 * @param {object} params.natal   calculateLifeBookAiSaju() 결과
 * @returns {{highlights: string[], sections: object[]}}
 */
export function buildTodaySajuDetail({ verdict, natal }) {
  if (!verdict) return { highlights: [], sections: [] };

  const todayBranch = verdict.dayGanji.slice(1, 2);
  const dayMaster = verdict.dayMaster;
  const myDay = natal?.pillarDetails?.day || null;
  const myDayBranch = String(myDay?.earthlyBranch || "").trim();
  const favourable = verdict.tier === "great-auspicious" || verdict.tier === "auspicious" || verdict.tier === "pivotal";
  const direction = favourable ? "good" : "bad";

  const sections = [];
  const highlights = [];

  // 1) 오늘의 기둥
  const stage = getTwelveLifeStage(dayMaster, todayBranch);
  const pillarItems = [
    { label: "오늘 일진", value: `${verdict.dayGanjiKo}일 · ${verdict.dayElement}` },
    { label: "내 일간", value: `${verdict.dayMasterKo}(${dayMaster}) · ${STEM_ELEMENT[dayMaster] || ""}` },
    { label: "일간 강약", value: STRENGTH_LABEL[verdict.strengthMode] || "중화(균형)" },
    { label: "천간 십성", value: verdict.tenGod, note: `오늘 드러나는 결 — ${verdict.tenGodGroup}` },
  ];
  if (verdict.branchTenGod) {
    pillarItems.push({ label: "지지 십성", value: verdict.branchTenGod, note: `${branchLabel(todayBranch)}의 지장간 본기 기준` });
  }
  if (stage) pillarItems.push({ label: "십이운성", value: stage, note: TWELVE_STAGE_LINE[stage] || "" });
  sections.push({ key: "pillar", title: "오늘의 기둥", items: pillarItems });

  // 2) 십성 풀이
  const tenGodLines = [];
  const stemLine = TEN_GOD_LINE[verdict.tenGod]?.[direction];
  if (stemLine) tenGodLines.push(`천간 ${verdict.tenGod} — ${stemLine}`);
  const branchLine = BRANCH_TEN_GOD_LINE[verdict.branchTenGod];
  if (branchLine) tenGodLines.push(`지지 ${verdict.branchTenGod} — ${branchLine}`);
  if (verdict.strengthMode === "balanced" && verdict.lackingElement) {
    tenGodLines.push(`내 명식은 ${verdict.lackingElement} 기운이 가장 옅고 ${verdict.excessElement} 기운이 가장 짙습니다. 오늘의 ${verdict.dayElement} 기운이 그 사이 어디에 놓이는지가 하루의 결을 정합니다.`);
  }
  if (tenGodLines.length) sections.push({ key: "ten-god", title: "오늘의 십성 풀이", lines: tenGodLines });

  // 3) 일지 관계
  if (myDayBranch) {
    const relations = getBranchPairRelations(myDayBranch, todayBranch);
    const relationItems = relations
      .map((name) => ({ label: name, value: `${branchLabel(myDayBranch)} ↔ ${branchLabel(todayBranch)}`, note: BRANCH_RELATION_LINE[name] || "" }))
      .filter((item) => item.note);
    if (relationItems.length) {
      sections.push({ key: "branch-relation", title: "내 일지와 오늘 지지", items: relationItems });
      highlights.push(`내 일지와 ${relationItems[0].label} — ${relationItems[0].note.split(".")[0]}.`);
    } else {
      sections.push({
        key: "branch-relation",
        title: "내 일지와 오늘 지지",
        lines: [`${branchLabel(myDayBranch)}와 ${branchLabel(todayBranch)} 사이에 충·합·형이 걸리지 않습니다. 오늘은 밖에서 흔드는 힘 없이 내 페이스대로 갈 수 있는 날입니다.`],
      });
    }
  }

  // 4) 오늘의 신살
  const shinsal = myDay ? todayShinsal(dayMaster, myDayBranch, myDay, todayBranch) : [];
  if (shinsal.length) {
    sections.push({
      key: "shinsal",
      title: "오늘 드는 신살",
      items: shinsal.map((name) => ({ label: name, value: branchLabel(todayBranch), note: SHINSAL_LINE[name] || "" })),
    });
    highlights.unshift(`${shinsal[0]} — ${SHINSAL_LINE[shinsal[0]].split(".")[0]}.`);
  }

  // 5) 시간대
  const windows = buildHourWindows(verdict);
  if (windows) {
    sections.push({
      key: "hours",
      title: "오늘의 시간대",
      items: [
        { label: "힘이 실리는 때", value: windows.best.map((w) => hourLabel(w.branch, w.range)).join(" · "), note: "중요한 통화·제안·결정을 이 구간에 두세요." },
        { label: "한 박자 늦출 때", value: hourLabel(windows.worst.branch, windows.worst.range), note: "새 약속을 잡거나 확답하기에는 결이 약한 구간입니다." },
      ],
    });
    highlights.push(`힘이 실리는 시간 ${hourLabel(windows.best[0].branch, windows.best[0].range)}`);
  }

  // 6) 오늘의 처방
  const remedyElement = verdict.lackingElement || verdict.dayElement;
  const remedy = ELEMENT_REMEDY[remedyElement];
  const clashAnimal = BRANCH_ANIMAL[todayBranch];
  const remedyItems = [];
  if (remedy) {
    remedyItems.push({ label: "보완할 기운", value: `${remedyElement} 기운`, note: `${remedy.act}에 시간을 쓰면 오늘의 부족이 메워집니다.` });
    remedyItems.push({ label: "방위·색·숫자", value: `${remedy.direction} · ${remedy.color} · ${remedy.number}` });
  }
  if (myDayBranch) {
    const friendly = Object.keys(BRANCH_ANIMAL).filter((b) => getBranchPairRelations(todayBranch, b).includes("육합"));
    const hostile = Object.keys(BRANCH_ANIMAL).filter((b) => getBranchPairRelations(todayBranch, b).includes("충"));
    if (friendly.length) remedyItems.push({ label: "오늘 잘 맞는 띠", value: friendly.map((b) => `${BRANCH_ANIMAL[b]}띠`).join(" · ") });
    if (hostile.length) remedyItems.push({ label: "부딪히기 쉬운 띠", value: hostile.map((b) => `${BRANCH_ANIMAL[b]}띠`).join(" · "), note: `오늘은 ${clashAnimal}띠 기운이 서는 날이라 정반대 자리가 흔들립니다.` });
  }
  if (remedyItems.length) sections.push({ key: "remedy", title: "오늘의 처방", items: remedyItems });

  if (!highlights.length && stemLine) highlights.push(`${verdict.tenGod} — ${stemLine.split(".")[0]}.`);

  return { highlights: highlights.slice(0, 3), sections };
}

// ── 날짜만으로 참인 부분(생년 없음) ────────────────────────────────────────

/**
 * 생년 정보 없이도 사실인 오늘의 일진. 개인 길흉은 내지 않는다.
 *
 * @param {{stem:string, branch:string}} today 오늘 일주(한자)
 */
export function buildTodaySajuPublic(today) {
  const stem = String(today?.stem || "").trim();
  const branch = String(today?.branch || "").trim();
  if (!STEM_ELEMENT[stem] || !BRANCH_ELEMENT[branch]) return null;

  const ganjiKo = `${toStemKo(stem)}${toBranchKo(branch)}`;
  const stemElement = STEM_ELEMENT[stem];
  const branchElement = BRANCH_ELEMENT[branch];
  const animal = BRANCH_ANIMAL[branch];
  const friendly = Object.keys(BRANCH_ANIMAL).filter((b) => getBranchPairRelations(branch, b).includes("육합"));
  const hostile = Object.keys(BRANCH_ANIMAL).filter((b) => getBranchPairRelations(branch, b).includes("충"));

  const sections = [
    {
      key: "pillar",
      title: "오늘의 기둥",
      items: [
        { label: "오늘 일진", value: `${ganjiKo}일(${stem}${branch})` },
        { label: "천간", value: `${toStemKo(stem)}(${stem}) · ${stemElement}` },
        { label: "지지", value: `${toBranchKo(branch)}(${branch}) · ${branchElement} · ${animal}띠` },
      ],
    },
    {
      key: "mood",
      title: "오늘 기운의 결",
      lines: [
        `${ganjiKo}일은 ${ELEMENT_DAY_MOOD[stemElement]} 기운이 표면에 서고, 바닥에는 ${branchElement} 기운이 깔립니다.`,
        "이 결은 날짜만으로 정해지는 하루 전체의 흐름입니다. 이 기운이 나에게 길한지 흉한지는 내 일간과 견주어야 정해집니다.",
      ],
    },
  ];
  if (friendly.length || hostile.length) {
    const items = [];
    if (friendly.length) items.push({ label: "오늘과 합하는 띠", value: friendly.map((b) => `${BRANCH_ANIMAL[b]}띠`).join(" · ") });
    if (hostile.length) items.push({ label: "오늘과 충하는 띠", value: hostile.map((b) => `${BRANCH_ANIMAL[b]}띠`).join(" · ") });
    sections.push({ key: "zodiac", title: "오늘 지지와 띠", items });
  }

  return {
    anchor: `오늘의 일진 · ${ganjiKo}일 (${stemElement})`,
    headline: `${ELEMENT_DAY_MOOD[stemElement]} 기운이 흐르는 하루`,
    body: `${ganjiKo}일입니다. 천간 ${toStemKo(stem)}의 ${stemElement} 기운이 겉으로 서고 지지 ${toBranchKo(branch)}의 ${branchElement} 기운이 바닥을 받칩니다.`,
    highlights: [
      `오늘은 ${animal}띠 기운이 서는 날`,
      hostile.length ? `${BRANCH_ANIMAL[hostile[0]]}띠 자리가 흔들립니다` : "",
    ].filter(Boolean),
    sections,
  };
}

// 오늘 일진이 특정 십성일 때 문장을 찾는 쪽(테스트·다른 라우트)이 표를 다시 만들지 않도록 함께 내보낸다.
export { TEN_GOD_LINE, TWELVE_STAGE_LINE, SHINSAL_LINE, HOUR_BRANCHES };
