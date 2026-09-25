import { ASK_CATEGORIES, type AskCategory } from './contracts';
import { FortuneError, type DomainId } from '../shared/contracts';

export function canonicalAskEngine(value: string): DomainId {
  if(value==='western')return 'astrology';
  if(['saju','ziwei','astrology','sukuyo','vedic','tarot'].includes(value))return value as DomainId;
  throw new FortuneError('INVALID_ASK_ENGINE');
}

const legacy: Record<string, AskCategory> = {
  general: 'other', love: 'love', money: 'money', year: 'timing', luck: 'timing',
  relationship: 'relationships', work: 'career', self: 'self', healing: 'self',
};
export function canonicalAskCategory(value: string): AskCategory {
  return (ASK_CATEGORIES as readonly string[]).includes(value)
    ? value as AskCategory : legacy[value] || 'other';
}
const relation: AskCategory[] = ['love', 'reunion', 'marriage', 'compatibility', 'relationships', 'family'];
export function tagsForEvidence(label: string): AskCategory[] {
  if (/partner|relationship|relation|distance|synastry|compatibility|ashtakuta/i.test(label)) return relation;
  if (/Luck|timeline|dasha|transit|today/i.test(label)) return [...ASK_CATEGORIES];
  if (/tenGod|planet|palace|house|cards|reading|fiveElements|seasonal|dayMaster|pillars|personA|moon|lagna|ascendant/i.test(label))
    return [...ASK_CATEGORIES];
  return ['self', 'other'];
}
