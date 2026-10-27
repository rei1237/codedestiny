import { calculateScreenSaju } from './runtime';
import { experienceCalibrationFact } from './experience';
import {sajuCompatibilityEvidence} from './compatibility-evidence';
import { buildElementProfile, buildMovementSignals, buildRomanceTiming, buildSajuHealthBasis, buildTenGodProfile } from '../../../lib/saju-derived-signals.js';
import { context, domain } from "../shared/domain";
export const saju = domain(
  "saju",
  `기존 CODE DESTINY 화면의 실제 출생 순간의 한국 절기 및 지역 평균시 보정 후 일주·시주 shift-day으로 계산된 명리 자료다.
일간·월령·지장간·십성·합충형파해와 운의 상호작용을 함께 읽는다. 오행 개수만으로 신강/신약·용신을 확정하지 않는다.
strength/usefulGod는 휴리스틱이므로 조후·월령·통근 근거와 대조하며 불일치는 설명한다. 오행의 강점과 과다의 그림자를 함께 풀어낸다.
시주가 없으면 자녀·말년·시주 관련 근거 및 구체적 대운 시작 시점을 단정하지 않는다. 재성은 수익 보장이 아니다.
대운 주기에 label이 있으면 그 표기(간지 대운 · YYYY년 M월 무렵부터 (만 N세, 대운수 N))를 그대로 쓰고, 세는 나이로 'N세 대운'이라 부르지 않는다.
fiveElements에 countBasis가 있으면 오행 개수는 counts(눈에 보이는 글자만 센 수)로만 말한다. 지장간은 hiddenStems로 따로 풀어내되 개수에 더하지 않고, 월지 오행은 월령이라 강약에서 더 무겁게 본다고 설명한다.`,
  [
    "영냥이의 한줄평",
    "타고난 기질",
    "연애와 관계",
    "재물과 일",
    "현재 흐름",
    "현실적인 조언",
  ],
  async (input, options = {}) => {
    const r = calculateScreenSaju(input.personA!,new Date(options.asOfInstant || options.asOf || Date.now()));
    const limitations = [
      "강약·용신은 월령·통근·조후와 함께 읽는 참고 판단입니다.",
      "절입은 실제 출생 순간으로 비교하며 일주·시주는 지역 평균시 보정 후 함께 계산합니다.",
    ];
    if (!input.personA!.birthTime)
      limitations.push(
        "출생시간 미상: 시주와 정확한 대운 시작 시점은 해석하지 않습니다.",
      );
    const timed = !!input.personA!.birthTime;
    const pillars = {year:r.yearPillar, month:r.monthPillar, day:r.dayPillar, hour:r.hourPillar ?? null};
    const elementProfile = buildElementProfile(r.fiveElements);
    const partner = input.personB ? await saju.calculate({...input,personA:input.personB,personB:undefined,readingMode:'personal'},{...options,experience:undefined}) : undefined;
    // 경험 보정은 원국을 읽기만 하고 대운·세운 강조에만 쓰인다. 출생시간이 없으면 대운 경계를 몰라 만들지 않는다.
    const experienceCalibration = timed && options.experience?.length ? experienceCalibrationFact(r, options.experience) : null;
    const partnerFacts = partner ? Object.fromEntries(partner.facts.map(f=>[f.label,f.value])) : undefined;
    // r.jong.natalCore는 열거되지 않아 저장 fact에 남지 않는다. 판정 기준만 context에 따로 남긴다.
    const natal = (r.jong as any)?.natalCore;
    const calculated = context(
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
        ...(experienceCalibration?{experienceCalibration}:{}),
      },
      [...limitations,...(partner?.limitations.map(value=>`상대: ${value}`)||[])],
    );
    return natal?.version ? {...calculated,natalCore:{version:natal.version,ruleProfile:natal.ruleProfile,analysisId:natal.analysisId}} : calculated;
  },
);
