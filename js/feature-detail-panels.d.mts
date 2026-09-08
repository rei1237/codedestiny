export type VisualDetail = {
  slug: string; title: string; href: string; featureKey: string; featureKeyTo?: string; accessType: string;
  image: string; headline: string; description: string; ctaLabel: string; verification: string;
  aliases: string[]; evidence: string[];
  heroVariants?: { src: string; width: number }[];
  panels: { title: string; text?: string; visualPreview?: 'book' | 'animal' | 'neo' | 'saju' | 'ziwei' | 'sukuyo' | 'vedic' | 'astrology'; items?: string[]; steps?: {label: string; detail?: string}[]; verifiedCapture?: {src: string; alt: string; label: string; width?: number; height?: number} }[];
};
export function renderFeatureDetailPanels(detail: VisualDetail, options?: {headingLevel?: number}): string;
export function loadFeatureDetail(keys: (string | undefined)[]): Promise<VisualDetail | null>;
