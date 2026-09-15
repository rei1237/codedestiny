import {
  CalculationOptions,
  DomainContext,
  DomainId,
  FortuneDomain,
  FortuneError,
  FortuneInput,
} from "./contracts";
import { validateInput } from "./input";
import { buildPrompt } from "./prompt";
import { validateResult } from "./result";
export function domain(
  id: DomainId,
  rules: string,
  sections: string[],
  calculate: (
    input: FortuneInput,
    options?: CalculationOptions,
  ) => Promise<DomainContext>,
): FortuneDomain {
  return {
    id,
    validateInput: (x) => validateInput(x, id),
    calculate,
    buildContext: (c) => {
      if (
        c.domain !== id ||
        !c.facts.length ||
        new Set(c.facts.map((f) => f.id)).size !== c.facts.length
      )
        throw new FortuneError("INVALID_CONTEXT", 500);
      return c;
    },
    buildPrompt: (i, c, f) => buildPrompt(i, c, f, rules, sections),
    validateResult,
  };
}
export function context(
  id: DomainId,
  facts: Record<string, unknown>,
  limitations: string[] = [],
): DomainContext {
  return {
    domain: id,
    engineVersion: 'code-destiny-integrated-v1',
    calculatedAt: new Date().toISOString(),
    facts: Object.entries(facts)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([label, value]) => ({ id: `${id}.${label}`, label, value })),
    limitations,
  };
}
