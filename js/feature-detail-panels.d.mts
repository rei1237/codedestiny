export type VisualDetail = {
  priceOptions?: { featureKey: string; label: string; amountKRW: number }[];
  freeEntry?: boolean;
  consultationGuide?: import('./consultation-sample-guide.mjs').ConsultationSampleGuide;
  crafted?: CraftedDetail[];
  slug: string; title: string; href: string; featureKey: string; featureKeyTo?: string; priceFrom?: boolean; accessType: string;
  image: string; headline: string; description: string; ctaLabel: string; verification: string; category?: string;
  aliases: string[]; evidence: string[];
  journey?: { questions: string[]; trustNotes: string[]; faq: { q: string; a: string }[] };
  heroVariants?: { src: string; width: number }[];
  imageAlt?: string; theme?: string; edition?: string; cardImage?: string; catalogImage?: string; ogImage?: string;
  material?: 'book' | 'letter'; imageWidth?: number; imageHeight?: number;
  founder?: { credential: string; method: string };
  benefits?: string[]; contents?: { title: string; detail?: string }[];
  method?: { title: string; text: string; inputs?: string[] };
  sample?: { title: string; text: string; evidence?: string[]; action?: string; note?: string };
  storySections?: { image?: string; alt?: string; title: string; text: string }[];
  relatedProducts?: string[]; related?: { slug: string; title: string; hook: string; image: string }[];
  panels: { title: string; text?: string; visualPreview?: 'feature-map' | 'book' | 'animal' | 'master-codex' | 'love-code' | 'nakshatra-compat' | 'neo' | 'saju' | 'ziwei' | 'sukuyo' | 'vedic' | 'astrology' | 'tarot-love' | 'tarot-reunion' | 'tarot-mindscan'; previewTone?: string; items?: string[]; steps?: {label: string; detail?: string}[]; verifiedCapture?: {src: string; alt: string; label: string; width?: number; height?: number} }[];
};
export function renderFeatureDetailPanels(detail: VisualDetail, options?: {headingLevel?: number; conversionPrompt?: boolean; startPriceLabel?: string}): string;
export function loadFeatureDetail(keys: (string | undefined)[]): Promise<VisualDetail | null>;
/** Resolved by the visual-details generator from components/fortune/master-profiles.ts; raw manifests carry the key only. */
export type CraftedMaster = { key: string; name: string; epithet?: string; signature?: string; role?: string; part?: string; basis?: string; principles?: string[]; avatar: string; portrait?: string; portraitSrcSet?: string };
export type CraftedDetail = { layout?: string; masterRoles?: Record<string, string>; masterBasis?: Record<string,string>; masterIntroductions?: Record<string,string>; id?: string; featureKey?: string | null; title?: string; cardTitle?: string; hook?: string; badge?: string; priceKRW?: number; cover?: { src: string; width: number; height: number }; chaptersLabel?: string; masters?: (CraftedMaster | string)[]; chapters?: { title: string; detail?: string; gain?: string; master?: string }[]; outcomes?: { title: string; text: string; evidence?: string }[]; panels: { src: string; text: string; title: string; alt?: string; showImage?: boolean; textBelowImage?: boolean; width?: number; height?: number; variants?: { src: string; width: number }[] }[]; notice: string };
export function renderCraftedDetail(detail: CraftedDetail, options?: {eager?: boolean}): string;
export function revealCraftedTranscript(event: {target: EventTarget | null}): void;
