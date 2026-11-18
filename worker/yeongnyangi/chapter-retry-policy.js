// Shared by generation and operator diagnostics. Grants never reset attempt history.
export const AUTOMATIC_CHAPTER_ATTEMPTS = 3;
export const SYSTEM_CHAPTER_RETRY_GRANT = 2;
export const MANUAL_CHAPTER_RECOVERY_LIMIT = 3;
// A refusal Gemini never billed (429, 5xx, retired 404; isUnbilledGeminiFailure) hands the chapter attempt back
// this many times per chapter, matching the neo and fusion unbilled retry caps. Timeouts stay billed.
export const UNBILLED_ATTEMPT_RETURNS = 3;
