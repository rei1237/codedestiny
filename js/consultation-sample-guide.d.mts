export type ConsultationSampleGuide = {
  audience: string;
  preparation: string;
  outline: {title: string; text: string}[];
  delivery: string;
  examples: {title: string; text: string; kind: 'result' | 'editorial'; sourceUrl?: string; sourceLabel?: string}[];
};
export function renderConsultationSampleGuide(guide: ConsultationSampleGuide, options?: {headingLevel?: number; title?: string}): string;
