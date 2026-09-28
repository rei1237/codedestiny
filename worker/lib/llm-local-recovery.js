import { salvageTruncatedJsonObject } from '../../lib/llm-text.js';
import { normalizeNarrativeBody, completeNarrativeBody } from './paid-narrative-candidate.js';

// A transport length flag is not a reason to purchase another response when
// complete prose survived. Product adapters still validate ownership and topic.
export function recoverClippedLlmResponse(result) {
  if (!result?.ok || !(result.truncated || /^(MAX_TOKENS|length)$/i.test(result.finishReason || ''))) return result;
  const rawText = result.rawText || result.text || '';
  const source = String(result.text || '').replace(/^```(?:json)?\s*/iu, '').replace(/\s*```$/u, '').trim();
  let text;
  if (source.startsWith('{')) {
    const parsed = salvageTruncatedJsonObject(source);
    if (!parsed) return result;
    const bodies = [];
    const visit = value => {
      if (typeof value === 'string') { const body = normalizeNarrativeBody(value); if (completeNarrativeBody(body)) bodies.push(body); }
      else if (value && typeof value === 'object') Object.values(value).forEach(visit);
    };
    visit(parsed);
    if (!bodies.length) return result;
    text = JSON.stringify(parsed);
  } else {
    text = normalizeNarrativeBody(source);
    if (!completeNarrativeBody(text)) return result;
  }
  return { ...result, text, rawText, truncated: false, finishReason: 'LOCAL_RECOVERY', recoveredLocally: true };
}
