import { calculateScreenSaju } from './runtime';
import {sajuCompatibilityEvidence} from './compatibility-evidence';
import { buildElementProfile, buildMovementSignals, buildRomanceTiming, buildSajuHealthBasis, buildTenGodProfile } from '../../../lib/saju-derived-signals.js';
import { context, domain } from "../shared/domain";
export const saju = domain(
  "saju",
  `기존 CODE DESTINY 화면의 실제 출생 순간의 한국 절기 및 지역 평균시 보정 후 일주·시주 shift-day으로 계산된 명리 자료다.
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
    const r = calculateScreenSaju(input.personA!,new Date(options.asOfInstant || options.asOf || Date.now()),options.jongAnswer);
    const limitations = [
      "강약·용신은 월령·통근·조후와 함께 읽는 참고 판단입니다.",
      "절입은 실제 출생 순간으로 비교하며 일주·시주는 지역 평균시 보정 후 함께 계산합니다.",
    ];
    if (!input.personA!.birthTime)
      limitations.push(
        "출생시간 미상: 시주와 정확한 대운 시작 시점은 해석하지 않습니다.",
      );
    if(r.jongVerdict==='rejected')limitations.push('생활 이력 확인 결과가 종격 흐름과 맞지 않아 일반격(억부) 용신으로 읽었습니다.');
    if(r.strengthVerdict==='rejected')limitations.push('지난 해 확인 결과에 따라 경계값에 있던 신강·신약 판단을 반대로 읽었습니다.');
    if(r.jong.confirmationRequired)limitations.push('종격은 기존 엔진이 찾은 후보입니다. 기존 서비스의 생활 이력 확인을 거치지 않은 용신·종격 해석은 조건부입니다.');
    const timed = !!input.personA!.birthTime;
    const pillars = {year:r.yearPillar, month:r.monthPillar, day:r.dayPillar, hour:r.hourPillar ?? null};
    const elementProfile = buildElementProfile(r.fiveElements);
    const partner = input.personB ? await saju.calculate({...input,personA:input.personB,personB:undefined,readingMode:'personal'},{...options,jongAnswer:undefined}) : undefined;
    const partnerFacts = partner ? Object.fromEntries(partner.facts.map(f=>[f.label,f.value])) : undefined;
    return context(
      "saju",
      {
        ...(partnerFacts?{
          compatibility:sajuCompatibilityEvidence(r,partnerFacts),
          partnerChart:Object.fromEntries(Object.entries(partnerFacts).filter(([key])=>['pillars','dayMaster','fiveElements','tenGods','tenGodsByPillar','natalInteractions','seasonalBalance','usefulGod','jong','strengthHeuristic'].includes(key))),
          relationshipComparison:{
            selfDayMaster:r.dayMaster,partnerDayMaster:partnerFacts.dayMaster,
            selfElements:r.fiveElements,partnerElements:partnerFacts.fiveElements,
            selfTenGods:r.tenGods,partnerTenGods:partnerFacts.tenGods,
            limitation:'기질·오행·십성 비교이며, 명식 사이의 합충은 compatibility에 별도로 계산됩니다. 실제 관계의 성공 확률은 아닙니다.',
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
        elementProfile,
        tenGodProfile: buildTenGodProfile({tenGodsByPillar:r.tenGodsByPillar, tenGods:r.tenGods, strength:r.strength}),
        movementSignals: buildMovementSignals({pillars, natalInteractions:r.natalInteractions, shinsal:r.shinsal, yearlyLuck:timed ? r.yearlyLuck : null, majorLuck:timed ? r.majorLuck : null}),
        romanceTiming: buildRomanceTiming({gender:input.personA!.gender, tenGodsByPillar:r.tenGodsByPillar, shinsal:r.shinsal, yearlyLuck:timed ? r.yearlyLuck : null, majorLuck:timed ? r.majorLuck : null}),
        healthBasis: buildSajuHealthBasis({fiveElements:r.fiveElements, seasonalBalance:r.seasonalBalance, dayMaster:r.dayMaster, elementProfile}),
        calculationMeta: r.calculationMeta,
      },
      [...limitations,...(partner?.limitations.map(value=>`상대: ${value}`)||[])],
    );
  },
);
