import { consultationStories as stories, storyBenefits as benefits, storyPreviewHeights as heights } from '@/lib/brand/consultation-stories.mjs';
export const consultationStories: Record<string,{lead:string;basis:string;invitation:string;voices:string}> = stories;
export const storyBenefits: Record<string,string[]> = benefits;
export const storyPreviewHeights: Record<string,number> = heights;
