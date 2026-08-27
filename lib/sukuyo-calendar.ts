import { cmsRecordRow } from "./cms/build-text";

// 🔴 음력일은 한국 음양력 코어에서만 나온다. lunar-javascript 는 **중국 표준시(CST) 기준 중국 음력**이라
// 삭이 CST 23시대에 들면 그 달 전체의 음력일이 하루 밀린다 — 실측 2026-08-27 기준 1900~2100 전수
// 73,414일 중 2,997일(4.08%)이 갈린다. 27수는 음력 월·일로 직접 결정되므로 그 하루가 곧 다른 수(宿)다.
import { solarToLunar } from "@/lib/korean-calendar";
import { buildSukuyoFromLunar } from "@/worker/lib/sukuyo-premium.js";

export const SUKUYO_CALENDAR_TIMEZONE = "Asia/Seoul";

export type SukuyoCalendarMansionText = {
  key: string;
  koreanName: string;
  hanjaName: string;
  japaneseName: string;
  keywords: string[];
  core: string;
  usagePoint: string;
  caution: string;
  love: string;
  workMoney: string;
  advice: string;
};

export type SukuyoCalendarDay = {
  date: string;
  day: number;
  weekday: string;
  weekdayIndex: number;
  mansionIndex: number;
  mansionKey: string;
  koreanName: string;
  hanjaName: string;
  japaneseName: string;
  keywords: string[];
  isToday: boolean;
  lunarDate: {
    year: number | null;
    month: number;
    day: number;
    isLeapMonth: boolean;
  };
  core: string;
  usagePoint: string;
  caution: string;
  love: string;
  workMoney: string;
  advice: string;
  // 로그인 + 프로필 본명수가 있을 때만 채워지는 그날의 개인화 길흉(서버 계산).
  dayFortune?: SukuyoDayFortune | null;
};

export type SukuyoDayFortuneTier =
  | "pivotal"
  | "great-auspicious"
  | "auspicious"
  | "caution"
  | "great-caution";

export type SukuyoDayFortune = {
  relationType: string;
  relationTypeHan: string;
  aRole: string;
  bRole: string;
  roleHan: string;
  forwardDistance: number;
  tier: SukuyoDayFortuneTier;
  tierLabel: string;
  score: number;
  headline: string;
  advice: string;
};

export type SukuyoCalendarMonth = {
  year: number;
  month: number;
  timezone: string;
  monthKey: string;
  today: string;
  firstWeekdayIndex: number;
  daysInMonth: number;
  // 뷰어가 로그인 + 프로필 본명수를 가져 개인화 길흉이 채워졌는지 여부.
  viewerHasMansion?: boolean;
  days: SukuyoCalendarDay[];
};

type BuildMonthOptions = {
  now?: Date;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export const SUKUYO_CALENDAR_MANSIONS: SukuyoCalendarMansionText[] = [
  {
    key: "m01-kaku",
    koreanName: "각수",
    hanjaName: "角宿",
    japaneseName: "Kaku",
    keywords: ["개척", "시작", "표현", "추진"],
    core: "첫 문을 여는 별입니다. 막혀 있던 흐름에 방향을 세우고, 아직 말로 다듬지 못한 생각을 밖으로 꺼내게 합니다.",
    usagePoint: "새 제안, 첫 연락, 기획 초안, 시작을 알리는 발표에 힘이 실립니다.",
    caution: "마음이 앞서면 약속의 폭이 커집니다. 오늘은 속도보다 첫 기준을 분명히 두는 편이 좋습니다.",
    love: "끌림을 숨기기보다 작은 관심을 먼저 건네면 인연의 문이 부드럽게 열립니다.",
    workMoney: "새로운 수입원 탐색, 영업, 브랜딩, 프로젝트 착수에 어울립니다.",
    advice: "먼저 문을 열되, 오늘 끝낼 수 있는 크기로 시작하세요.",
  },
  {
    key: "m02-kou",
    koreanName: "항수",
    hanjaName: "亢宿",
    japaneseName: "Kou",
    keywords: ["자존", "절제", "원칙", "균형"],
    core: "기품과 기준을 세우는 별입니다. 쉽게 흔들리지 않는 마음이 살아나고, 무리한 부탁 앞에서 선을 긋게 합니다.",
    usagePoint: "계약 조건, 경계 설정, 규칙 정비, 중요한 답변을 정리하기 좋습니다.",
    caution: "자존이 방어로 굳으면 대화가 차가워집니다. 단호함 안에 여지를 남겨야 합니다.",
    love: "상대에게 맞추기만 하던 흐름을 멈추고, 내가 편안한 거리와 속도를 말하기 좋습니다.",
    workMoney: "지출 기준, 협상 조건, 가격 정책처럼 손해를 막는 판단에 힘이 붙습니다.",
    advice: "품위를 지키면서도 마음의 문은 완전히 닫지 마세요.",
  },
  {
    key: "m03-tei",
    koreanName: "저수",
    hanjaName: "氐宿",
    japaneseName: "Tei",
    keywords: ["기반", "축적", "안정", "신뢰"],
    core: "뿌리를 깊게 내리는 별입니다. 화려한 확장보다 오래 남을 기반과 신뢰를 다지는 기운이 머무릅니다.",
    usagePoint: "저축, 자료 정리, 생활 루틴, 가족과의 약속을 안정시키기 좋습니다.",
    caution: "익숙한 방식만 붙들면 기회가 늦게 들어옵니다. 작은 변화는 받아들이는 편이 좋습니다.",
    love: "말보다 반복되는 행동에서 마음이 드러납니다. 꾸준한 확인이 관계를 안정시킵니다.",
    workMoney: "장기 관리, 재정 점검, 자산 축적, 운영 업무에 어울립니다.",
    advice: "새로 얻기보다 이미 가진 것을 단단히 묶으세요.",
  },
  {
    key: "m04-bou",
    koreanName: "방수",
    hanjaName: "房宿",
    japaneseName: "Bou",
    keywords: ["품격", "주도", "성취", "보호"],
    core: "중심을 세우고 사람을 품는 별입니다. 책임 있는 자리에서 빛나며, 주변을 안정시키는 힘이 강하게 떠오릅니다.",
    usagePoint: "리더십 발휘, 공식 발표, 중요한 만남, 보호해야 할 일을 맡기 좋습니다.",
    caution: "도와주려는 마음이 지시처럼 들릴 수 있습니다. 상대의 자리를 먼저 인정해야 합니다.",
    love: "든든함이 매력으로 보입니다. 다만 상대를 내 방식으로 고치려는 말은 줄이는 편이 좋습니다.",
    workMoney: "관리직, 고객 응대, 책임 있는 결정, 품질 개선에 힘이 실립니다.",
    advice: "주도하되, 함께 걷는 사람의 속도도 살피세요.",
  },
  {
    key: "m05-shin",
    koreanName: "심수",
    hanjaName: "心宿",
    japaneseName: "Shin",
    keywords: ["통찰", "집중", "감응", "본심"],
    core: "보이지 않는 마음의 결을 읽는 별입니다. 말보다 표정, 분위기, 침묵 안의 의미가 선명해집니다.",
    usagePoint: "속마음 점검, 깊은 상담, 전략 재정비, 집중 작업에 잘 맞습니다.",
    caution: "예민함이 커지면 작은 신호도 크게 해석됩니다. 확인 없이 단정하지 않아야 합니다.",
    love: "상대의 진심을 알고 싶다면 압박보다 조용한 질문이 더 잘 통합니다.",
    workMoney: "분석, 리서치, 심층 기획, 리스크 감지에 좋은 날입니다.",
    advice: "느낌은 귀하게 듣고, 결정은 한 번 더 확인하세요.",
  },
  {
    key: "m06-bi",
    koreanName: "미수",
    hanjaName: "尾宿",
    japaneseName: "Bi",
    keywords: ["회복", "끈기", "정화", "지속"],
    core: "끝까지 붙들고 회복시키는 별입니다. 흐트러진 마음과 일을 다시 이어 붙이는 힘이 살아납니다.",
    usagePoint: "밀린 일 처리, 몸과 마음의 회복, 관계의 뒤처리, 반복 훈련에 어울립니다.",
    caution: "참는 힘이 강한 만큼 피로를 늦게 알아차립니다. 무리한 책임은 나누어야 합니다.",
    love: "쉽게 포기하지 않는 마음이 깊이를 만듭니다. 다만 혼자 버티는 사랑은 줄여야 합니다.",
    workMoney: "복구, 유지 보수, 장기 프로젝트, 꾸준한 수입 관리에 힘이 붙습니다.",
    advice: "붙들 것은 붙들고, 오래 아프게 한 것은 정리하세요.",
  },
  {
    key: "m07-ki",
    koreanName: "기수",
    hanjaName: "箕宿",
    japaneseName: "Ki",
    keywords: ["자유", "확장", "탐색", "환기"],
    core: "바람처럼 길을 넓히는 별입니다. 답답한 틀에서 벗어나 새 정보와 새 사람을 만날 때 흐름이 살아납니다.",
    usagePoint: "이동, 학습, 시장 조사, 새로운 취향 탐색에 좋습니다.",
    caution: "흥미가 흩어지면 중요한 마무리가 늦어집니다. 오늘의 중심 하나는 정해야 합니다.",
    love: "가볍고 솔직한 대화가 매력을 엽니다. 구속처럼 들리는 말은 피하는 편이 좋습니다.",
    workMoney: "홍보, 외부 미팅, 아이디어 확장, 해외나 온라인 채널에 어울립니다.",
    advice: "시야를 넓히되, 돌아올 기준점을 하나 남겨두세요.",
  },
  {
    key: "m08-to",
    koreanName: "두수",
    hanjaName: "斗宿",
    japaneseName: "To",
    keywords: ["지혜", "설계", "배움", "안내"],
    core: "북두처럼 방향을 잡는 별입니다. 흩어진 생각을 체계로 묶고, 누군가에게 길을 알려 주는 힘이 드러납니다.",
    usagePoint: "계획표, 공부, 코칭, 시스템 정리에 잘 맞습니다.",
    caution: "알려 주려는 마음이 훈계로 들릴 수 있습니다. 질문을 먼저 받아야 길이 열립니다.",
    love: "상대의 고민을 바로 고치려 하기보다, 함께 방향을 찾는 태도가 따뜻하게 닿습니다.",
    workMoney: "교육, 컨설팅, 구조화, 일정 관리, 전문성 강화에 힘이 붙습니다.",
    advice: "답을 서두르지 말고, 방향부터 또렷하게 세우세요.",
  },
  {
    key: "m09-jo",
    koreanName: "여수",
    hanjaName: "女宿",
    japaneseName: "Jo",
    keywords: ["정돈", "책임", "완성", "섬세"],
    core: "흐트러진 결을 가지런히 정돈하는 별입니다. 작은 틈을 발견하고 완성도를 높이는 감각이 살아납니다.",
    usagePoint: "문서 검토, 생활 정리, 세부 체크, 약속 확인에 좋습니다.",
    caution: "완벽을 좇다가 마음이 좁아질 수 있습니다. 충분히 좋은 선에서 멈추는 지혜가 필요합니다.",
    love: "세심한 배려가 크게 전해집니다. 다만 서운함을 점검표처럼 말하지 않는 편이 좋습니다.",
    workMoney: "회계, 검수, 품질 관리, 비용 정리에 어울립니다.",
    advice: "작은 것을 바로잡되, 마음까지 날카롭게 세우지는 마세요.",
  },
  {
    key: "m10-kyo",
    koreanName: "허수",
    hanjaName: "虛宿",
    japaneseName: "Kyo",
    keywords: ["성찰", "비움", "정신", "거리"],
    core: "비워야 보이는 것을 비추는 별입니다. 소란을 줄일수록 진짜 마음과 필요한 선택이 드러납니다.",
    usagePoint: "휴식, 명상, 관계 거리 조절, 생각 비우기에 잘 맞습니다.",
    caution: "혼자 정리하는 시간이 길어지면 오해가 생깁니다. 최소한의 안부는 남기는 편이 좋습니다.",
    love: "감정을 몰아붙이기보다 잠시 숨을 고르면 관계의 본심이 더 분명해집니다.",
    workMoney: "불필요한 지출 정리, 업무 축소, 우선순위 재배치에 어울립니다.",
    advice: "덜어낼수록 선명해지는 것을 믿어도 좋습니다.",
  },
  {
    key: "m11-ki-danger",
    koreanName: "위수",
    hanjaName: "危宿",
    japaneseName: "Ki",
    keywords: ["전환", "긴장", "판단", "경계"],
    core: "아슬한 경계에서 판단을 깨우는 별입니다. 변화의 조짐이 빠르게 들어오고, 위험과 기회를 함께 살피게 합니다.",
    usagePoint: "위험 점검, 방향 전환, 중단 여부 판단, 안전 장치 마련에 좋습니다.",
    caution: "불안이 커지면 모든 것을 위협으로 볼 수 있습니다. 사실과 감정을 나누어 보아야 합니다.",
    love: "예민한 말이 쉽게 상처가 됩니다. 중요한 이야기는 짧고 분명하게 건네는 편이 좋습니다.",
    workMoney: "투자 판단, 계약 리스크, 일정 변경, 보안 점검에 힘이 붙습니다.",
    advice: "감으로 멈추고, 근거로 다시 움직이세요.",
  },
  {
    key: "m12-shitsu",
    koreanName: "실수",
    hanjaName: "室宿",
    japaneseName: "Shitsu",
    keywords: ["창조", "개시", "집중", "공간"],
    core: "새 공간을 짓고 일을 시작하는 별입니다. 마음이 머물 자리를 만들면 추진력이 곧장 살아납니다.",
    usagePoint: "새 프로젝트, 이사나 공간 정리, 팀 세팅, 창작 시작에 어울립니다.",
    caution: "시작의 열이 커서 마무리를 가볍게 볼 수 있습니다. 끝 기준을 먼저 정해야 합니다.",
    love: "둘만의 약속이나 작은 루틴을 만들면 관계가 빠르게 안정됩니다.",
    workMoney: "창업 준비, 브랜드 공간, 작업실 정비, 신규 업무 개시에 좋습니다.",
    advice: "오늘의 시작이 오래 갈 집이 되도록 기초를 놓으세요.",
  },
  {
    key: "m13-heki",
    koreanName: "벽수",
    hanjaName: "壁宿",
    japaneseName: "Heki",
    keywords: ["조율", "관계", "기록", "중재"],
    core: "서로 다른 마음을 이어 붙이는 별입니다. 기록하고 조율할수록 관계의 틈이 잦아듭니다.",
    usagePoint: "협의, 중재, 회의록, 합의문, 관계 회복 대화에 좋습니다.",
    caution: "모두를 맞추려다 내 마음이 빠질 수 있습니다. 조율 안에도 기준이 필요합니다.",
    love: "오해를 풀기 좋은 날입니다. 감정보다 있었던 일을 차분히 나누면 길이 열립니다.",
    workMoney: "파트너십, 공동 업무, 고객 조율, 문서 합의에 힘이 붙습니다.",
    advice: "말의 온도를 낮추고, 약속의 형태를 남기세요.",
  },
  {
    key: "m14-kei",
    koreanName: "규수",
    hanjaName: "奎宿",
    japaneseName: "Kei",
    keywords: ["전통", "품격", "문서", "기준"],
    core: "오래된 기준과 품격을 되살리는 별입니다. 허술한 것을 바로잡고, 이름값에 맞는 태도를 갖추게 합니다.",
    usagePoint: "문서 작성, 이력 정리, 공식 절차, 예의를 갖춘 만남에 좋습니다.",
    caution: "격식을 지키려다 마음이 멀어질 수 있습니다. 형식 안에 따뜻함을 넣어야 합니다.",
    love: "가벼운 말보다 책임 있는 태도가 매력으로 닿습니다.",
    workMoney: "계약서, 포트폴리오, 자격, 법적 절차, 브랜드 신뢰 관리에 어울립니다.",
    advice: "품격은 단단하게, 표현은 부드럽게 가져가세요.",
  },
  {
    key: "m15-ro",
    koreanName: "루수",
    hanjaName: "婁宿",
    japaneseName: "Ro",
    keywords: ["연결", "교류", "확장", "대화"],
    core: "사람과 사람을 연결하는 별입니다. 대화의 길이 열리고, 뜻밖의 소개와 제안이 들어오기 쉽습니다.",
    usagePoint: "네트워킹, 소개, 홍보, 모임, 협업 제안에 좋습니다.",
    caution: "약속이 많아지면 집중이 흐려집니다. 친절한 거절도 필요합니다.",
    love: "가볍게 안부를 묻는 말에서 다시 가까워질 실마리가 생깁니다.",
    workMoney: "영업, 제휴, 커뮤니티, SNS, 고객 관계에 힘이 붙습니다.",
    advice: "문을 넓히되, 오래 갈 인연을 먼저 알아보세요.",
  },
  {
    key: "m16-i",
    koreanName: "위수",
    hanjaName: "胃宿",
    japaneseName: "I",
    keywords: ["축적", "관리", "재정", "준비"],
    core: "필요한 것을 모으고 살림을 살피는 별입니다. 감각적인 소비보다 실속 있는 축적이 중요해집니다.",
    usagePoint: "예산 관리, 식생활 정비, 재고 점검, 생활 기반 마련에 좋습니다.",
    caution: "불안을 채우려는 소비가 생길 수 있습니다. 지금 필요한 것과 갖고 싶은 것을 구분해야 합니다.",
    love: "함께 먹고 쉬는 시간이 관계의 안정감을 키웁니다.",
    workMoney: "재무 정리, 운영비 점검, 물류, 자원 관리에 어울립니다.",
    advice: "마음을 채우기 전에 생활의 그릇부터 정돈하세요.",
  },
  {
    key: "m17-bou",
    koreanName: "묘수",
    hanjaName: "昴宿",
    japaneseName: "Bou",
    keywords: ["관찰", "선별", "명예", "판단"],
    core: "분별의 눈을 밝히는 별입니다. 무엇을 가까이 두고 무엇을 멀리할지 감각이 예리해집니다.",
    usagePoint: "사람 선별, 품질 검토, 평판 관리, 중요한 선택에 좋습니다.",
    caution: "판단이 빠른 만큼 말이 날카로워질 수 있습니다. 평가보다 관찰을 먼저 두어야 합니다.",
    love: "상대의 진가를 천천히 보면 불필요한 실망을 줄일 수 있습니다.",
    workMoney: "심사, 큐레이션, 브랜드 이미지, 채용, 투자 선별에 힘이 붙습니다.",
    advice: "좋고 싫음을 서두르지 말고, 오래 남을 가치를 보세요.",
  },
  {
    key: "m18-hitsu",
    koreanName: "필수",
    hanjaName: "畢宿",
    japaneseName: "Hitsu",
    keywords: ["완성", "근면", "결실", "약속"],
    core: "맡은 일을 끝까지 매듭짓는 별입니다. 성실한 반복이 눈에 보이는 결실로 이어집니다.",
    usagePoint: "마감, 점검, 약속 이행, 장기 업무의 마무리에 좋습니다.",
    caution: "내가 해야 한다는 마음이 강해져 과로하기 쉽습니다. 도움을 받아도 흐름은 무너지지 않습니다.",
    love: "작은 약속을 지키는 모습이 신뢰로 쌓입니다.",
    workMoney: "납품, 정산, 결과 보고, 장기 고객 관리에 어울립니다.",
    advice: "오늘은 크게 벌리기보다 확실히 끝내는 쪽이 빛납니다.",
  },
  {
    key: "m19-shi",
    koreanName: "자수",
    hanjaName: "觜宿",
    japaneseName: "Shi",
    keywords: ["언어", "기획", "설득", "표현"],
    core: "말과 문장에 힘이 깃드는 별입니다. 생각을 정리해 전하면 사람의 마음이 움직입니다.",
    usagePoint: "제안서, 상담, 발표, 콘텐츠 작성, 중요한 메시지에 좋습니다.",
    caution: "표현이 앞서면 과장처럼 들릴 수 있습니다. 핵심을 짧고 정확하게 말해야 합니다.",
    love: "돌려 말하기보다 다정하고 분명한 문장이 관계를 편하게 만듭니다.",
    workMoney: "마케팅 문구, 협상, 강의, 세일즈, 기획안에 힘이 붙습니다.",
    advice: "말을 많이 하기보다, 마음에 남을 한 문장을 고르세요.",
  },
  {
    key: "m20-shin-three",
    koreanName: "삼수",
    hanjaName: "參宿",
    japaneseName: "Shin",
    keywords: ["변화", "개성", "속도", "돌파"],
    core: "강한 개성과 전환을 부르는 별입니다. 멈춰 있던 흐름을 단숨에 흔들고 새 가능성을 열게 합니다.",
    usagePoint: "방향 전환, 이미지 변화, 빠른 실행, 난관 돌파에 좋습니다.",
    caution: "강한 말과 빠른 결정이 주변을 놀라게 할 수 있습니다. 설명을 남기는 편이 좋습니다.",
    love: "끌림은 강하지만 기복도 커질 수 있습니다. 뜨거운 말보다 일관된 행동이 필요합니다.",
    workMoney: "런칭, 위기 대응, 경쟁 상황, 빠른 피드백 업무에 힘이 붙습니다.",
    advice: "속도는 살리되, 뒤따라올 사람이 이해할 길을 남기세요.",
  },
  {
    key: "m21-sei-well",
    koreanName: "정수",
    hanjaName: "井宿",
    japaneseName: "Sei",
    keywords: ["질서", "정리", "판단", "공정"],
    core: "맑은 우물처럼 질서를 세우는 별입니다. 감정의 물결을 가라앉히고 공정한 기준을 찾게 합니다.",
    usagePoint: "정책 정리, 역할 배분, 공정한 판단, 복잡한 문제 분류에 좋습니다.",
    caution: "옳고 그름에만 매이면 정서가 빠질 수 있습니다. 사람의 사정도 함께 보아야 합니다.",
    love: "관계의 규칙을 차분히 합의하면 불필요한 서운함이 줄어듭니다.",
    workMoney: "업무 프로세스, 법무, 회계, 조직 운영, 기준표 만들기에 어울립니다.",
    advice: "감정을 밀어내지 말고, 감정까지 담을 질서를 세우세요.",
  },
  {
    key: "m22-ki-ghost",
    koreanName: "귀수",
    hanjaName: "鬼宿",
    japaneseName: "Ki",
    keywords: ["직감", "감수성", "치유", "영감"],
    core: "보이지 않는 기척을 먼저 알아차리는 별입니다. 꿈, 직감, 예술적 감응이 깊어지고 치유의 문이 열립니다.",
    usagePoint: "상담, 예술, 꿈 기록, 마음 치유, 섬세한 돌봄에 좋습니다.",
    caution: "분위기에 쉽게 젖어 피로해질 수 있습니다. 감정의 경계를 세워야 합니다.",
    love: "말하지 않아도 느껴지는 것이 많습니다. 그래도 중요한 마음은 직접 확인해야 합니다.",
    workMoney: "힐링 콘텐츠, 예술 작업, 감성 기획, 고객 공감 업무에 힘이 붙습니다.",
    advice: "직감은 받아들이고, 내 마음의 경계는 부드럽게 지키세요.",
  },
  {
    key: "m23-ryu",
    koreanName: "류수",
    hanjaName: "柳宿",
    japaneseName: "Ryu",
    keywords: ["결속", "몰입", "소식", "감정"],
    core: "부드럽게 휘어지며 사람을 묶는 별입니다. 감정의 흐름이 살아나고, 오래된 소식이나 인연이 떠오르기 쉽습니다.",
    usagePoint: "관계 회복, 소식 전하기, 감정 표현, 예술적 몰입에 좋습니다.",
    caution: "정이 깊어지면 쉽게 끊지 못합니다. 나를 소모시키는 연결은 살펴야 합니다.",
    love: "그리움과 애정이 함께 올라옵니다. 따뜻한 말 한 줄이 관계를 움직일 수 있습니다.",
    workMoney: "커뮤니케이션, 팬덤, 고객 유지, 감성 콘텐츠에 어울립니다.",
    advice: "붙잡고 싶은 마음과 놓아야 할 마음을 함께 들어보세요.",
  },
  {
    key: "m24-sei-star",
    koreanName: "성수",
    hanjaName: "星宿",
    japaneseName: "Sei",
    keywords: ["리더십", "명성", "추진", "주목"],
    core: "별처럼 시선을 모으는 별입니다. 존재감이 강해지고, 앞에 서서 방향을 말해야 할 일이 생깁니다.",
    usagePoint: "발표, 홍보, 리더 결정, 공개적인 약속에 좋습니다.",
    caution: "주목받는 만큼 말과 태도가 크게 남습니다. 과열된 감정은 잠시 식혀야 합니다.",
    love: "당당한 태도가 매력으로 보입니다. 다만 상대를 관객처럼 두지 않도록 마음을 나누세요.",
    workMoney: "브랜드 노출, 세일즈, 리더십, 성과 발표에 힘이 붙습니다.",
    advice: "빛나되, 그 빛이 누군가를 비추는 방향인지 살피세요.",
  },
  {
    key: "m25-cho",
    koreanName: "장수",
    hanjaName: "張宿",
    japaneseName: "Cho",
    keywords: ["표현", "무대", "확장", "매력"],
    core: "커튼을 열고 넓게 펼치는 별입니다. 숨겨 둔 매력과 실력을 보여 주기에 좋은 기운이 흐릅니다.",
    usagePoint: "콘텐츠 공개, 무대, 디자인, 홍보, 자기 표현에 좋습니다.",
    caution: "화려함이 커지면 실속이 약해질 수 있습니다. 보여 주는 것과 실제 준비를 맞추어야 합니다.",
    love: "매력 표현이 자연스럽게 살아납니다. 다만 관심을 확인하려는 과한 연출은 줄이는 편이 좋습니다.",
    workMoney: "광고, 디자인, 공연, 런칭, 프레젠테이션에 어울립니다.",
    advice: "보여 줄 때는 당당하게, 약속할 때는 현실적으로 하세요.",
  },
  {
    key: "m26-yoku",
    koreanName: "익수",
    hanjaName: "翼宿",
    japaneseName: "Yoku",
    keywords: ["완성", "예의", "책임", "균형"],
    core: "날개를 정돈해 높은 곳으로 오르는 별입니다. 품위, 책임, 완성의 감각이 함께 움직입니다.",
    usagePoint: "마무리 점검, 공식 인사, 책임 있는 답변, 품질 완성에 좋습니다.",
    caution: "체면을 지키려다 속마음을 숨기면 관계가 멀어집니다. 필요한 말은 부드럽게 꺼내야 합니다.",
    love: "예의와 배려가 애정으로 전해집니다. 형식만 남지 않게 진심을 더하세요.",
    workMoney: "고객 신뢰, 검수, 행사, 공식 문서, 장기 평판 관리에 힘이 붙습니다.",
    advice: "높이 날기 전에 날개의 균형을 다시 맞추세요.",
  },
  {
    key: "m27-shin-carriage",
    koreanName: "진수",
    hanjaName: "軫宿",
    japaneseName: "Shin",
    keywords: ["정리", "종결", "전환", "돌봄"],
    core: "마지막 짐을 정리하고 다음 길을 준비하는 별입니다. 끝과 시작 사이에서 마음을 돌보는 힘이 드러납니다.",
    usagePoint: "종결, 인수인계, 정리, 회복 계획, 다음 단계 준비에 좋습니다.",
    caution: "끝내야 할 것을 미루면 마음이 무거워집니다. 작게라도 매듭을 만들어야 합니다.",
    love: "묵은 서운함을 정리하고, 앞으로의 방식을 다시 약속하기 좋습니다.",
    workMoney: "정산, 마감, 자료 보관, 다음 분기 준비, 회복성 업무에 어울립니다.",
    advice: "오늘의 매듭을 곱게 묶으면 다음 문이 조용히 열립니다.",
  },
];

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function formatKstDateKey(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`;
}

function readKstDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SUKUYO_CALENDAR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
  };
}

export function getKstTodayKey(date = new Date()) {
  const today = readKstDateParts(date);
  return formatKstDateKey(today.year, today.month, today.day);
}

export function getKstCurrentYearMonth(date = new Date()) {
  const today = readKstDateParts(date);
  return { year: today.year, month: today.month };
}

export function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0, 0, 0, 0)).getUTCDate();
}

export function getKstWeekdayIndex(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0)).getUTCDay();
}

function normalizeYearMonth(year: number, month: number) {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    throw new RangeError("연도는 1900년부터 2100년 사이로 입력해주세요.");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError("월은 1월부터 12월 사이로 입력해주세요.");
  }
  return { year, month };
}

function resolveSukuyoBySolarDate(year: number, month: number, day: number) {
  const lunar = solarToLunar(year, month, day);
  if (!lunar) {
    throw new RangeError(`한국 음양력 코어가 ${formatKstDateKey(year, month, day)} 를 답하지 못했습니다(지원 1900~2100).`);
  }
  const { lunarMonth, lunarDay, lunarYear, isLeapMonth } = lunar;
  const sukuyo = buildSukuyoFromLunar(lunarMonth, lunarDay, {
    isLeapMonth,
    source: "korean-calendar-core",
  });
  const mansionIndex = Number(sukuyo?.index);
  if (!Number.isInteger(mansionIndex) || mansionIndex < 0 || mansionIndex >= SUKUYO_CALENDAR_MANSIONS.length) {
    throw new Error("숙요 계산값을 달력 표기로 연결하지 못했습니다.");
  }
  return {
    mansionIndex,
    // 관리자 CMS(운세 콘텐츠 → 숙요 달력 해설)의 해당 수 행을 기본값 위에 얹는다.
    // 키는 27수 순서 인덱스라 임의로 늘지 않는다(폴백 우선).
    text: cmsRecordRow("sukuyo-calendar", "mansion", String(mansionIndex), SUKUYO_CALENDAR_MANSIONS[mansionIndex]),
    lunarYear,
    lunarMonth,
    lunarDay,
    isLeapMonth,
  };
}

export function buildSukuyoCalendarDay(year: number, month: number, day: number, todayKey = getKstTodayKey()): SukuyoCalendarDay {
  const date = formatKstDateKey(year, month, day);
  const resolved = resolveSukuyoBySolarDate(year, month, day);
  const weekdayIndex = getKstWeekdayIndex(year, month, day);
  const text = resolved.text;

  return {
    date,
    day,
    weekday: WEEKDAYS[weekdayIndex],
    weekdayIndex,
    mansionIndex: resolved.mansionIndex,
    mansionKey: text.key,
    koreanName: text.koreanName,
    hanjaName: text.hanjaName,
    japaneseName: text.japaneseName,
    keywords: text.keywords.slice(0, 4),
    isToday: date === todayKey,
    lunarDate: {
      year: resolved.lunarYear,
      month: resolved.lunarMonth,
      day: resolved.lunarDay,
      isLeapMonth: resolved.isLeapMonth,
    },
    core: text.core,
    usagePoint: text.usagePoint,
    caution: text.caution,
    love: text.love,
    workMoney: text.workMoney,
    advice: text.advice,
  };
}

export function buildSukuyoCalendarMonth(yearInput: number, monthInput: number, options: BuildMonthOptions = {}): SukuyoCalendarMonth {
  const { year, month } = normalizeYearMonth(yearInput, monthInput);
  const today = getKstTodayKey(options.now);
  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, index) =>
    buildSukuyoCalendarDay(year, month, index + 1, today)
  );

  return {
    year,
    month,
    timezone: SUKUYO_CALENDAR_TIMEZONE,
    monthKey: `${String(year).padStart(4, "0")}-${pad2(month)}`,
    today,
    firstWeekdayIndex: getKstWeekdayIndex(year, month, 1),
    daysInMonth,
    days,
  };
}
