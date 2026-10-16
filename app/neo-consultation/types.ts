export type NeoQuestion = { id: string; text: string; answer?: string; answerVersion?: number; correction?: string; review?: { by: string; at: string; answerVersion: number }; state?: string };
export type NeoInput = { questions: string[]; context: string; email: string; consent: boolean; birth: null | { date: string; calendar: string; leapMonth: boolean; timeUnknown: boolean; time: string | null } };
export type NeoOrder = {
  id: string; version: number; state: string; email: string; context: string; birth: NeoInput['birth']; consent: boolean;
  questions: NeoQuestion[];
  quote: null | { id: string; quantity: number; unitKRW: number; totalKRW: number };
  payment: null | { id: string; status: string };
  deliveryStatus?: { receipt: string; answer: string };
  deliveries: { key: string; questions: NeoQuestion[]; sentAt: string }[];
  mailJobs?: { key: string; kind: string; state: string; attempt: number }[];
};
