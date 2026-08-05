# International Market Localization

Last updated: 2026-08-06

## Fixed Product Boundary

Code Destiny currently uses these paid access terms:

- `PASS`: user-facing `이용권`
- `MONTHLY_CREDIT`: user-facing `월정석`
- `ONE_TIME`: user-facing `단건 결제`

Do not describe the current service as an auto-renewing subscription unless the
payment, billing, renewal, cancellation, consent, and legal pack implementation
has been separately built and approved.

The current international legal draft must not promise:

- subscription cancellation rights for a subscription product that does not exist
- free trial conversion handling for a flow that does not exist
- automatic renewal cancellation for a flow that does not exist
- unlimited, lifetime, guaranteed, or outcome-guaranteed access

## Locale Separation

`languageLocale` controls UI language and AI output language. It must not decide:

- `marketCode`
- `billingCountry`
- `paymentCountry`
- `taxCountry`
- `residenceCountry`
- `legalJurisdiction`
- `settlementCurrency`
- refund or withdrawal rights
- international transfer notices

AI output remains limited to the existing five locales:

- `ko`
- `en`
- `ja`
- `zh-CN`
- `zh-TW`

The 12 UI runtime locales are separate and do not expand AI output by themselves.

## Market Policy Registry

The market registry lives in:

- `lib/market-policy/market-policy-registry.js`
- `lib/market-policy/context.js`
- `lib/market-policy/legal-packs/legal-market-packs.js`

Only `KR` represents the current domestic service shape. Every overseas market
is disabled until local legal, tax, payment processor, privacy transfer, refund,
minor, and native-language review is complete.

Even `KR` is not marked as legal-approved for the new international pack format
until current Korean documents are migrated into a reviewed legal pack.

## Country Resolution

Use this order for commerce market resolution:

1. User-selected country or region before payment
2. PG-verified billing country
3. Account country
4. IP country as a hint only
5. Ask the user before payment if unresolved

Do not use GPS, current device location, or birth place for commerce or legal
jurisdiction decisions.

`birthPlace`, `birthCountry`, latitude, and longitude are fortune-calculation
inputs only.

## Legal Market Packs

Legal market packs are draft metadata, not publishable legal documents. Each pack
must keep:

- market code
- jurisdiction
- document types
- language locale
- version
- researched date
- source URLs
- review status
- translation review status
- publication gate

Legal documents are not machine-translation deliverables. They must be localized
from official law, government, regulator, tax authority, privacy authority, and
payment processor sources, then reviewed by native and legal reviewers before
publication or live payment use.

## Launch Gate

Live payment must remain blocked if any of these is true:

- market is disabled
- legal pack is missing
- legal pack is not `LEGAL_APPROVED`
- privacy pack is not approved
- refund pack is not approved
- tax mode is unresolved
- payment processor support is unconfirmed
- settlement currency is unsupported
- required translations are missing
- business notice is missing
- subscription or auto-renewal copy is present without actual product support

## Validation

Run:

```bash
npm run verify:market-policy-registry
npm run verify:ai-locale-pipeline
node scripts/i18n-check.mjs
```

All LLM validation must use mocks. Do not run real LLM, real PG, production DB,
or production deployment for this localization work without a separate explicit
approval.
