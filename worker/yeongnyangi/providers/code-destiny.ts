import { callGeminiText } from '../../lib/gemini.js';
import { tokensRequiredForChars } from '../../lib/llm-budget.js';
import { FortuneError, type FortuneLLMRequest, type LLMProvider } from '../fortune/shared/contracts';
import { messages } from '../fortune/shared/prompt';
import { getEnv } from '../../lib/env.js';

// Gemini's responseSchema uses the OpenAPI subset, not JSON Schema.
function providerSchema(value: any): any {
  if(Array.isArray(value))return value.map(providerSchema);
  if(!value || typeof value!=='object')return value;
  // Gemini rejects empty enum values before generation. Empty legacy fields
  // remain a prompt and application-validation contract, not a provider enum.
  return Object.fromEntries(Object.entries(value).filter(([key,item])=>key!=='additionalProperties' && !(key==='enum' && Array.isArray(item) && item.includes(''))).map(([key,item])=>[key,providerSchema(item)]));
}

// Gemini 2.5 thinking tokens eat into maxOutputTokens (lib/llm-client.ts), so the cap adds the thinking budget on top.
const THINKING_BUDGET=1024;

export class CodeDestinyProvider implements LLMProvider {
  constructor(private env: Record<string, unknown>) {}
  async generate(request: FortuneLLMRequest) {
    // No fixture or paid-provider fallback is selected by request parameters.
    if (getEnv(this.env,'LLM_DRY_RUN') === 'true' || !getEnv(this.env,'GEMINIF_API_KEY')) throw new FortuneError('LLM_NOT_CONFIGURED',503);
    const cap=Math.max(request.maxOutputTokens || 8192,tokensRequiredForChars(6000))+THINKING_BUDGET;
    const response=await callGeminiText(this.env, JSON.stringify(messages(request)), {
      locale:request.locale || 'ko',
      maxOutputTokens:cap,thinkingBudget:THINKING_BUDGET,timeoutMs:90000,
      // The durable chapter counter owns retries. Hidden provider retries would
      // multiply calls behind one recorded attempt and delay queue recovery.
      maxProviderAttempts:1,
      systemPrompt:request.system,responseMimeType:'application/json',responseSchema:providerSchema(request.outputSchema),fallbackToWorkersAI:false,
      taskType:'yeongnyangi-chapter',
    });
    if (response.truncated || /^(MAX_TOKENS|LENGTH)$/.test(response.finishReason || '')) throw new FortuneError('FORTUNE_OUTPUT_TRUNCATED',502);
    if (!response.ok || response.isMock || !response.text) {
      const code='error' in response ? String(response.error) : '';
      console.warn('[yeongnyangi-provider]',JSON.stringify({code:code.replace(/[^A-Za-z0-9_]/g,'').slice(0,80),status:'status' in response?response.status:null}));
      throw new FortuneError(/timeout|deadline/i.test(code)?'FORTUNE_PROVIDER_TIMEOUT':'FORTUNE_PROVIDER_FAILED',502);
    }
    return {result:response.text,provider:response.provider || 'gemini',model:response.model || 'gemini-2.5-flash'};
  }
}
