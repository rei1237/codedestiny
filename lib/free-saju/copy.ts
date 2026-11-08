/**
 * `/saju/free` 초간단 만세력 결과 문구.
 *
 * 톤: docs/context/design-canon.md — 감성·위트·한 줄로 콕 찌르기, 역학 용어는 최소, 해요체.
 * 이모지는 🌸·🦁만, 유아어 금지. 겁주기·확정적 금전 예언·결제 압박 금지.
 * 표(일간 10 · 십신 10 · 12운성 12 · 재물 시크릿 10)가 하나라도 비면 테스트가 막는다.
 */
import type { ElementKey, HeavenlyStem, TenGod, TwelveLifeStage } from "./compute";

export type CopyLine = { title: string; line: string };

/** subject·topic 은 이름 뒤 조사(이/가, 은/는). */
export const ELEMENT_LABEL: Record<ElementKey, { name: string; hanja: string; image: string; subject: string; topic: string }> = {
  wood: { name: "나무", hanja: "木", image: "자라는 힘", subject: "가", topic: "는" },
  fire: { name: "불", hanja: "火", image: "드러내는 힘", subject: "이", topic: "은" },
  earth: { name: "흙", hanja: "土", image: "버티는 힘", subject: "이", topic: "은" },
  metal: { name: "쇠", hanja: "金", image: "끊어 내는 힘", subject: "가", topic: "는" },
  water: { name: "물", hanja: "水", image: "스며드는 힘", subject: "이", topic: "은" },
};

/** 올해 키워드 — 올해 천간이 내 일간에게 어떤 관계(십신)인지. */
export const YEAR_KEYWORD_BY_TEN_GOD: Record<TenGod, CopyLine> = {
  비견: { title: "내 편 늘리기", line: "나랑 닮은 사람이 자꾸 나타나는 해예요. 경쟁자처럼 보여도 같이 가면 판이 커져요. 혼자 다 하려는 고집만 내려놓으면 돼요." },
  겁재: { title: "지갑 단속, 마음 단속", line: "의리로 시작한 일이 돈 얘기로 끝나기 쉬운 해예요. 거절 한 번이 관계 열 개를 지켜 줘요." },
  식신: { title: "좋아하는 걸 꺼내는 해", line: "숨겨 둔 취미가 실력으로 보이기 시작해요. 잘 먹고 잘 자는 것만으로도 운이 굴러가는 해예요." },
  상관: { title: "말이 무기가 되는 해", line: "참으면 속이 상하고, 다 말하면 적이 생겨요. 같은 말을 웃으면서 하는 기술이 올해의 숙제예요." },
  편재: { title: "판을 넓히는 해", line: "생각지 못한 기회가 옆문으로 들어와요. 다 잡으려 하지 말고, 손에 남길 하나를 고르는 게 실력이에요." },
  정재: { title: "차곡차곡의 해", line: "화려하진 않아도 쌓이는 게 눈에 보이는 해예요. 매달 같은 날 같은 일을 하는 사람이 결국 이겨요." },
  편관: { title: "버티면 레벨업", line: "갑자기 책임이 몰려와 숨이 찰 수 있어요. 그런데 이 시기를 버틴 기록이 내년의 이력서가 돼요." },
  정관: { title: "이름이 불리는 해", line: "인정, 자리, 약속 같은 단어가 가까워져요. 규칙을 지키는 내가 생각보다 멋있어 보이는 해예요." },
  편인: { title: "혼자만의 공부 시즌", line: "남들이 모르는 분야에 꽂히기 좋은 해예요. 잠깐 조용해졌다가 확 달라져서 돌아오는 그림이에요." },
  정인: { title: "도와주는 손이 오는 해", line: "윗사람, 선생님, 오래된 인연이 먼저 손을 내밀어요. 받는 것도 능력이니 고맙다는 말을 아끼지 마세요." },
};

/** 타고난 무기 — 일간(태어난 날의 천간) 10종. */
export const WEAPON_BY_DAY_STEM: Record<HeavenlyStem, CopyLine & { symbol: string }> = {
  甲: { symbol: "큰 나무", title: "곧은 추진력", line: "방향을 정하면 끝까지 밀어붙여요. 꺾이지 않는 게 장점이자 약점이라, 가끔은 휘어 주는 것도 전략이에요." },
  乙: { symbol: "덩굴 꽃", title: "어디서든 피어나는 적응력", line: "바위틈에서도 길을 찾아내요. 약해 보인다고 얕본 사람들이 나중에 제일 놀라요." },
  丙: { symbol: "한낮의 태양", title: "숨길 수 없는 존재감", line: "들어서기만 해도 분위기가 밝아져요. 모두를 비추느라 정작 나를 챙기는 걸 자주 잊어요." },
  丁: { symbol: "촛불", title: "한 사람을 녹이는 집중력", line: "넓게보다 깊게 비춰요. 내 사람이라고 정한 순간부터 끝까지 따뜻한 타입이에요." },
  戊: { symbol: "큰 산", title: "흔들리지 않는 믿음직함", line: "말수가 적어도 다들 기대요. 가끔은 나도 힘들다고 말해도 산은 무너지지 않아요." },
  己: { symbol: "기름진 밭", title: "사람을 키우는 품", line: "옆에 있으면 다들 자라요. 남을 키우는 그 재능, 이번엔 나한테도 한 번 써 보세요." },
  庚: { symbol: "다듬기 전의 쇠", title: "결단의 칼", line: "미적거리는 걸 못 참아요. 그 직진이 일을 끝내요. 말투만 살짝 다듬으면 무적이에요." },
  辛: { symbol: "보석", title: "1%를 알아보는 눈", line: "남들이 놓친 디테일이 보여요. 예민하다는 말은 칭찬으로 들어도 돼요." },
  壬: { symbol: "큰 바다", title: "판을 읽는 시야", line: "멀리 보고 크게 움직여요. 생각이 너무 많아질 땐 일단 한 걸음이 정답이에요." },
  癸: { symbol: "봄비", title: "스며드는 공감력", line: "말 안 해도 상대 마음을 먼저 알아채요. 남의 비까지 다 맞아 주다 지치지 않게만 조심해요." },
};

/** 12운성 한 줄 — 일간이 일지에서 어떤 상태인지. 무거운 이름(병·사·묘·절)도 겁주지 않고 기질로 읽는다. */
export const LIFE_STAGE_LINE: Record<TwelveLifeStage, CopyLine> = {
  장생: { title: "새싹 모드", line: "시작하는 힘을 타고났어요. 처음 해 보는 일에서 유독 빛나요." },
  목욕: { title: "변신 모드", line: "꾸미고 바꾸는 감각이 있어요. 매력이 자꾸 새어 나오는 타입이에요." },
  관대: { title: "도전 모드", line: "자신감이 옷처럼 잘 맞아요. 일단 해 보고 배우는 쪽이에요." },
  건록: { title: "자립 모드", line: "내 힘으로 설 때 제일 편해요. 기대기보다 기대게 해 주는 사람이에요." },
  제왕: { title: "정점 모드", line: "기세가 세요. 앞에 서면 일이 풀리지만, 쉬는 법도 같이 배워야 오래 가요." },
  쇠: { title: "노련 모드", line: "힘을 아껴 쓸 줄 알아요. 조용히 결과를 내는 어른스러움이 있어요." },
  병: { title: "섬세 모드", line: "남의 아픔에 먼저 반응해요. 그 감수성이 사람을 살리는 재능이에요." },
  사: { title: "몰입 모드", line: "한 가지에 깊이 빠져요. 겉은 고요해도 머릿속은 늘 바빠요." },
  묘: { title: "저장 모드", line: "모으고 간직하는 힘이 있어요. 오래 아껴 온 것에서 운이 나와요." },
  절: { title: "리셋 모드", line: "끊을 땐 확실히 끊어요. 덕분에 새 판을 누구보다 빨리 짜요." },
  태: { title: "상상 모드", line: "가능성을 품고 있어요. 아직 안 꺼낸 카드가 제일 많은 타입이에요." },
  양: { title: "보호 모드", line: "사랑받으며 자라는 기운이에요. 주변의 도움을 자연스럽게 끌어당겨요." },
};

/** 재물 시크릿 키워드 — 일간과 재성(일간이 다스리는 오행) 기준. 공유 버튼을 누르면 열린다. */
export const WEALTH_SECRET_BY_DAY_STEM: Record<HeavenlyStem, CopyLine> = {
  甲: { title: "뿌리내린 자리의 돈", line: "당신에게 돈은 자리에서 와요. 한곳에 오래 뿌리내린 일, 꾸준히 지켜 온 관계가 재물 그릇이 돼요." },
  乙: { title: "작은 밭 여러 개", line: "한 방보다 여러 갈래가 맞아요. 작게 나눠 키운 수입 줄기가 모여서 숲이 돼요." },
  丙: { title: "값을 먼저 알아보는 눈", line: "당신의 돈은 가치를 매기는 데서 나와요. 남들이 지나친 물건, 사람, 아이디어의 값을 먼저 알아봐요." },
  丁: { title: "다듬어서 빛내는 손", line: "거친 걸 정교하게 바꾸는 순간 돈이 붙어요. 마감 품질이 곧 당신의 몸값이에요." },
  戊: { title: "막지 않고 돌리는 그릇", line: "돈은 쌓아 두기보다 돌릴 때 커지는 타입이에요. 사람과 정보가 오가는 길목에 서 있으면 돼요." },
  己: { title: "스며드는 관계 자산", line: "당신의 재물은 사람 사이로 스며들어요. 연락 한 통, 안부 한 줄이 나중에 기회로 돌아와요." },
  庚: { title: "키워서 거두는 나무", line: "당장 회수보다 자라나는 쪽에 걸 때 유리해요. 배움, 사람, 오래 갈 프로젝트가 당신의 재물 나무예요." },
  辛: { title: "취향이 수익이 되는 길", line: "당신이 고른 것엔 이유가 있어요. 그 안목을 기록이나 큐레이션으로 꺼내 보세요." },
  壬: { title: "드러날 때 붙는 돈", line: "보일 때 돈이 붙는 타입이에요. 숨어서 잘하기보다 보여 주면서 잘하는 쪽이 재물 흐름을 키워요." },
  癸: { title: "꺼지지 않는 작은 불씨", line: "확 타오르기보다 오래 켜 두는 쪽이에요. 작아도 끊기지 않는 수입 하나가 든든한 난로가 돼요." },
};

/** 재성 오행이 원국에 몇 개 드러났는지에 따른 덧붙임(확정 예언이 아니라 감 잡는 법). */
export function wealthPresenceLine(count: number): string {
  if (count <= 0) return "원국 겉에는 이 기운이 보이지 않아요. 그래서 일부러 찾아 나설 때 더 크게 체감하는 타입이에요.";
  if (count <= 2) return "원국에 알맞게 들어 있어요. 감을 잡기 쉬우니 작게 자주 시험해 보세요.";
  return "원국에 넉넉해요. 기회는 많은 편이라 무엇을 고를지 기준을 세우는 게 핵심이에요.";
}

/** 오행 밸런스 한 줄 — 가장 많은 기운과 비어 있는 기운. */
export function elementBalanceLine(counts: Record<ElementKey, number>): string {
  const entries = Object.entries(counts) as [ElementKey, number][];
  const max = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  const top = ELEMENT_LABEL[max[0]];
  const missing = entries.filter(([, n]) => n === 0).map(([key]) => ELEMENT_LABEL[key]);
  const lead = `${top.name}(${top.hanja})${top.subject} 가장 많아서 ${top.image}이 먼저 나와요.`;
  if (missing.length === 0) return `${lead} 다섯 기운이 다 들어 있어서 어느 판에 가도 적응이 빨라요.`;
  const last = missing[missing.length - 1];
  return `${lead} ${missing.map((el) => el.name).join("·")}${last.topic} 비어 있어서, 그 기운을 가진 사람과 있을 때 유독 편해요.`;
}
