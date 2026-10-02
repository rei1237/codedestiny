import {CONCISE_READING_VERSION,CONCISE_MIN_OUTPUT_TOKENS} from '../fortune/concise-reading';
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
export const CHAPTER_THINKING_BUDGET=1024;

export function chapterOutputTokenBudget(requested?: number, version?: string): number {
  const declared=Number(requested);
  // StructuredChapterProvider already budgets the target, headings and assigned
  // answers. Preserve that allowance instead of raising every chapter to 6,000
  // characters. Old callers without a declared budget keep the old allowance.
  const content=Number.isFinite(declared)&&declared>0
    ? Math.max(version===CONCISE_READING_VERSION?CONCISE_MIN_OUTPUT_TOKENS:8192,Math.ceil(declared))
    : Math.max(8192,tokensRequiredForChars(6000));
  return content+CHAPTER_THINKING_BUDGET;
}

export class CodeDestinyProvider implements LLMProvider {
  constructor(private env: Record<string, unknown>, private logContext: Record<string, unknown> = {}) {}
  async analyzeQuestion(system: string, data: string): Promise<string> {
    if(getEnv(this.env,'LLM_DRY_RUN')==='true'||!getEnv(this.env,'GEMINIF_API_KEY'))throw new FortuneError('LLM_NOT_CONFIGURED',503);
    const response=await callGeminiText(this.env,data,{
      systemPrompt:system,temperature:0,maxOutputTokens:1024,thinkingBudget:0,timeoutMs:15000,
      maxProviderAttempts:1,fallbackToWorkersAI:false,responseMimeType:'application/json',taskType:'yeongnyangi-ask-analysis',
      logContext:{...this.logContext,sectionGroup:'question-analysis'},
    });
    if(!response.ok||response.isMock||!response.text||response.truncated||/^(MAX_TOKENS|LENGTH)$/.test(response.finishReason||''))throw new FortuneError('ASK_ANALYSIS_FAILED',502);
    return response.text;
  }
  async generate(request: FortuneLLMRequest) {
    // No fixture or paid-provider fallback is selected by request parameters.
    if (getEnv(this.env,'LLM_DRY_RUN') === 'true' || !getEnv(this.env,'GEMINIF_API_KEY')) throw new FortuneError('LLM_NOT_CONFIGURED',503);
    const cap=chapterOutputTokenBudget(request.maxOutputTokens,request.outputBudgetVersion);
    // The system instructions already travel in systemPrompt. Send the user
    // payload once, without embedding and escaping the whole message array.
    let payload=messages(request)[1].content;
    if(request.outputBudgetVersion===CONCISE_READING_VERSION){
      // The actual responseSchema carries the same output contract below. Keep
      // each fact/rule once and avoid escaping the entire domain JSON as text.
      const {OUTPUT_SCHEMA:_schema,...data}=JSON.parse(payload);
      data.DOMAIN_CONTEXT=JSON.parse(request.domainRules);
      payload=JSON.stringify(data);
    }
    const response=await callGeminiText(this.env, payload, {
      locale:request.locale || 'ko',
      // The persona sets the speech level; keep the shared Korean directive from forcing 존댓말 over it.
      outputRegister:'persona',
      // Queue generation owns one chapter and a 180s lease. Leave 30s for validation and persisted reread.
      maxOutputTokens:cap,thinkingBudget:CHAPTER_THINKING_BUDGET,timeoutMs:150000,
      // The durable chapter counter owns retries. Hidden provider retries would
      // multiply calls behind one recorded attempt and delay queue recovery.
      maxProviderAttempts:1,
      systemPrompt:request.system,responseMimeType:'application/json',responseSchema:providerSchema(request.outputSchema),fallbackToWorkersAI:false,
      taskType:'yeongnyangi-chapter',
      logContext:this.logContext,
    });
    // Preserve truncated raw text for local body recovery before considering a paid retry.
    if (!response.ok || response.isMock || !response.text) {
      const code='error' in response ? String(response.error) : '';
      console.warn('[yeongnyangi-provider]',JSON.stringify({code:code.replace(/[^A-Za-z0-9_]/g,'').slice(0,80),status:'status' in response?response.status:null}));
      throw new FortuneError(/timeout|deadline/i.test(code)?'FORTUNE_PROVIDER_TIMEOUT':'FORTUNE_PROVIDER_FAILED',502);
    }
    return {result:response.text,provider:response.provider || 'gemini',model:response.model || 'gemini-2.5-flash'};
  }
}
