import { calculateScreenSaju } from './runtime';
import { context, domain } from "../shared/domain";
export const saju = domain(
  "saju",
  `기존 CODE DESTINY 화면의 한국 절기·민용일·야자시 shift-day 및 시주 경도 보정으로 계산된 명리 자료다.
일간·월령·지장간·십성·합충형파해와 운의 상호작용을 함께 읽는다. 오행 개수만으로 신강/신약·용신을 확정하지 않는다.
strength/usefulGod는 휴리스틱이므로 조후·월령·통근 근거와 대조하며 불일치는 설명한다. 오행의 강점과 과다의 그림자를 함께 풀어낸다.
시주가 없으면 자녀·말년·시주 관련 근거 및 구체적 대운 시작 시점을 단정하지 않는다. 재성은 수익 보장이 아니다.`,
  [
    "영냥이의 한줄평",
    "타고난 기질",
    "연애와 관계",
    "재물과 일",
    "현재 흐름",
    "현실적인 조언",
  ],
  async (input, options = {}) => {
    const r = calculateScreenSaju(input.personA!,new Date(options.asOf || Date.now()));
    const limitations = [
      "강약·용신은 월령·통근·조후와 함께 읽는 참고 판단입니다.",
      "한국 표준시 출생 기준입니다.",
    ];
    if (!input.personA!.birthTime)
      limitations.push(
        "출생시간 미상: 시주와 정확한 대운 시작 시점은 해석하지 않습니다.",
      );
    if(r.jong.confirmationRequired)limitations.push('종격은 기존 엔진이 찾은 후보입니다. 기존 서비스의 생활 이력 확인을 거치지 않은 용신·종격 해석은 조건부입니다.');
    const partner = input.personB ? await saju.calculate({...input,personA:input.personB,personB:undefined,readingMode:'personal'},options) : undefined;
    const partnerFacts = partner ? Object.fromEntries(partner.facts.map(f=>[f.label,f.value])) : undefined;
    return context(
      "saju",
      {
        ...(partnerFacts?{
          partnerChart:Object.fromEntries(Object.entries(partnerFacts).filter(([key])=>['pillars','dayMaster','fiveElements','tenGods','tenGodsByPillar','natalInteractions','seasonalBalance'].includes(key))),
          relationshipComparison:{
            selfDayMaster:r.dayMaster,partnerDayMaster:partnerFacts.dayMaster,
            selfElements:r.fiveElements,partnerElements:partnerFacts.fiveElements,
            selfTenGods:r.tenGods,partnerTenGods:partnerFacts.tenGods,
            limitation:'두 명식의 기질·오행·십성 비교입니다. 명식 간 합충 점수나 실제 관계의 성공 확률을 계산한 값이 아닙니다.',
          },
        }:{}),
        pillars: {
          year: r.yearPillar,
          month: r.monthPillar,
          day: r.dayPillar,
          hour: r.hourPillar ?? null,
        },
        dayMaster: r.dayMaster,
        pillarDetails: r.pillarDetails,
        fiveElements: r.fiveElements,
        tenGods: r.tenGods,
        tenGodsByPillar: r.tenGodsByPillar,
        seasonalBalance: r.seasonalBalance,
        natalInteractions: r.natalInteractions,
        advancedFactors: input.personA!.birthTime ? r.advancedFactors : null,
        strengthHeuristic: r.strength,
        usefulGod: r.usefulGod,
        jong: r.jong,
        shinsal: r.shinsal,
        majorLuck: input.personA!.birthTime ? r.majorLuck : null,
        yearlyLuck: input.personA!.birthTime ? r.yearlyLuck : null,
        monthlyLuck: input.personA!.birthTime ? r.monthlyLuck : null,
        calculationMeta: r.calculationMeta,
      },
      [...limitations,...(partner?.limitations.map(value=>`상대: ${value}`)||[])],
    );
  },
);
