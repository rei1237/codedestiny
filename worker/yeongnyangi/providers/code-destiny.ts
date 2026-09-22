import { callGeminiText } from '../../lib/gemini.js';
import { tokensRequiredForChars } from '../../lib/llm-budget.js';
import { FortuneError, type FortuneLLMRequest, type LLMProvider } from '../fortune/shared/contracts';
import { messages } from '../fortune/shared/prompt';
import { getEnv } from '../../lib/env.js';

export class CodeDestinyProvider implements LLMProvider {
  constructor(private env: Record<string, unknown>) {}
  async generate(request: FortuneLLMRequest) {
    // No fixture or paid-provider fallback is selected by request parameters.
    if (getEnv(this.env,'LLM_DRY_RUN') === 'true' || !getEnv(this.env,'GEMINIF_API_KEY')) throw new FortuneError('LLM_NOT_CONFIGURED',503);
    const cap=Math.max(request.maxOutputTokens || 8192,tokensRequiredForChars(4000));
    const response=await callGeminiText(this.env, JSON.stringify(messages(request)), {
      maxOutputTokens:cap,thinkingBudget:1024,timeoutMs:90000,
      systemPrompt:request.system,responseMimeType:'application/json',fallbackToWorkersAI:false,
      taskType:'yeongnyangi-chapter',
    });
    if (response.truncated || /^(MAX_TOKENS|LENGTH)$/.test(response.finishReason || '')) throw new FortuneError('FORTUNE_OUTPUT_TRUNCATED',502);
    if (!response.ok || response.isMock || !response.text) {
      const code='error' in response ? String(response.error) : '';
      throw new FortuneError(/timeout|deadline/i.test(code)?'FORTUNE_PROVIDER_TIMEOUT':'FORTUNE_PROVIDER_FAILED',502);
    }
    return {result:response.text,provider:response.provider || 'gemini',model:response.model || 'gemini-2.5-flash'};
  }
}
