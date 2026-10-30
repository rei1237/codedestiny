import { jsonSchemaFromExample } from "../../lib/json-text-repair.js";
import {CONCISE_READING_VERSION,CONCISE_MIN_OUTPUT_TOKENS} from '../fortune/concise-reading';
import { callGeminiText } from '../../lib/gemini.js';
import { GEMINI_PROSE_MODEL, proFallbackCause, selectGeminiModel } from '../../../lib/gemini-model-policy.js';
import { tokensRequiredForChars } from '../../lib/llm-budget.js';
import { FortuneError, type FortuneLLMRequest, type LLMProvider } from '../fortune/shared/contracts';
import { messages } from '../fortune/shared/prompt';
import { getEnv } from '../../lib/env.js';
import { CHAPTER_TIMEOUT_MS } from '../chapter-delivery-contract.js';
import { chapterResponseCache } from './response-cache';

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
// A Flash call needs at least this much of the attempt's time to be worth sending after a Pro refusal.
const PRO_FALLBACK_MIN_MS=60000;

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
  receipt?: {provider:string;model:string;finishReason:string;inputTokens:number|null;outputTokens:number|null;estimated:boolean|null;thinkingTokens:number|null;durationMs:number;maxOutputTokens:number;status:number|null;modelFallback?:string};
  constructor(private env: Record<string, unknown>, private logContext: Record<string, unknown> = {},
    private cacheContext: {owner?:string;skipRead?:boolean}={},
    // The order's tier timeout (chapterTimeoutMs); orders without the policy marker keep CHAPTER_TIMEOUT_MS.
    private timeoutMs = CHAPTER_TIMEOUT_MS,
    // Only server-classified synthesis chapters can opt into Pro.
    // The question analysis stays on the default model because it runs with a zero thinking budget.
    private model?: string, private reasoningTask?: 'tuna-synthesis') {}
  async analyzeQuestion(system: string, data: string): Promise<string> {
    if(getEnv(this.env,'LLM_DRY_RUN')==='true'||!getEnv(this.env,'GEMINIF_API_KEY'))throw new FortuneError('LLM_NOT_CONFIGURED',503);
    const response=await callGeminiText(this.env,data,{
      systemPrompt:system,temperature:0,maxOutputTokens:4096,thinkingBudget:0,timeoutMs:15000,
      maxProviderAttempts:1,fallbackToWorkersAI:false,responseMimeType:'application/json',taskType:'yeongnyangi-ask-analysis',
      responseSchema:jsonSchemaFromExample({questions:[{questionId:'',category:'',needsTiming:false}]}),
      logContext:{...this.logContext,sectionGroup:'question-analysis'},
      cache:chapterResponseCache(this.env,this.cacheContext.owner,this.logContext.requestId,'question-analysis',this.cacheContext.skipRead),
    });
    if(!response.ok||response.isMock||!response.text||response.truncated||/^(MAX_TOKENS|LENGTH)$/.test(response.finishReason||''))throw new FortuneError('ASK_ANALYSIS_FAILED',502);
    return response.text;
  }
  async generate(request: FortuneLLMRequest) {
    const startedAt=Date.now();
    // No fixture or paid-provider fallback is selected by request parameters.
    if (getEnv(this.env,'LLM_DRY_RUN') === 'true' || !getEnv(this.env,'GEMINIF_API_KEY')) throw new FortuneError('LLM_NOT_CONFIGURED',503);
    const cap=chapterOutputTokenBudget(request.maxOutputTokens,request.outputBudgetVersion);
    // The system instructions already travel in systemPrompt. Send the user
    // payload once, without embedding and escaping the whole message array.
    let payload=messages(request)[1].content;
    if(request.deliveryContract || request.outputBudgetVersion===CONCISE_READING_VERSION){
      // The actual responseSchema carries the same output contract below. Keep
      // each fact/rule once and avoid escaping the entire domain JSON as text.
      const {OUTPUT_SCHEMA:_schema,...data}=JSON.parse(payload);
      data.DOMAIN_CONTEXT=JSON.parse(request.domainRules);
      payload=JSON.stringify(data);
    }
    const send=(model:string|undefined,reasoningTask:'tuna-synthesis'|undefined,timeoutMs:number)=>callGeminiText(this.env, payload, {
      locale:request.locale || 'ko',
      // The persona sets the speech level; keep the shared Korean directive from forcing 존댓말 over it.
      outputRegister:'persona',
      // The chapter lease reserves another 90 seconds for analysis, validation and persisted reread.
      maxOutputTokens:cap,thinkingBudget:CHAPTER_THINKING_BUDGET,timeoutMs,
      ...(model?{model}:{}),reasoningTask,
      preserveTermination:true,
      // The durable chapter counter owns retries. Hidden provider retries would
      // multiply calls behind one recorded attempt and delay queue recovery.
      maxProviderAttempts:1,
      systemPrompt:request.system,responseMimeType:'application/json',responseSchema:providerSchema(request.outputSchema),fallbackToWorkersAI:false,
      taskType:'yeongnyangi-chapter',
      cache:chapterResponseCache(this.env,this.cacheContext.owner,this.logContext.requestId,String(this.logContext.sectionGroup),this.cacheContext.skipRead),
      logContext:this.logContext,
    });
    let response=await send(this.model,this.reasoningTask,this.timeoutMs);
    // Pro refused before writing (retired 404, 429, 5xx): the same attempt sends the prompt to Flash.
    // A Pro timeout has spent the time; its receipt moves the next attempt (tunaProUnavailable).
    const cause=proFallbackCause(selectGeminiModel(this.model,this.reasoningTask),response);
    const remaining=this.timeoutMs-(Date.now()-startedAt);
    const modelFallback=cause&&cause!=='LLM_GENERATION_TIMEOUT'&&remaining>=PRO_FALLBACK_MIN_MS?cause:'';
    if(modelFallback){
      console.warn('[yeongnyangi-model-fallback]',JSON.stringify({requestId:this.logContext.requestId,sectionGroup:this.logContext.sectionGroup,cause}));
      response=await send(GEMINI_PROSE_MODEL,undefined,remaining);
    }
    const model=modelFallback?GEMINI_PROSE_MODEL:this.model;
    this.receipt={provider:response.provider || 'gemini',model:response.model || model || 'gemini-2.5-flash',
      finishReason:response.finishReason || '',inputTokens:response.usage?.inputTokens ?? null,outputTokens:response.usage?.outputTokens ?? null,
      estimated:response.usage?Boolean(response.usage.estimated):null,thinkingTokens:response.usage?.thinkingTokens ?? null,
      durationMs:Date.now()-startedAt,maxOutputTokens:cap,status:'status' in response?response.status:null,...(modelFallback?{modelFallback}:{})};
    if (!response.ok || response.isMock || !response.text) {
      const code='error' in response ? String(response.error) : '';
      // Spend-cap and billing outages travel as the audit detail so the hold alert names the cause.
      const outage='providerCode' in response?String(response.providerCode||''):'';
      console.warn('[yeongnyangi-provider]',JSON.stringify({code:code.replace(/[^A-Za-z0-9_]/g,'').slice(0,80),status:'status' in response?response.status:null,...(outage?{outage}:{})}));
      throw new FortuneError(/timeout|deadline/i.test(code)?'FORTUNE_PROVIDER_TIMEOUT':'FORTUNE_PROVIDER_FAILED',502,outage||undefined);
    }
    if(response.truncated || /^(MAX_TOKENS|LENGTH)$/i.test(response.finishReason || ''))throw new FortuneError('CHAPTER_TRUNCATED',502);
    return {result:response.text,provider:response.provider || 'gemini',model:response.model || model || 'gemini-2.5-flash'};
  }
}
