export type VisualDetail = {
  slug: string; title: string; href: string; featureKey: string; featureKeyTo?: string; accessType: string;
  image: string; headline: string; description: string; ctaLabel: string; verification: string; category?: string;
  aliases: string[]; evidence: string[];
  journey?: { questions: string[]; trustNotes: string[]; faq: { q: string; a: string }[] };
  heroVariants?: { src: string; width: number }[];
  panels: { title: string; text?: string; visualPreview?: 'feature-map' | 'book' | 'animal' | 'master-codex' | 'love-code' | 'nakshatra-compat' | 'neo' | 'saju' | 'ziwei' | 'sukuyo' | 'vedic' | 'astrology' | 'tarot-love' | 'tarot-reunion' | 'tarot-mindscan'; previewTone?: string; items?: string[]; steps?: {label: string; detail?: string}[]; verifiedCapture?: {src: string; alt: string; label: string; width?: number; height?: number} }[];
};
export function renderFeatureDetailPanels(detail: VisualDetail, options?: {headingLevel?: number; conversionPrompt?: boolean}): string;
export function loadFeatureDetail(keys: (string | undefined)[]): Promise<VisualDetail | null>;
