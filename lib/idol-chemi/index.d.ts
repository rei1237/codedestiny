// lib/idol-chemi/index.js 의 공개 API 타입. 실행 코드는 .js(워커·Next 공용), 타입은 types.d.ts.
import type {
  ChemiCopy,
  ChemiInput,
  ChemiPartnerRecord,
  ChemiPartnerRef,
  ChemiResult,
  ChemiScoreAxis,
  ChemiSignal,
  ChemiTypeId,
  ChemiTypeMeta,
  ChemiUserInput,
  RosterGroupSummary,
  SignalStrength,
} from "./types";

export * from "./types";

export const ROSTER_VERSION: string;
export const ROSTER_CHECKED_ON: string;
export const LEGACY_PRESET_VERSION: string;
export const PARTNER_KINDS: readonly ["roster", "preset"];
export const PARTNER_ID_PATTERN: RegExp;
export const ROSTER_PARTNERS: readonly ChemiPartnerRecord[];
export const PRESET_PARTNERS: readonly ChemiPartnerRecord[];
export function isShadowedByRoster(record: ChemiPartnerRecord): boolean;
export function listRosterGroups(): readonly RosterGroupSummary[];
export function listGroupMembers(groupId: string): readonly ChemiPartnerRecord[];
export function resolvePartner(ref: ChemiPartnerRef | null | undefined): ChemiPartnerRecord | null;
export function searchPartners(query: string, limit?: number): readonly ChemiPartnerRecord[];

export const ENGINE_VERSION: string;
export const CHEMI_RULES_VERSION: string;
export const MINOR_AGE_LIMIT: number;
export const MIN_SELF_CONSENT_AGE: number;
export const DATA_GAP_PARTNER_HOUR: string;
export const DATA_GAP_USER_HOUR: string;
export const CHEMI_TYPES: readonly ChemiTypeMeta[];
export const CHEMI_TYPE_IDS: readonly ChemiTypeId[];
export const CHEMI_TYPE_BY_ID: Readonly<Record<ChemiTypeId, ChemiTypeMeta>>;
export const CHEMI_SCORE_VERSION: string;
export const CHEMI_SCORE_AXES: readonly ChemiScoreAxis[];
export const CHEMI_GRADES: readonly { min: number; grade: string; gradeTitle: string; pairingTitle: string }[];
export function resolveChemiGrade(total: number): { min: number; grade: string; gradeTitle: string; pairingTitle: string };
export function computeFullAge(birthIso: string, referenceIso: string): number | null;
export function computeChemi(input: ChemiInput): ChemiResult;
export function resolveSignalStrength(signals: readonly ChemiSignal[]): SignalStrength;
export function fnv1a32(text: string): number;
export function fnv1aHex(text: string): string;
export function pickDeterministic<T>(pool: readonly T[], seed: string, slot: string): T;

export const COPY_VERSION: string;
export const ENTERTAINMENT_NOTICE: string;
export const LABELS: {
  readonly points: readonly [string, string, string];
  readonly scenario: string;
  readonly caution: string;
  readonly finish: string;
  readonly evidence: string;
};
export function assembleChemiCopy(result: ChemiResult): ChemiCopy;

export function runChemi(input: {
  user: ChemiUserInput;
  partner: ChemiPartnerRef;
  referenceDate: string;
}): { result: ChemiResult; copy: ChemiCopy };
