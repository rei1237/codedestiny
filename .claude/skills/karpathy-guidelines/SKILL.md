---
name: karpathy-guidelines
description: Behavioral guidelines to reduce common LLM coding mistakes. Use when writing, reviewing, or refactoring code to avoid overcomplication, make surgical changes, surface assumptions, and define verifiable success criteria.
license: MIT
---

# Karpathy Guidelines

Behavioral guidelines to reduce common LLM coding mistakes, derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## Project Adaptation (Code Destiny)

This repo (`codedestiny-main`, Next.js 15 + Cloudflare Pages/Workers) already encodes these four principles natively in its root `CLAUDE.md` (Korean, section "코딩 원칙"). When both files are present, `CLAUDE.md` is the authoritative, project-tuned version — treat this skill file as the origin/reference, not a second source of truth to merge from.

Repo-specific overrides that sharpen the generic rules below:

- **Rule 1 (Think Before Coding)** → for this repo, changes of 5+ lines require stating a short plan (`단계 → 검증 방법`) before editing, per `CLAUDE.md` Workflow section.
- **Rule 4 (Goal-Driven Execution)** → "verify" here usually means running the relevant `npm run verify:*` script (billing/AI/i18n/security regression), not just ad-hoc tests. Run `lint` → `typecheck` → the matching `verify:*` script after coding, then stage only the changed files.
- **All user-facing text** (explanations, proposed choices, root-cause reports) must be in Korean regardless of this file's English wording — see `CLAUDE.md` rule 5 and the `korean-reporting` memory. This skill's guidance governs *how you code*, not *what language you report in*.
- **Search discipline**: before applying "Simplicity First" or "Surgical Changes," narrow scope by exact keyword first (function/route/error string) per `CLAUDE.md`'s "검색 & 수정 원칙" — don't sweep the whole repo unless asked.
- **Forbidden paths** (`.wrangler/`, `worker/wrangler.toml`, `package-lock.json`, `.env*`, `dist/`, `out/`) are never in scope for "surgical changes," even if they look adjacent to the edit.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
