import { STAGE_KEY_TO_LABEL } from "@/components/fortune/animal-twelve/animalTwelveData";
import type { AnimalDestinyData, TwelveGrowthAnimalResult, TwelveStageKey } from "./types";

type StageSeed = {
  animalTitle: string;
  keywords: string[];
  elementTags: string[];
  identityLine: string;
  energySummary: string;
  outerFace: string;
  innerMotive: string;
  strengths: string;
  shadows: string;
  love: string;
  workMoney: string;
  relationships: string;
  stressPattern: string;
  recoveryGuide: string;
  todayAction: string;
  growthMission: string;
  compatibleEnergy: string;
  cautionEnergy: string;
};

const STAGE_SEEDS: Record<TwelveStageKey, StageSeed> = {
  jangsaeng: {
    animalTitle: "새벽의 싹을 여는 탐험형",
    keywords: ["시작운", "회복탄성", "관계개방", "호기심", "성장리듬"],
    elementTags: ["목기", "새싹", "봄빛"],
    identityLine: "새로운 판을 열 때 가장 살아나는 개척형 에너지",
    energySummary: "장생은 생명의 맥이 처음 힘을 얻는 구간이라, 낯선 환경에서도 배우며 자라는 힘이 빠르게 활성화됩니다.",
    outerFace: "외부에서는 첫인상이 부드럽고 경계가 낮아, 사람을 편하게 만드는 분위기로 읽히기 쉽습니다.",
    innerMotive: "내면에서는 누구보다 단단한 자립 욕구가 있어, 스스로 선택한 길에서 성장을 증명하려는 의지가 분명합니다.",
    strengths: "시작 속도와 회복력이 좋아 실패를 경험으로 전환하는 능력이 뛰어납니다. 관계에서도 먼저 문을 열어 팀 분위기를 살리고, 초반 동력을 만들 때 강합니다.",
    shadows: "가능성이 보이면 한 번에 너무 많은 일을 벌려 체력과 집중이 분산될 수 있습니다. 기대가 큰 만큼 작은 지연에도 조급함이 올라와 리듬이 흔들릴 수 있습니다.",
    love: "연애에서는 설렘을 빠르게 느끼지만, 마음이 깊어질수록 안정 루틴을 확인하고 싶어 합니다. 상대와의 성장 방향이 맞는지 점검할 때 관계 만족도가 크게 올라갑니다.",
    workMoney: "일과 재물에서는 신사업, 신규 프로젝트, 초기 세팅 구간에서 성과가 납니다. 작은 성취를 반복해 신뢰를 쌓을수록 수익이 길게 붙는 구조입니다.",
    relationships: "인간관계는 넓게 시작해 깊게 추리는 편이 유리합니다. 따뜻한 사람이라는 평판을 지키되, 에너지 소모가 큰 약속은 선별해야 균형이 유지됩니다.",
    stressPattern: "스트레스가 쌓이면 해야 할 일을 늘리는 방식으로 불안을 상쇄하려 합니다. 일정이 과밀해질수록 감정 회복이 늦어져 피로가 누적됩니다.",
    recoveryGuide: "하루 계획을 세 개 핵심 목표로 줄이고, 완료 기록을 눈에 보이게 남기면 회복이 빨라집니다. 산책과 수면 리듬 고정이 특히 효과적입니다.",
    todayAction: "오늘은 새로운 한 가지를 시도하되, 끝낼 기준을 먼저 적어두세요. 시작의 에너지를 완주의 경험으로 연결하는 것이 핵심입니다.",
    growthMission: "이번 주 미션은 매일 20분, 한 가지 역량만 집중 강화하는 루틴을 만드는 것입니다. 지속성이 쌓이면 운의 체감이 즉시 달라집니다.",
    compatibleEnergy: "건록·양 기운처럼 현실 루틴을 잡아주는 에너지와 잘 맞습니다.",
    cautionEnergy: "절 기운처럼 급격한 단절 성향과는 속도 조율이 필요합니다.",
  },
  mogyok: {
    animalTitle: "감정 파동을 읽는 공감형",
    keywords: ["감수성", "표현력", "매력발산", "관계센스", "분위기"],
    elementTags: ["수기", "물결", "달빛"],
    identityLine: "감정의 흐름을 읽고 분위기를 바꾸는 감각형 에너지",
    energySummary: "목욕은 에너지가 외부와 처음 강하게 접촉하는 구간이라 감정 반응이 빠르고 표현력이 풍부해집니다.",
    outerFace: "바깥에서는 세련된 감각과 부드러운 소통으로 기억되며, 대화의 온도를 자연스럽게 조절하는 사람으로 보입니다.",
    innerMotive: "내면에서는 진짜로 이해받고 싶은 욕구가 강해, 관계의 진정성을 매우 중요하게 여깁니다.",
    strengths: "미세한 감정 변화 포착 능력이 뛰어나 갈등 완충 역할을 잘합니다. 콘텐츠, 브랜딩, 관계 설계처럼 사람의 마음을 다루는 장면에서 탁월합니다.",
    shadows: "상대 반응을 과하게 읽어 스스로 지치는 패턴이 생길 수 있습니다. 기분이 흔들리는 날에는 집중이 분산되고 결정이 늦어질 수 있습니다.",
    love: "연애에서는 교감의 밀도가 중요합니다. 표현이 풍부한 관계에서 행복감이 높고, 감정을 설명하지 않는 관계에서는 빠르게 피로를 느낍니다.",
    workMoney: "일과 재물은 감각 자본을 수익으로 전환할 때 확장됩니다. 취향 큐레이션, 관계형 서비스, 기획 제안에서 돈의 흐름이 열리기 쉽습니다.",
    relationships: "사람 사이의 온도 차를 조율하는 능력이 강하지만, 모두를 만족시키려 하면 소진이 빨라집니다. 핵심 관계와 일반 관계의 경계를 분리해야 합니다.",
    stressPattern: "스트레스 시 감정 과해석 루프가 발생해 작은 신호도 위협으로 느껴질 수 있습니다.",
    recoveryGuide: "디지털 자극을 줄이고, 감정을 단어 세 개로만 기록해 보세요. 감정 명확화가 회복 속도를 크게 올립니다.",
    todayAction: "오늘은 마음에 걸린 한 대화를 미루지 말고 짧게 정리하세요. 정돈된 표현이 운의 막힘을 풀어줍니다.",
    growthMission: "이번 주 미션은 공감과 경계를 함께 연습하는 것입니다. 친절한 거절 문장을 미리 준비해 두세요.",
    compatibleEnergy: "장생·태 기운처럼 가능성을 열어주는 에너지와 창의적 시너지가 큽니다.",
    cautionEnergy: "쇠 기운처럼 지나치게 분석적인 흐름과는 감정 해석 충돌이 날 수 있습니다.",
  },
  gwandae: {
    animalTitle: "무대 감각이 강한 성장형",
    keywords: ["표현성", "도전력", "존재감", "성장욕", "사회성"],
    elementTags: ["화기", "리본", "빛무대"],
    identityLine: "보여주고 증명하며 성장하는 사회 확장형 에너지",
    energySummary: "관대는 사회적 역할을 입는 구간이라 자존감과 성취 동기가 동시에 커집니다.",
    outerFace: "외부에서는 당당하고 밝은 인상으로 읽히며, 도전 상황에서 오히려 활력이 살아납니다.",
    innerMotive: "내면에서는 인정 욕구보다 자기완성 욕구가 더 크며, 기준 높은 결과물을 만들고 싶어 합니다.",
    strengths: "새로운 책임을 기회로 바꾸는 능력이 좋고, 피드백을 성장 재료로 쓰는 속도가 빠릅니다. 협업 장면에서 분위기를 끌어올리는 힘도 강합니다.",
    shadows: "비교가 심해지면 자기평가가 급격히 흔들릴 수 있습니다. 이미지 유지에 에너지를 과도하게 쓰면 본질 과제가 밀릴 수 있습니다.",
    love: "연애에서는 존중과 응원이 핵심입니다. 서로의 목표를 지지하는 관계일수록 애정이 깊어지고, 반복 비난이 있는 관계에서는 빠르게 마음을 닫습니다.",
    workMoney: "일과 재물은 퍼포먼스가 보이는 구조에서 상승합니다. 발표, 기획, 브랜딩, 교육처럼 영향력을 만드는 포지션과 궁합이 좋습니다.",
    relationships: "인맥 확장 능력이 좋지만 깊이 관리가 중요합니다. 중요한 관계는 정기적으로 안부를 점검해야 연결의 질이 유지됩니다.",
    stressPattern: "성과가 멈추면 자기비난이 올라오고 과도한 일정으로 보상하려는 패턴이 나타납니다.",
    recoveryGuide: "성과 지표를 외부 반응이 아닌 실행 지표로 바꾸면 회복이 빨라집니다. 매일 마감 체크리스트 3개가 효과적입니다.",
    todayAction: "오늘은 남의 반응보다 내 기준 한 가지를 끝내는 데 집중하세요.",
    growthMission: "이번 주 미션은 비교를 줄이고 축적을 늘리는 것, 즉 지난주 대비 개선점 한 줄 기록입니다.",
    compatibleEnergy: "제왕·건록 기운과 만나면 추진력과 완성도가 함께 올라갑니다.",
    cautionEnergy: "병 기운과 만날 때는 속도 차를 배려하지 않으면 피로가 누적됩니다.",
  },
  geonrok: {
    animalTitle: "현실을 세우는 신뢰형",
    keywords: ["자립", "실무력", "책임감", "축적", "안정성"],
    elementTags: ["토기", "별발자국", "기반"],
    identityLine: "실력과 책임으로 신뢰를 축적하는 기반 설계형 에너지",
    energySummary: "건록은 스스로의 힘으로 자리를 세우는 구간이라, 꾸준함이 곧 경쟁력이 됩니다.",
    outerFace: "외부에서는 묵직하고 믿을 수 있는 사람으로 보이며, 중요한 순간에 흔들리지 않는 인상을 남깁니다.",
    innerMotive: "내면에서는 안정된 기반을 만들고 싶어 하며, 오래 가는 구조를 설계할 때 만족감이 큽니다.",
    strengths: "실행 지속력, 기준 설정, 품질 관리 능력이 강합니다. 중장기 과제를 끝까지 밀어붙여 결과를 만들고, 팀에서 신뢰의 중심축이 됩니다.",
    shadows: "모든 책임을 홀로 감당하려는 습관이 생기면 피로가 누적됩니다. 변화가 필요한 순간에도 익숙한 방식에 머물 가능성이 있습니다.",
    love: "연애에서는 말보다 행동으로 마음을 보여주는 편입니다. 약속의 일관성이 높은 관계에서 신뢰가 깊어지고, 불확실성이 반복되면 거리감이 커집니다.",
    workMoney: "일과 재물은 누적형 구조에서 강합니다. 운영, 개발, 재무, 프로젝트 관리처럼 기준과 프로세스가 중요한 분야에서 수익 안정성이 높아집니다.",
    relationships: "관계에서도 책임감이 장점이지만, 과도한 보호자 역할은 피해야 합니다. 상호성 있는 관계를 선택해야 에너지 균형이 맞습니다.",
    stressPattern: "스트레스가 쌓이면 감정을 미루고 업무로만 버티는 패턴이 나타납니다.",
    recoveryGuide: "해야 할 일보다 내려놓을 일을 먼저 정리해 보세요. 휴식 시간을 일정에 고정하면 성과와 컨디션이 함께 회복됩니다.",
    todayAction: "오늘은 미뤄둔 한 가지 구조 정리를 끝내세요. 정돈이 곧 운의 가속 장치가 됩니다.",
    growthMission: "이번 주 미션은 도움 요청 한 번 하기입니다. 협업은 약점이 아니라 확장 기술입니다.",
    compatibleEnergy: "장생·관대 기운이 더해지면 안정과 확장이 균형을 이룹니다.",
    cautionEnergy: "사 기운과는 현실/감정 관점 차이를 명확한 대화로 조율해야 합니다.",
  },
  jewang: {
    animalTitle: "판을 여는 중심 리더형",
    keywords: ["주도력", "카리스마", "결정력", "확장", "영향력"],
    elementTags: ["화기", "태양", "황금문"],
    identityLine: "중심에 서서 방향을 결정하는 고출력 에너지",
    energySummary: "제왕은 에너지가 정점에 가까운 구간이라 추진력과 결정력이 크게 강화됩니다.",
    outerFace: "바깥에서는 자신감 있고 선명한 리더로 인식되며, 위기 상황에서 특히 존재감이 커집니다.",
    innerMotive: "내면에서는 성취를 통해 의미를 만들고 싶어 하며, 결과에 대한 책임을 스스로 지려는 의지가 강합니다.",
    strengths: "대담한 선택과 빠른 실행이 강점입니다. 팀의 사기를 끌어올리고 복잡한 상황을 단순한 목표로 정렬하는 능력이 뛰어납니다.",
    shadows: "통제 강도가 높아지면 관계 유연성이 떨어질 수 있습니다. 휴식을 미루는 습관이 장기전에서 컨디션 저하를 부를 수 있습니다.",
    love: "연애에서는 확신 있는 표현과 보호 본능이 두드러집니다. 다만 주도권 균형을 맞추지 않으면 상대가 부담을 느낄 수 있습니다.",
    workMoney: "일과 재물은 큰 판을 다룰수록 강해집니다. 전략, 사업개발, 리더십 포지션에서 영향력이 곧 수익으로 연결됩니다.",
    relationships: "사람을 이끄는 능력이 크지만, 경청의 여백을 두면 신뢰 밀도가 더 높아집니다.",
    stressPattern: "막히는 상황에서 더 강하게 밀어붙여 소진이 심해지는 패턴이 있습니다.",
    recoveryGuide: "결정권을 일부 위임하고 회복 시간을 확보하면 오히려 성과가 안정됩니다.",
    todayAction: "오늘은 중요한 결정 한 가지에 기준 세 줄을 명확히 적어 실행하세요.",
    growthMission: "이번 주 미션은 리더십의 속도 조절입니다. 빠른 결정과 느린 점검을 함께 운용하세요.",
    compatibleEnergy: "건록·쇠 기운과 만나면 실행력과 안정성이 함께 올라갑니다.",
    cautionEnergy: "태 기운과는 속도 차를 무시하면 방향 합의가 어려워질 수 있습니다.",
  },
  soe: {
    animalTitle: "내실을 다지는 전략형",
    keywords: ["성숙", "분석", "정리", "내공", "안정"],
    elementTags: ["금기", "서고", "등불"],
    identityLine: "경험을 체계로 바꾸는 구조화 에너지",
    energySummary: "쇠는 확장 후 균형을 재정비하는 구간이라 판단력과 관리 능력이 날카로워집니다.",
    outerFace: "외부에서는 차분하고 믿을 만한 전문가로 보이며, 감정보다 근거 중심으로 소통하는 경향이 있습니다.",
    innerMotive: "내면에서는 흔들리지 않는 기반을 만들고 싶어 하며, 시행착오를 시스템으로 바꾸는 데 강한 만족을 느낍니다.",
    strengths: "리스크를 예측하고 사전에 정리하는 능력이 탁월합니다. 복잡한 정보에서 핵심을 뽑아 실행 가능한 계획으로 바꾸는 역량이 큽니다.",
    shadows: "과도한 신중함이 기회를 늦출 수 있습니다. 감정 표현이 줄어들면 차갑다는 오해를 받을 수 있습니다.",
    love: "연애에서는 신뢰와 일관성을 우선합니다. 감정이 안정될수록 깊게 헌신하지만, 불확실한 관계에는 오래 머물지 않습니다.",
    workMoney: "일과 재물은 분석과 관리 역량에서 안정적으로 확장됩니다. 데이터, 재무, 운영, 품질 관리 분야에서 장기 수익성이 높습니다.",
    relationships: "관계는 넓기보다 깊게 가져가는 편이 맞습니다. 핵심 인연과의 정기적 대화가 정서적 안전망이 됩니다.",
    stressPattern: "스트레스 시 최악의 시나리오를 반복 계산해 피로가 심해질 수 있습니다.",
    recoveryGuide: "생각을 문서로 꺼내 우선순위를 재배열하면 불안이 줄어듭니다. 몸을 쓰는 루틴을 병행하면 효과가 큽니다.",
    todayAction: "오늘은 걱정 목록을 실행 목록으로 바꾸는 정리 15분을 해보세요.",
    growthMission: "이번 주 미션은 완벽보다 진척입니다. 80점 실행을 한 번 더 만드는 데 집중하세요.",
    compatibleEnergy: "건록·묘 기운과 만나면 안정적 축적 구조가 강해집니다.",
    cautionEnergy: "목욕 기운과는 감정 언어와 논리 언어의 간극 조율이 필요합니다.",
  },
  byeong: {
    animalTitle: "회복을 설계하는 섬세형",
    keywords: ["예민함", "돌봄", "치유", "감지력", "배려"],
    elementTags: ["수기", "구름", "은방울"],
    identityLine: "미세한 변화까지 읽어내는 감각 회복형 에너지",
    energySummary: "병은 에너지 소모를 인식하고 회복을 설계해야 하는 구간이라 섬세함과 관찰력이 강화됩니다.",
    outerFace: "외부에서는 다정하고 배려 깊은 사람으로 보이며, 타인의 감정 신호를 빠르게 읽어 대응합니다.",
    innerMotive: "내면에서는 안전한 관계와 안정적 리듬을 갈망하며, 소란보다 고요한 환경에서 힘이 살아납니다.",
    strengths: "공감력과 케어 능력이 탁월해 사람 중심 업무에서 신뢰를 받습니다. 디테일 감지력이 좋아 품질과 만족도를 끌어올립니다.",
    shadows: "타인의 감정을 과도하게 받아들여 소진될 수 있습니다. 경계를 놓치면 스스로의 회복 순서가 뒤로 밀립니다.",
    love: "연애에서는 정서적 안전감이 중요합니다. 작은 배려가 꾸준히 이어질 때 애정이 깊어지고, 감정 무시가 반복되면 급격히 위축됩니다.",
    workMoney: "일과 재물은 돌봄과 신뢰 기반 서비스에서 상승합니다. 고객 이해, UX 리서치, 상담형 업무에서 강점을 발휘합니다.",
    relationships: "관계는 따뜻하지만 선택적이어야 건강합니다. 모든 관계를 책임지려 하기보다 핵심 인연 중심으로 에너지를 배분하세요.",
    stressPattern: "스트레스 시 수면과 식사 리듬이 무너지고 감정 피로가 신체 피로로 이어지기 쉽습니다.",
    recoveryGuide: "감정 분리를 위한 짧은 루틴이 필요합니다. 산책, 물 섭취, 기록 3단계를 고정하면 회복력이 올라갑니다.",
    todayAction: "오늘은 나를 위한 작은 회복 행동을 먼저 실행하세요.",
    growthMission: "이번 주 미션은 관계 경계 한 줄 선언입니다. 배려와 자기보호를 동시에 훈련하세요.",
    compatibleEnergy: "양·장생 기운과 함께하면 정서 안정과 회복이 빨라집니다.",
    cautionEnergy: "제왕 기운과는 속도 압박이 커질 수 있어 휴식 합의가 필요합니다.",
  },
  sa: {
    animalTitle: "전환의 문을 여는 직감형",
    keywords: ["변환", "직관", "재정렬", "통찰", "전환"],
    elementTags: ["수기", "나비", "별가루"],
    identityLine: "끝과 시작의 경계에서 방향을 재정렬하는 변환 에너지",
    energySummary: "사는 낡은 패턴을 정리하고 새로운 흐름으로 옮겨가는 구간이라 직감과 통찰이 날카롭게 작동합니다.",
    outerFace: "외부에서는 신비롭고 깊이 있는 인상으로 읽히며, 변화의 징후를 빠르게 포착하는 사람으로 보입니다.",
    innerMotive: "내면에서는 본질에 맞는 삶을 살고 싶어 하며, 의미 없는 반복을 견디지 못하는 경향이 있습니다.",
    strengths: "전환 타이밍 감지가 탁월해 리빌드 국면에서 강합니다. 복잡한 상황의 본질을 짚어 방향 전환점을 제시할 수 있습니다.",
    shadows: "급격한 단절로 관계와 기회를 동시에 잃을 수 있습니다. 정착 전에 다음 가능성으로 이동하려는 패턴을 경계해야 합니다.",
    love: "연애에서는 깊은 교감과 정신적 연결을 중요하게 여깁니다. 관계의 의미가 사라지면 빠르게 거리를 둘 수 있습니다.",
    workMoney: "일과 재물은 변화 프로젝트, 컨셉 전환, 리브랜딩 국면에서 성과가 큽니다. 문제를 재정의하는 능력이 수익으로 이어집니다.",
    relationships: "관계는 많기보다 결이 맞는 사람 중심이 유리합니다. 감정 거리를 설명하는 대화가 신뢰 유지에 필요합니다.",
    stressPattern: "스트레스 시 모든 것을 끊고 싶어지는 단절 충동이 올라옵니다.",
    recoveryGuide: "결정 유예 시간을 두고 24시간 후 다시 판단하세요. 단절 대신 재배치를 선택하면 손실이 줄어듭니다.",
    todayAction: "오늘은 정리할 것 하나, 이어갈 것 하나를 명확히 선택하세요.",
    growthMission: "이번 주 미션은 전환의 언어화입니다. 왜 바꾸는지 한 문장으로 설명해 보세요.",
    compatibleEnergy: "절·태 기운과 만나면 변환 아이디어가 빠르게 현실화됩니다.",
    cautionEnergy: "건록 기운과는 안정/전환 우선순위를 조율해야 갈등을 줄일 수 있습니다.",
  },
  myo: {
    animalTitle: "자원을 모으는 축적형",
    keywords: ["저장력", "집중", "내면정리", "현실감각", "지속"],
    elementTags: ["토기", "보관함", "씨앗"],
    identityLine: "작은 자원을 모아 큰 안정으로 바꾸는 축적 에너지",
    energySummary: "묘는 에너지를 내부에 축적해 다음 사이클을 준비하는 구간이라 관리 능력과 집중력이 상승합니다.",
    outerFace: "외부에서는 조용하지만 단단한 인상으로 보이며, 허술함 없는 태도로 신뢰를 얻습니다.",
    innerMotive: "내면에서는 미래 불확실성을 줄이고 싶은 욕구가 강해, 계획과 준비를 통해 안전감을 확보하려 합니다.",
    strengths: "자원 관리, 루틴 유지, 장기 축적 능력이 탁월합니다. 작은 개선을 꾸준히 이어 큰 차이를 만드는 스타일입니다.",
    shadows: "안정 지향이 강해 기회를 지나치게 늦게 잡을 수 있습니다. 감정을 보류하는 습관이 관계 거리감을 만들 수 있습니다.",
    love: "연애에서는 신뢰와 생활 합이 중요합니다. 천천히 깊어지는 관계에 강하고, 즉흥적 변동이 큰 관계에는 피로를 느낍니다.",
    workMoney: "일과 재물은 예산 관리, 운영, 구매, 자산 설계에서 장점이 큽니다. 장기 복리형 구조를 만들 때 가장 강합니다.",
    relationships: "관계는 선택과 집중이 유리합니다. 소수와 깊게 연결될 때 정서 안정과 성과가 함께 올라갑니다.",
    stressPattern: "스트레스 시 더 움츠러들며 결정 유예가 길어질 수 있습니다.",
    recoveryGuide: "작은 실행을 먼저 만들면 정체감이 풀립니다. 15분 단위 행동으로 다시 흐름을 켜세요.",
    todayAction: "오늘은 미뤄둔 한 가지 정리 과제를 끝내고 체크 표시를 남기세요.",
    growthMission: "이번 주 미션은 안전과 도전의 비율 조정입니다. 익숙한 일 8, 새로운 일 2의 비율을 시도하세요.",
    compatibleEnergy: "쇠·건록 기운과 만나면 현실 기반 성장 속도가 빨라집니다.",
    cautionEnergy: "목욕 기운과는 소비/표현 리듬 차이를 조율해야 균형이 맞습니다.",
  },
  jeol: {
    animalTitle: "리셋을 실행하는 독립형",
    keywords: ["단절정리", "독립성", "경계", "재시작", "전환"],
    elementTags: ["금기", "초승", "검은빛"],
    identityLine: "불필요를 끊고 본질만 남기는 리셋 에너지",
    energySummary: "절은 한 사이클을 정리하고 새 출발을 준비하는 구간이라 결단과 경계 설정 능력이 강조됩니다.",
    outerFace: "외부에서는 단호하고 자립적인 사람으로 보이며, 결정 순간에 망설임이 적다는 인상을 줍니다.",
    innerMotive: "내면에서는 간결한 삶과 분명한 기준을 원합니다. 에너지 낭비를 줄여 본질에 집중하려는 욕구가 강합니다.",
    strengths: "정리와 우선순위 설정이 뛰어나 복잡한 문제를 빠르게 간소화합니다. 불필요한 비용과 시간 낭비를 줄이는 데 강합니다.",
    shadows: "관계를 너무 빠르게 끊어 고립으로 이어질 수 있습니다. 도움이 필요할 때도 홀로 버티는 습관을 경계해야 합니다.",
    love: "연애에서는 경계 존중과 신뢰가 핵심입니다. 감정 밀도가 높아도 자유와 독립성이 보장될 때 관계가 오래갑니다.",
    workMoney: "일과 재물은 구조조정, 전략 재설계, 리스크 관리에서 강합니다. 낭비를 줄이는 능력이 곧 수익 개선으로 이어집니다.",
    relationships: "관계는 적어도 선명해야 합니다. 약속과 경계가 명확한 사람과 장기적 신뢰를 만들기 쉽습니다.",
    stressPattern: "스트레스 시 감정과 연결을 한꺼번에 차단하는 경향이 있습니다.",
    recoveryGuide: "완전 단절 대신 선택적 거리두기를 쓰세요. 하루 한 번 안전한 사람과 짧게 연결하면 회복이 빨라집니다.",
    todayAction: "오늘은 내려놓을 것 하나를 결정하고, 남길 기준을 한 줄로 정리하세요.",
    growthMission: "이번 주 미션은 경계의 유연성입니다. 단호함 안에 대화의 창구를 남겨두세요.",
    compatibleEnergy: "사·태 기운과 만나면 전환 아이디어가 빠르게 실행됩니다.",
    cautionEnergy: "장생 기운과는 속도 차로 오해가 생길 수 있어 설명이 필요합니다.",
  },
  tae: {
    animalTitle: "미래를 품는 가능성형",
    keywords: ["잠재력", "실험", "학습민첩", "상상력", "준비"],
    elementTags: ["목기", "새알", "여명"],
    identityLine: "아직 형태 없는 가능성을 현실로 번역하는 탐색 에너지",
    energySummary: "태는 에너지가 새로운 생을 준비하는 구간이라 호기심과 학습 탄성이 크게 올라갑니다.",
    outerFace: "외부에서는 신선하고 유연한 사람으로 보이며, 아이디어를 빠르게 제시하는 인상을 줍니다.",
    innerMotive: "내면에서는 더 나은 미래 시나리오를 만들고 싶어 하며, 낡은 방식보다 실험적 접근을 선호합니다.",
    strengths: "학습 속도와 개념 연결력이 뛰어나 변화가 빠른 분야에서 강합니다. 가능성을 구조로 바꾸는 초기 설계에 재능이 있습니다.",
    shadows: "탐색이 길어져 실행 마감이 늦어질 수 있습니다. 선택지가 많을수록 결정 피로가 누적될 수 있습니다.",
    love: "연애에서는 대화의 새로움과 지적 자극이 중요합니다. 함께 성장하는 감각이 있을 때 애정이 깊어집니다.",
    workMoney: "일과 재물은 기획, 실험, 프로토타입, 학습 콘텐츠 영역에서 확장됩니다. 아이디어를 빠르게 검증할수록 수익화 가능성이 높아집니다.",
    relationships: "관계는 유연하되 핵심 가치가 맞아야 오래갑니다. 약속의 형태를 구체화하면 오해를 줄일 수 있습니다.",
    stressPattern: "스트레스 시 계획만 늘고 실행이 멈추는 패턴이 나타납니다.",
    recoveryGuide: "작은 실행 단위를 설정해 즉시 착수하세요. 시작 후 10분이 지나면 흐름이 붙기 쉽습니다.",
    todayAction: "오늘은 아이디어 하나를 바로 테스트 가능한 형태로 바꿔보세요.",
    growthMission: "이번 주 미션은 실행 우선입니다. 완성보다 검증을 먼저 진행하세요.",
    compatibleEnergy: "장생·목욕 기운과 만나면 창의적 확장이 커집니다.",
    cautionEnergy: "쇠 기운과는 검증 속도와 기준의 균형을 맞춰야 합니다.",
  },
  yang: {
    animalTitle: "복을 길러내는 보호형",
    keywords: ["돌봄", "보호", "애정", "현실감각", "관계복"],
    elementTags: ["토기", "꽃빛", "풍요"],
    identityLine: "사람과 시스템을 함께 돌보며 복을 키우는 양육 에너지",
    energySummary: "양은 에너지를 보살피고 키우는 구간이라 보호 본능, 관계 감각, 현실 조율력이 높아집니다.",
    outerFace: "외부에서는 다정하고 안정적인 사람으로 인식되며, 함께 있으면 마음이 편해진다는 평가를 받기 쉽습니다.",
    innerMotive: "내면에서는 소중한 것을 오래 지키고 싶어 하며, 관계와 생활 기반을 균형 있게 성장시키려 합니다.",
    strengths: "사람을 편안하게 만들고 협업을 지속시키는 힘이 큽니다. 감정과 현실을 동시에 살피는 균형 감각이 뛰어납니다.",
    shadows: "거절을 미루다 과부하가 올 수 있습니다. 모두를 챙기려는 습관이 자기 회복 시간을 줄일 수 있습니다.",
    love: "연애에서는 안정감과 배려가 큰 장점입니다. 따뜻함을 당연하게 소비하지 않는 관계에서 가장 아름답게 빛납니다.",
    workMoney: "일과 재물은 신뢰 기반 반복 구조에서 강합니다. 커뮤니티, 서비스 운영, 교육/상담형 업무에서 장기 수익성이 좋습니다.",
    relationships: "관계는 폭보다 밀도가 중요합니다. 감정 노동의 한계를 미리 공유하면 오래 건강하게 연결됩니다.",
    stressPattern: "스트레스 시 타인을 먼저 챙기다 본인 신호를 놓치는 패턴이 나타납니다.",
    recoveryGuide: "하루 첫 20분을 나를 위한 루틴으로 고정하세요. 자기돌봄을 선행할수록 관계도 안정됩니다.",
    todayAction: "오늘은 내 컨디션을 먼저 점검하고, 가능한 약속만 선택하세요.",
    growthMission: "이번 주 미션은 친절한 경계입니다. 배려와 거절을 동시에 말하는 연습을 해보세요.",
    compatibleEnergy: "병·장생 기운과 만나면 회복과 성장의 균형이 좋아집니다.",
    cautionEnergy: "제왕 기운과는 주도권 배분을 합의하지 않으면 피로가 누적됩니다.",
  },
};

function makeSummary(seed: StageSeed, animal: AnimalDestinyData): string {
  return [
    `${animal.animal_ko}의 ${seed.identityLine}입니다.`,
    `${seed.energySummary} ${seed.outerFace}`,
    `${seed.innerMotive}`,
    `${seed.strengths}`,
    `${seed.shadows}`,
  ].join(" ");
}

function ensureSummaryLength(summary: string): string {
  if (summary.length >= 250 && summary.length <= 400) return summary;
  if (summary.length < 250) {
    return `${summary} 오늘은 과한 예측보다 작은 실행을 반복해 리듬을 확인하세요. 리듬이 맞는 순간, 운의 체감은 예상보다 빠르게 선명해집니다.`;
  }
  return `${summary.slice(0, 392)}...`;
}

export function resolveTwelveGrowthAnimalResult(animal: AnimalDestinyData): TwelveGrowthAnimalResult {
  const stageKey = animal.stageKey;
  const stageName = STAGE_KEY_TO_LABEL[stageKey];
  const seed = STAGE_SEEDS[stageKey];

  const summary = ensureSummaryLength(makeSummary(seed, animal));

  return {
    stageKey,
    stageName,
    animalName: animal.animal_ko,
    animalTitle: seed.animalTitle,
    summary,
    keywords: seed.keywords,
    elementTags: seed.elementTags,
    personality: `${seed.energySummary} ${seed.outerFace} ${seed.innerMotive}`,
    strengths: seed.strengths,
    shadows: seed.shadows,
    love: seed.love,
    workMoney: seed.workMoney,
    relationships: seed.relationships,
    stressPattern: seed.stressPattern,
    recoveryGuide: seed.recoveryGuide,
    todayAction: seed.todayAction,
    growthMission: seed.growthMission,
    compatibleEnergy: seed.compatibleEnergy,
    cautionEnergy: seed.cautionEnergy,
  };
}

type SectionItem = {
  key:
    | "core"
    | "strengthWeakness"
    | "loveRelations"
    | "workMoney"
    | "stress"
    | "today"
    | "compatible"
    | "mission";
  label: string;
  content: string;
};

export function buildTwelveAnimalSections(result: TwelveGrowthAnimalResult): SectionItem[] {
  return [
    {
      key: "core",
      label: "핵심 성향",
      content: [
        `${result.animalName}(${result.stageName})의 한 줄 정체성은 ${result.animalTitle}입니다.`,
        `${result.personality}`,
        `겉으로 보이는 모습은 상황 판단이 빠르고 결이 분명하지만, 실제 동기는 관계와 성과의 균형을 오래 유지하려는 데 있습니다.`,
        `즉, 순간의 감정이나 유행보다 나에게 맞는 리듬을 찾는 과정에서 실력이 자랍니다.`,
      ].join(" "),
    },
    {
      key: "strengthWeakness",
      label: "강점과 약점",
      content: [
        `강점은 ${result.strengths}`,
        `주의점은 ${result.shadows}`,
        `이 조합은 재능 자체보다 운용 방식이 결과를 가르는 타입이므로, 장점이 살아나는 환경을 의식적으로 선택하는 것이 중요합니다.`,
        `특히 피로가 누적될 때 약점이 확대되므로 일정과 관계를 동시에 정리하는 습관이 필요합니다.`,
      ].join(" "),
    },
    {
      key: "loveRelations",
      label: "연애와 인간관계",
      content: [
        `${result.love}`,
        `${result.relationships}`,
        `관계 거리감은 상대를 밀어내기 위한 것이 아니라 에너지 품질을 지키기 위한 장치라는 점을 기억하세요.`,
        `대화에서는 감정 해석보다 사실 확인 한 줄을 먼저 두면 오해가 크게 줄어듭니다.`,
      ].join(" "),
    },
    {
      key: "workMoney",
      label: "일과 재물 감각",
      content: [
        `${result.workMoney}`,
        `이 운성은 단기 성과보다 누적 설계에서 강점을 보이므로, 한 번에 크게 벌기보다 재현 가능한 수익 구조를 만드는 접근이 유리합니다.`,
        `일의 우선순위를 명확히 하고 반복 가능한 프로세스를 쌓을수록 재물의 변동성이 줄어듭니다.`,
        `결국 당신의 돈 감각은 선택의 화려함보다 기준의 일관성에서 완성됩니다.`,
      ].join(" "),
    },
    {
      key: "stress",
      label: "스트레스 패턴",
      content: [
        `${result.stressPattern}`,
        `${result.recoveryGuide}`,
        `스트레스는 의지 부족의 문제가 아니라 리듬 손실의 신호에 가깝습니다.`,
        `회복 루틴을 감정에 맡기지 말고 시간표로 고정하면, 컨디션과 성과가 함께 안정됩니다.`,
      ].join(" "),
    },
    {
      key: "today",
      label: "오늘의 실전 조언",
      content: [
        `${result.todayAction}`,
        `오늘의 포인트는 큰 결심이 아니라 작은 실행의 연속입니다.`,
        `해야 할 일을 세 가지로 줄이고, 끝낸 항목을 즉시 표시해 성취 신호를 뇌에 남기세요.`,
        `이 간단한 루틴이 오늘의 운을 체감 가능한 결과로 바꿉니다.`,
      ].join(" "),
    },
    {
      key: "compatible",
      label: "나와 잘 맞는 동물 에너지",
      content: [
        `${result.compatibleEnergy}`,
        `${result.cautionEnergy}`,
        `궁합의 핵심은 누가 더 우세한지가 아니라, 서로 다른 리듬을 어떻게 합의하는가에 있습니다.`,
        `좋은 조합도 방치하면 멀어지고, 어려운 조합도 규칙을 세우면 오래 갑니다.`,
      ].join(" "),
    },
    {
      key: "mission",
      label: "성장 미션",
      content: [
        `${result.growthMission}`,
        `미션은 완벽하게 해내는 과제가 아니라, 운의 방향을 바꾸는 작고 반복 가능한 행동이어야 합니다.`,
        `이번 주에는 결과보다 기록에 집중해 보세요. 기록은 감정 기복을 줄이고 성장 속도를 안정화합니다.`,
        `당신의 십이운성은 이미 가능성을 보여주고 있고, 남은 것은 꾸준한 실행뿐입니다.`,
      ].join(" "),
    },
  ];
}

export function getAllTwelveGrowthResults(source: Record<string, AnimalDestinyData>) {
  return Object.values(source).map((animal) => resolveTwelveGrowthAnimalResult(animal));
}
