import { consultationStories as stories, storyBenefits as benefits, storyPreviewHeights as heights } from '@/lib/brand/consultation-stories.mjs';
export const consultationStories: Record<string,{lead:string;basis:string;invitation:string;voices:string}> = stories;
export const storyBenefits: Record<string,string[]> = benefits;
export const storyPreviewHeights: Record<string,number> = heights;
export const signatureStoryIds = ['love-secret', 'new-year', 'life-book', 'neo', 'tea', 'codex'] as const;
export const expertStoryIds = ['ziwei', 'astrology', 'vedic', 'sukuyo-compat', 'legacy-naming', 'karma', 'fusion'] as const;
