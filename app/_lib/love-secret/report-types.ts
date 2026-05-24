export type LoveSecretMode = 'SOLO' | 'COUPLE';

export interface LoveSecretPersonBirth {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  calType?: 'solar' | 'lunar' | 'lunar_leap';
  calendarType?: 'solar' | 'lunar' | 'lunar_leap';
  isLunar?: boolean;
  timeUnknown?: boolean;
  birthDate?: string;
  birthTime?: string;
}

export interface SajuSoloSecretData {
  mode: 'SOLO';
  profileId?: string;
  name: string;
  gender?: string;
  birth: LoveSecretPersonBirth;
  sajuData?: string;
  engineData?: Record<string, unknown>;
}

export interface SajuCoupleSecretPartnerData {
  profileId?: string;
  name: string;
  gender?: string;
  birth: LoveSecretPersonBirth;
  sajuData?: string;
  engineData?: Record<string, unknown>;
}

export interface SajuCoupleSecretData {
  mode: 'COUPLE';
  profileId?: string;
  name: string;
  gender?: string;
  birth: LoveSecretPersonBirth;
  partnerName: string;
  partnerGender?: string;
  partnerBirth: LoveSecretPersonBirth;
  partnerData?: string;
  partner?: SajuCoupleSecretPartnerData;
  sajuData?: string;
  engineData?: Record<string, unknown>;
}

export interface LoveSecretChapterMeta {
  chapter: number;
  title: string;
  subtitle?: string;
  purpose?: string;
}

export interface LoveSecretReportPayloadBase {
  reportId?: string;
  reportMode: LoveSecretMode;
  totalChapters: 7 | 8;
  _premiumStrictPayload?: boolean;
  _premiumStrictValidation?: boolean;
}

export type LoveSecretReportPayload = SajuSoloSecretData | SajuCoupleSecretData;
