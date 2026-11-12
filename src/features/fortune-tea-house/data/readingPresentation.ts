import type { TenGodId } from "./tenGods";

/** Display copy only. The calculation IDs and persisted readings remain authoritative. */
export const tenGodPresentation = {
  bigeon: { title: "나를 지키는 힘", advice: "혼자 결정할 일과 도움을 구할 일을 하나씩 나누어 보세요." },
  geopjae: { title: "경쟁에 반응하는 힘", advice: "다른 사람의 속도보다 내가 지킬 기준과 협력할 범위를 먼저 정해 보세요." },
  siksin: { title: "꾸준히 만들어내는 힘", advice: "좋아하는 일을 작은 결과물로 만들어 꾸준히 이어가 보세요." },
  sanggwan: { title: "나답게 표현하는 힘", advice: "전하고 싶은 말의 핵심을 적고, 상대가 받아들일 표현을 골라 보세요." },
  pyeonjae: { title: "기회를 발견하는 힘", advice: "새로운 제안은 시간과 비용을 확인한 뒤 작은 규모로 시험해 보세요." },
  jeongjae: { title: "생활을 차곡차곡 쌓는 힘", advice: "반복되는 지출과 일정을 정리하고, 오래 유지할 수 있는 방식을 찾아보세요." },
  pyeongwan: { title: "압박을 돌파하는 힘", advice: "지금 해결할 일 하나와 내려놓을 부담 하나를 구분해 보세요." },
  jeonggwan: { title: "약속으로 신뢰를 쌓는 힘", advice: "지킬 수 있는 약속을 정하고, 감당하기 어려운 부탁에는 범위를 알려주세요." },
  pyeonin: { title: "다른 관점으로 읽는 힘", advice: "떠오른 생각을 사실과 추측으로 나누고, 확인할 질문을 하나 적어보세요." },
  jeongin: { title: "배우고 회복하는 힘", advice: "배운 것 중 하나를 직접 해보고, 충분히 쉬는 시간도 일정에 넣어주세요." },
} satisfies Record<TenGodId, { title: string; advice: string }>;

export const dayMasterProfiles = {
  gap: { label: "갑목(甲木)", description: "큰 나무처럼 방향을 세우고 꾸준히 성장하려는 기질이에요. 시작하는 힘과 책임감이 장점이지만, 내 방식만 지키려 하면 유연함이 줄어들 수 있어요.", advice: "목표 하나를 정하되, 다른 사람의 방법도 한 가지 받아들여 보세요." },
  eul: { label: "을목(乙木)", description: "풀과 덩굴처럼 주변을 살피며 길을 찾는 기질이에요. 유연함과 섬세한 관계 감각이 장점이지만, 맞춰주는 일이 많아지면 내 바람이 흐려질 수 있어요.", advice: "상대의 기대를 살피기 전에 내가 원하는 것을 한 문장으로 적어보세요." },
  byeong: { label: "병화(丙火)", description: "햇빛처럼 생각과 감정을 밖으로 나누는 기질이에요. 밝은 추진력과 개방성이 장점이지만, 속도가 빨라지면 세부 확인을 놓칠 수 있어요.", advice: "새 일을 시작하기 전, 일정과 마무리 조건을 함께 확인해 보세요." },
  jeong: { label: "정화(丁火)", description: "등불처럼 가까운 곳을 세심하게 밝히는 기질이에요. 집중력과 따뜻한 배려가 장점이지만, 마음을 오래 쓰면 혼자 지치기 쉬워요.", advice: "마음을 쓸 대상과 쉴 시간을 함께 정해 에너지를 나누어 주세요." },
  mu: { label: "무토(戊土)", description: "넓은 산처럼 중심을 잡고 사람을 품으려는 기질이에요. 안정감과 끈기가 장점이지만, 익숙한 방식을 지키다 변화가 늦어질 수 있어요.", advice: "지켜야 할 원칙은 남기고, 익숙한 습관 하나만 작게 바꾸어 보세요." },
  gi: { label: "기토(己土)", description: "밭의 흙처럼 생활을 돌보고 차근차근 가꾸는 기질이에요. 현실 감각과 돌봄이 장점이지만, 작은 걱정까지 떠안으면 부담이 커질 수 있어요.", advice: "내가 돌볼 일과 상대가 맡을 일을 구분하고, 끝낸 일도 기록해 주세요." },
  gyeong: { label: "경금(庚金)", description: "단단한 쇠처럼 기준을 세우고 결단하려는 기질이에요. 실행력과 분명한 판단이 장점이지만, 옳고 그름을 빨리 가르면 관계의 여백이 줄어들 수 있어요.", advice: "결론을 말하기 전에 상대가 그렇게 생각한 이유를 한 번 물어보세요." },
  sin: { label: "신금(辛金)", description: "정성껏 다듬은 보석처럼 섬세한 차이와 완성도를 알아보는 기질이에요. 관찰력과 정교함이 장점이지만, 기준이 높아지면 자신에게도 까다로워질 수 있어요.", advice: "오늘 필요한 완성도를 정하고, 이미 충분히 해낸 부분을 하나 인정해 주세요." },
  im: { label: "임수(壬水)", description: "큰 물처럼 넓게 보고 여러 가능성을 연결하는 기질이에요. 포용력과 상황 적응이 장점이지만, 선택지가 많으면 방향이 흩어질 수 있어요.", advice: "가능성을 넓힌 뒤, 이번 주에 실행할 한 가지로 좁혀보세요." },
  gye: { label: "계수(癸水)", description: "이슬과 비처럼 작은 변화를 읽고 스며드는 기질이에요. 직감과 세심한 이해가 장점이지만, 생각을 안에 쌓으면 망설임이 길어질 수 있어요.", advice: "마음속 생각을 글로 꺼내고, 확인할 수 있는 작은 행동으로 옮겨보세요." },
};

export type DayMasterId = keyof typeof dayMasterProfiles;
const dayMasterAliases: Record<string, DayMasterId> = {
  갑: "gap", 甲: "gap", 갑목: "gap", 甲木: "gap",
  을: "eul", 乙: "eul", 을목: "eul", 乙木: "eul",
  병: "byeong", 丙: "byeong", 병화: "byeong", 丙火: "byeong",
  정: "jeong", 丁: "jeong", 정화: "jeong", 丁火: "jeong",
  무: "mu", 戊: "mu", 무토: "mu", 戊土: "mu",
  기: "gi", 己: "gi", 기토: "gi", 己土: "gi",
  경: "gyeong", 庚: "gyeong", 경금: "gyeong", 庚金: "gyeong",
  신: "sin", 辛: "sin", 신금: "sin", 辛金: "sin",
  임: "im", 壬: "im", 임수: "im", 壬水: "im",
  계: "gye", 癸: "gye", 계수: "gye", 癸水: "gye",
};

export function resolveDayMaster(value?: string): DayMasterId | undefined {
  if (!value) return undefined;
  const compact = value.replace(/\s+/g, "");
  // Accept labelled stems, never infer a stem from prose such as '신강' or a name.
  return dayMasterAliases[compact] || dayMasterAliases[compact.replace(/[（(].*?[)）]/g, "")];
}
