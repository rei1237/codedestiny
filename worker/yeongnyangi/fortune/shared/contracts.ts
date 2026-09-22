export type DomainId = "saju" | "sukuyo" | "vedic" | "astrology" | "ziwei" | "tarot";
export type FishId = "mackerel" | "salmon" | "flounder" | "tuna";
export type PackageId = FishId | 'assorted' | 'omakase';
export interface Place { name?: string; latitude: number; longitude: number; timezone: string; source?: string }
export interface BirthProfile {
  birthDate: string;
  birthTime?: string;
  gender?: "male" | "female";
  calendarType: "solar";
  birthPlace?: Place;
  residence?: Place;
  originalCalendar?: { date: string; type: 'solar' | 'lunar'; leapMonth: boolean };
}
export interface FortuneInput {
  readingMode?: 'personal' | 'compatibility';
  personA?: BirthProfile;
  topicId?: string;
  spreadId?: string;
  personB?: BirthProfile;
  question: string;
}
export interface Evidence {
  id: string;
  label: string;
  value: unknown;
}
export interface DomainContext {
  domain: DomainId;
  engineVersion: string;
  calculatedAt: string;
  facts: Evidence[];
  limitations: string[];
}
export interface FortuneResult {
  title: string;
  summary: string;
  sections: { title: string; content: string; evidence: string[] }[];
  yeongnyangiComment: string;
  cautions: string[];
}
export interface FortuneLLMRequest {
  maxProviderAttempts?: number;
  maxOutputTokens?: number;
  system: string;
  domainRules: string;
  calculatedData: DomainContext;
  userQuestion: string;
  outputSchema: object;
  sectionTitles: string[];
  promptVersion: string;
}
export interface FortuneLLMResponse {
  usage?: { input: number; output: number };
  result: unknown;
  provider: string;
  model: string;
}
export interface LLMProvider {
  generate(request: FortuneLLMRequest): Promise<FortuneLLMResponse>;
}
export interface CalculationOptions { runtimeEnv?: Record<string, unknown>; asOf?: string; tarotFusion?: boolean; }

export interface FortuneDomain {
  id: DomainId;
  validateInput(input: unknown): FortuneInput;
  calculate(
    input: FortuneInput,
    options?: CalculationOptions,
  ): Promise<DomainContext>;
  buildContext(calculated: DomainContext): DomainContext;
  buildPrompt(
    input: FortuneInput,
    context: DomainContext,
    fish: FishId,
  ): FortuneLLMRequest;
  validateResult(result: unknown, context: DomainContext): FortuneResult;
}
export class FortuneError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
