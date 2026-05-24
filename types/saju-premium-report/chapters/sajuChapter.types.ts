import type { SajuChapterBase } from "../common.types";

export type SajuCh01SectionKey =
  | "birthAndStructure"
  | "fourPillarsMeaning"
  | "heavenlyStemsAnalysis"
  | "earthlyBranchesAnalysis"
  | "hiddenStemsAnalysis"
  | "dayMasterCentricInterpretation"
  | "strongWeakEnergy"
  | "firstImpression"
  | "personalityDirection"
  | "repeatingPattern"
  | "bigLifeTheme"
  | "oneLineSummary";

export type SajuCh02SectionKey =
  | "dayMasterEssence"
  | "monthBranchInfluence"
  | "seasonalForce"
  | "climateAdjustment"
  | "coldHeatDryWet"
  | "temperatureHumidity"
  | "dayMasterPowerConditions"
  | "dayMasterWeakConditions"
  | "temperamentRoot"
  | "lifeDirectionBlueprint"
  | "supportiveEnvironment";

export type SajuCh03SectionKey =
  | "strongWeakJudgement"
  | "balanceYongshin"
  | "climateYongshin"
  | "bridgeYongshin"
  | "illnessYongshin"
  | "yongshinCandidates"
  | "huisinCandidates"
  | "gisinGushin"
  | "activationConditions"
  | "blockedConditions"
  | "realWorldUsage"
  | "successWeapon"
  | "avoidChoices"
  | "unlockStrategy";

export type SajuCh04SectionKey =
  | "startTiming"
  | "overallFlow"
  | "earlyLife"
  | "youth"
  | "midlife"
  | "matureLife"
  | "lateLife"
  | "stemEffects"
  | "branchEffects"
  | "natalInteractions"
  | "goodLuckVsRiskLuck"
  | "growthWindows"
  | "cautionWindows"
  | "domainChanges"
  | "executionByCycle";

export type SajuCh05SectionKey =
  | "frameEstablished"
  | "monthBranchFrame"
  | "orthodoxFrame"
  | "specialFrame"
  | "followFrame"
  | "framePurity"
  | "supportingQi"
  | "breakingQi"
  | "socialMission"
  | "honorPattern"
  | "successEnvironment"
  | "failureEnvironment"
  | "careerCapacity"
  | "recognitionPattern"
  | "successFormula";

export type SajuCh06SectionKey =
  | "friendsAndPeers"
  | "communicationStyle"
  | "practicalRelations"
  | "authorityAndOrganization"
  | "protectorsAndHelpers"
  | "noblePeopleLuck"
  | "keepClose"
  | "keepDistance"
  | "conflictPattern"
  | "cooperationAndPartnership"
  | "betrayalAndLossRisk"
  | "relationshipUnlockPath"
  | "partnershipCriteria"
  | "longTermBondStrategy";

export type SajuCh07SectionKey =
  | "datingTendency"
  | "visibleCharm"
  | "attractedType"
  | "datingRepeatPattern"
  | "affectionExpression"
  | "attachmentDistance"
  | "spousePalace"
  | "maleWealthSpouse"
  | "femaleOfficerSpouse"
  | "marriageStrength"
  | "stabilityConditions"
  | "postMarriageConflict"
  | "avoidPeople"
  | "goodSpouseCriteria"
  | "longLoveStrategy";

export type SajuCh08SectionKey =
  | "regularAndIndirectWealth"
  | "wealthCapacity"
  | "earningMode"
  | "savingStructure"
  | "leakPattern"
  | "businessLuck"
  | "investmentLuck"
  | "workStyleJudgement"
  | "outputCreatesWealth"
  | "careerStabilityByOfficer"
  | "expertiseByResource"
  | "wealthOfficerBridge"
  | "fitCareerFields"
  | "avoidIncomePatterns"
  | "longTermWealthPlan"
  | "careerDirection";

export type SajuCh09SectionKey =
  | "bodyMapByFiveElements"
  | "woodLiverNerves"
  | "fireHeartCirculation"
  | "earthDigestion"
  | "metalLungRespiration"
  | "waterKidneyUrinary"
  | "overloadByExcess"
  | "vulnerabilityByLack"
  | "constitutionByClimate"
  | "stressAccumulation"
  | "burnoutRisk"
  | "psychologicalResilience"
  | "harmfulLifePatterns"
  | "healingRoutines"
  | "longTermMindBodyPlan";

export type SajuCh10SectionKey =
  | "majorSinsalSummary"
  | "auspiciousStars"
  | "inauspiciousStars"
  | "peachBloomRedCharmArt"
  | "specialForces"
  | "nobleScholarStars"
  | "twelveStagesFlow"
  | "growthBathCrownSalary"
  | "peakDeclineIllDeath"
  | "graveCutEmbryoNourish"
  | "dayMasterBased12Stages"
  | "luckCycleLinks"
  | "realWorldSignals"
  | "hiddenTalentAndRisk"
  | "specialCodeSynthesis";

export type SajuCh11SectionKey =
  | "yearlyOverview2026"
  | "bingFireStemEffect"
  | "ohFireBranchEffect"
  | "natalInteractions2026"
  | "strongerElements2026"
  | "weakerElements2026"
  | "careerBusinessFlow"
  | "wealthFlow"
  | "relationshipFlow"
  | "healthPsychologyFlow"
  | "monthlyActionPlan";

export type SajuCh12SectionKey =
  | "lifeFlowSummary"
  | "earlyLifeTask"
  | "youthGrowthDirection"
  | "midlifeAchievement"
  | "matureStability"
  | "lateLifeQuality"
  | "upwardWindows"
  | "crisisWindows"
  | "mustCatchOpportunities"
  | "mustAvoidChoices"
  | "careerLongRoadmap"
  | "wealthLongRoadmap"
  | "relationshipLongRoadmap"
  | "healthLongRoadmap"
  | "executionPlan";

export type SajuCh13SectionKey =
  | "coreSummary"
  | "strongestTalent"
  | "biggestWeakness"
  | "mostImportantTask"
  | "mustActivateQi"
  | "mustCautionQi"
  | "fitSuccessMode"
  | "unfitSuccessMode"
  | "relationshipFinalAdvice"
  | "loveMarriageFinalAdvice"
  | "wealthCareerFinalAdvice"
  | "healthPsychologyFinalAdvice"
  | "currentBestChoice"
  | "oneYearPlan"
  | "tenYearPlan"
  | "oneSentence"
  | "destinyKeyword";

export interface SajuCh01WongukData extends SajuChapterBase<SajuCh01SectionKey> {}
export interface SajuCh02DesignData extends SajuChapterBase<SajuCh02SectionKey> {}
export interface SajuCh03YongshinData extends SajuChapterBase<SajuCh03SectionKey> {}
export interface SajuCh04DaeunData extends SajuChapterBase<SajuCh04SectionKey> {}
export interface SajuCh05GeokgukData extends SajuChapterBase<SajuCh05SectionKey> {}
export interface SajuCh06RelationData extends SajuChapterBase<SajuCh06SectionKey> {}
export interface SajuCh07LoveData extends SajuChapterBase<SajuCh07SectionKey> {}
export interface SajuCh08WealthCareerData extends SajuChapterBase<SajuCh08SectionKey> {}
export interface SajuCh09HealthData extends SajuChapterBase<SajuCh09SectionKey> {}
export interface SajuCh10HiddenCodeData extends SajuChapterBase<SajuCh10SectionKey> {}
export interface SajuCh11Roadmap2026Data extends SajuChapterBase<SajuCh11SectionKey> {}
export interface SajuCh12MasterplanData extends SajuChapterBase<SajuCh12SectionKey> {}
export interface SajuCh13FinalData extends SajuChapterBase<SajuCh13SectionKey> {}
