import type { DomainContext, DomainId, PackageId } from '../shared/contracts';
import type { RuntimeLocale } from '../../../../lib/i18n/locale-normalize.js';

export const ASK_EVIDENCE_VERSION = 'ask-evidence-v1' as const;
export const ASK_CATEGORIES = [
  'love', 'reunion', 'marriage', 'compatibility', 'career', 'job_change',
  'business', 'money', 'study', 'health', 'relationships', 'family', 'move',
  'timing', 'self', 'other',
] as const;
export type AskCategory = typeof ASK_CATEGORIES[number];
export type EvidenceSystem = DomainId | 'numerology';
export type EvidenceSubject = 'self' | 'partner' | 'relationship';
export type EvidenceResolution = 'year' | 'month' | 'day' | 'instant' | 'period';
export interface EvidenceSource {
  system: EvidenceSystem;
  contextDomain: DomainId;
  factId: string;
  path: string;
  engineVersion: string;
}
export interface AskFact {
  id: string;
  group: 'structure' | 'relationship' | 'cards' | 'timing';
  label: string;
  value: unknown;
  tags: AskCategory[];
  subject: EvidenceSubject;
  source: EvidenceSource;
  timeDependent: boolean;
  access: 'standard' | 'professional';
}
export interface AskTiming extends AskFact {
  group: 'timing';
  from: string;
  to: string;
  resolution: EvidenceResolution;
}
export interface EvidenceNote {
  code: 'BIRTH_TIME_UNKNOWN' | 'PARTNER_TIME_UNKNOWN' | 'TIME_DEPENDENT_OMITTED'
    | 'TIMING_COVERAGE_PARTIAL' | 'UNVERIFIED_TRANSIT_OMITTED' | 'ENGINE_LIMITATIONS'
    | 'PARTNER_NOT_PROVIDED';
  system?: EvidenceSystem;
}
export interface EvidencePacket {
  packet_version: typeof ASK_EVIDENCE_VERSION;
  today: string;
  locale: RuntimeLocale;
  engines: DomainId[];
  schools: Partial<Record<DomainId,string>>;
  tier: PackageId;
  window: { from: string; to: string };
  reliability: {
    time_dependent_fields_valid: boolean;
    birth_time_known: boolean;
    notes: EvidenceNote[];
  };
  facts: AskFact[];
  timing: AskTiming[];
  partner: null | { birth_time_known: boolean };
}
// Only engine results enter this boundary. No raw profile, question, or user ID.
export interface PacketInput {
  contexts: Partial<Record<DomainId, DomainContext>>;
  today: string;
  locale?: string;
  tier: PackageId;
  birthTimeKnown: boolean;
  birthProfileAvailable?: boolean;
  partnerTimeKnown?: boolean;
}
