import { yeongnyangiSpreads, spreadSnapshot } from '../tarot/yeongnyangi-spread-catalog.mjs';
import { TAROT_CARDS } from '../tarot/tarot-cards.mjs';
import { getMeaningByQuestion } from '../tarot/tarot-interpretation-engine.mjs';
import { analyzeTarotCombinations } from '../tarot/tarot-combination-engine.mjs';
export const TEA_TAROT_VERSION = 'tea-shared-tarot-v1';
export const teaSpreads = yeongnyangiSpreads.filter(s => s.cardCount === 3 || s.cardCount === 5);
export function teaSpread(id) { return teaSpreads.find(s => s.id === id); }
export function recommendTeaSpread(question = '', size = 'three') {
  if (size !== 'five') return teaSpread('yn_knot_three');
  if (/돈|재물|수입|지출|money|finance/i.test(question)) return teaSpread('yn_money_pattern_five');
  if (/연락|재회|contact|reunion/i.test(question)) return teaSpread('yn_contact_first');
  return teaSpread('yn_new_bond_five');
}
export { spreadSnapshot };
export function teaCombinationEvidence(cards, topic = 'general', locale = 'ko', spread) {
  return analyzeTarotCombinations(cards.map(entry => ({...entry, card:TAROT_CARDS.find(card => card.code === entry.cardId)})), topic, spread || recommendTeaSpread('', cards.length === 5 ? 'five' : 'three'), locale);
}
export function teaDrawCards(spread, deck, picks) {
  if (!spread || picks.length !== spread.cardCount || new Set(picks).size !== picks.length) throw new Error('INVALID_TAROT_PICKS');
  return [...spread.positions].sort((a,b) => a.drawOrder-b.drawOrder).map((position, index) => {
    const card = TAROT_CARDS.find(c => c.code === deck.order[picks[index]]);
    if (!card) throw new Error('INVALID_TAROT_CARD');
    const orientation = deck.reversed[picks[index]] ? 'reversed' : 'upright';
    const meaning = getMeaningByQuestion(card, orientation, spread.topic === 'love' ? 'relationship' : spread.topic === 'money' ? 'money' : 'general');
    return {
      cardId: card.code, number: card.number, nameKo: card.nameKo, nameEn: card.nameEn,
      orientation, keywords: card[orientation].keywords || card.keywords,
      meaning: card[orientation].coreMeaning, topicReadingSeed: JSON.stringify(meaning),
      source: 'existing-ai-tarot', positionId: position.id, positionLabel: position.label,
      positionMeaning: position.role, positionQuestion: position.question, readOrder: position.readOrder,
    };
  });
}
