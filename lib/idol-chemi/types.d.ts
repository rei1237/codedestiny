// 최애 케미 엔진·데이터 공용 타입 (실행 코드는 .js — 워커와 Next 가 함께 import 한다).

export type ElementKey = "wood" | "fire" | "earth" | "metal" | "water";
export type YinYang = "yang" | "yin";
export type CalendarType = "solar" | "lunar" | "lunar_leap";
export type SignalTone = "harmony" | "friction" | "neutral";
export type SignalStrength = "high" | "medium" | "low";
export type PartnerKind = "roster" | "preset";

export type ChemiTypeId =
  | "telepathy"
  | "same-wave"
  | "accel-brake"
  | "locked-in"
  | "quiet-care"
  | "hype-charger"
  | "push-pull"
  | "cross-learn"
  | "slow-burn";

export interface ChemiTypeMeta {
  id: ChemiTypeId;
  order: number;
  nameKo: string;
  shortKo: string;
  ruleKo: string;
}

export interface ChemiPillar {
  stem: string;
  branch: string;
  ganji: string;
  ganjiHanja: string;
  stemElement: ElementKey;
  branchElement: ElementKey;
}

export interface ChemiPillars {
  year: ChemiPillar;
  month: ChemiPillar;
  day: ChemiPillar;
  dayStemElement: ElementKey;
  yinYang: YinYang;
  elementCounts: Record<ElementKey, number>;
  strongest: ElementKey;
  weakest: ElementKey;
  lacking: readonly ElementKey[];
  includeHour: false;
}

export interface ChemiSignal {
  key: string;
  tone: SignalTone;
  weight: number;
  evidenceKo: string;
}

export interface ChemiPartnerRecord {
  kind: PartnerKind;
  id: string;
  displayName: string;
  displayNameEn: string;
  groupLabel: string;
  groupLabelEn: string;
  groupId: string | null;
  category: string;
  birthDate: string;
  birthTimeKnown: false;
  status: "active" | "inactive";
  sourceVersion: string;
  searchText: string;
}

export interface ChemiPartnerRef {
  kind: PartnerKind;
  id: string;
}

export interface ChemiUserInput {
  birthDate: string;
  calendarType?: CalendarType;
  isLeapMonth?: boolean;
  /** 받아도 버린다(대칭 비교). */
  birthTime?: string;
}

export interface ChemiInput {
  user: ChemiUserInput;
  partner: ChemiPartnerRecord;
  /** YYYY-MM-DD. 호출자가 넘긴다(엔진은 시계를 읽지 않음). */
  referenceDate: string;
}

export interface ChemiResult {
  engineVersion: string;
  rulesVersion: string;
  rosterVersion: string;
  inputHash: string;
  copySeed: string;
  chemiTypeId: ChemiTypeId;
  chemiTypeNameKo: string;
  chemiTypeShortKo: string;
  chemiTypeRuleKo: string;
  matchedSignalKeys: readonly string[];
  signalStrength: SignalStrength;
  chemiIndex: null;
  signals: readonly ChemiSignal[];
  dataGaps: readonly string[];
  minorMode: boolean;
  pillars: { user: ChemiPillars; partner: ChemiPillars };
  partner: { kind: PartnerKind; id: string; displayName: string; groupLabel: string; groupId: string | null };
}

export interface ChemiCopyPoint {
  label: string;
  text: string;
  evidenceKo: string;
}

export interface ChemiCopy {
  copyVersion: string;
  title: string;
  shortTitle: string;
  oneLiner: string;
  points: ChemiCopyPoint[];
  scenario: { label: string; setting: string; text: string };
  caution: { label: string; text: string; evidenceKo: string };
  finish: { label: string; text: string };
  notices: string[];
}

export interface RosterGroupSummary {
  id: string;
  nameKo: string;
  nameEn: string;
  debutYear: number;
  memberCount: number;
}
