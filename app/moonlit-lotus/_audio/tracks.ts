// 참배 흐름 곡 목록. 곡은 명상 일기와 같은 23곡(meditation-tracks.ts)이고, 여기서는 분위기 태그만 붙인다.
import {DIARY_MEDITATION_TRACKS} from '@/app/diary/_lib/meditation-tracks';
export const MOODS=['calm','dawn','warm','focus','night','water','stars','renew'] as const;
export type Mood=typeof MOODS[number];
const MOOD_BY_TITLE:Record<string,Mood>={
 'Crystal Garden':'calm','Dawn in the Temple':'dawn','Fire Festival':'warm','First Light on Water':'water',
 'Flowing Light':'water','Focus Flow':'focus','Inner Flame Awakening':'warm','Midnight Pulse':'night',
 'Moonlit Dawn':'dawn','Moonlit Forest Temple':'night','Moonlit Glass Box':'calm','Moonlit River Return':'water',
 'Moonlit Strategy Map':'focus','Moonlit Temple Gate':'night','Rain Window Renewal':'renew','Sacred Flame':'warm',
 'Starlight Drift':'stars','Still Lake Dawn':'dawn','Still Lake Mind':'calm','Sunrise Drum Circle':'renew',
 'The Memory of Water':'water','The Stars Remember Your Name':'stars','Zero Point':'focus',
};
export type RitualTrack={id:string;title:string;url:string;mood:Mood};
export const RITUAL_TRACKS:readonly RitualTrack[]=DIARY_MEDITATION_TRACKS.map(track=>({...track,mood:MOOD_BY_TITLE[track.title]||'calm'}));
export const TRACK_IDS=RITUAL_TRACKS.map(track=>track.id);
/** 절 마당에 들어서는 첫 곡. 저장된 곡이 없을 때만 쓴다. */
export const DEFAULT_TRACK_ID=(RITUAL_TRACKS.find(track=>track.title==='Moonlit Temple Gate')||RITUAL_TRACKS[0]).id;
export function trackIndex(id:string){const index=TRACK_IDS.indexOf(id);return index<0?0:index;}
