// ziwei·ziwei_saju는 2026-10-18 이전 주문 표시용 레거시 방식이다.
export type NeoReadingMode = 'saju' | 'saju_ziwei' | 'ziwei' | 'ziwei_saju';
export type NeoDraftQuestion = { text: string; readingMode: 'saju' | 'saju_ziwei'; chartReading: boolean };
export type NeoQuestion = { id: string; text: string; readingMode?: NeoReadingMode; chartReading?: boolean; answer?: string; answerVersion?: number; correction?: string; review?: { by: string; at: string; answerVersion: number; combinedReadingConfirmed?: boolean; chartReadingConfirmed?: boolean }; state?: string };
type NeoBirth = { date: string; calendar: string; leapMonth: boolean; timeUnknown: boolean; time: string | null };
export type NeoInput = { locale?: string; questions: NeoDraftQuestion[]; context: string; goodPeriod?: string; difficultPeriod?: string; email: string; consent: boolean; birth: NeoBirth | null; partnerBirth?: NeoBirth | null };
export type NeoOrder = {
  id: string; version: number; locale?: string; state: string; email: string; context: string; goodPeriod?: string; difficultPeriod?: string; birth: NeoInput['birth']; partnerBirth?: NeoBirth | null; consent: boolean;
  questions: NeoQuestion[];
  quote: null | { id: string; quantity: number; unitKRW: number | null; totalKRW: number; pricingVersion?: number; items?: { questionId: string; readingMode: NeoReadingMode; chartReading?: boolean; unitKRW: number }[] };
  payment: null | { id: string; status: string };
  deliveryStatus?: { receipt: string; answer: string };
  cancellationRequestedAt?: string;
  deliveryMode?: 'manual_email';
  manualDelivery?: { by: string; sentAt: string };
  contentDeletedAt?: string;
  deliveries: { key: string; questions: NeoQuestion[]; sentAt: string }[];
  mailJobs?: { key: string; kind: string; state: string; attempt: number }[];
};
