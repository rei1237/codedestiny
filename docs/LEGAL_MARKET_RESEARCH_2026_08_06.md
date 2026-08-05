# Legal market research snapshot - 2026-08-06

This is a launch-blocking research snapshot for Code Destiny internationalization and payment localization. It is not legal advice and it is not a published customer legal document.

Product boundary for this snapshot:

- Current paid access terms remain `이용권`, `월정석`, and `단건 결제`.
- Current service does not provide an approved auto-renewing subscription, free trial to paid conversion, or subscription-cancellation right.
- AI output locale support remains the existing five locales only: `ko`, `en`, `ja`, `zh-CN`, `zh-TW`.
- Every non-approved market remains blocked for live payment.

## Locale Matrix

| locale | Language | Script | Key baseline | Missing keys | Fallbacks | UI support | AI output | RTL | Review status |
|---|---|---:|---:|---:|---:|---|---|---|---|
| ko | Korean | Hangul | existing runtime baseline | existing check required | no Korean fallback issue for source locale | yes | yes | no | source review required |
| en | English | Latin | parity enforced by i18n check | existing check required | must not fall back to Korean | yes | yes | no | native/legal review required |
| ja | Japanese | Kana/Kanji | parity enforced by i18n check | existing check required | must not fall back to Korean | yes | yes | no | native/legal review required |
| zh-CN | Chinese Simplified | Han Simplified | parity enforced by i18n check | existing check required | must not fall back to Korean | yes | yes | no | native/legal review required |
| zh-TW | Chinese Traditional | Han Traditional | parity enforced by i18n check | existing check required | must not fall back to Korean | yes | yes | no | native/legal review required |
| vi | Vietnamese | Latin | parity enforced by i18n check | existing check required | must not imply Vietnam market | yes | no | no | native review required |
| hi | Hindi | Devanagari | parity enforced by i18n check | existing check required | must not imply India market | yes | no | no | native review required |
| es | Spanish | Latin | parity enforced by i18n check | existing check required | must not imply Spain/LatAm market | yes | no | no | native review required |
| fr | French | Latin | parity enforced by i18n check | existing check required | must not imply France/Canada market | yes | no | no | native review required |
| de | German | Latin | parity enforced by i18n check | existing check required | must not imply Germany/EU market | yes | no | no | native review required |
| nl | Dutch | Latin | parity enforced by i18n check | existing check required | must not imply Netherlands/EU market | yes | no | no | native review required |
| ms | Malay | Latin | parity enforced by i18n check | existing check required | must not imply Malaysia/Singapore market | yes | no | no | native review required |

## Market Matrix

| marketCode | Target market | Allowed locales | Law candidates | Settlement currency | Tax mode | Payment methods | One-time payment | Monthly credit | Refund/privacy/legal status | Launch |
|---|---|---|---|---|---|---|---|---|---|---|
| KR | Republic of Korea | ko, en, ja, zh-CN, zh-TW | E-Commerce Act, Content Industry Promotion Act, PIPA | KRW | VAT/electronic commerce review | PortOne KG Inicis current | possible after approval | current non-auto-renewal monthly-credit model only | legal review required | blocked until approved |
| JP | Japan | ja, en | Act on Specified Commercial Transactions, Consumer Contract Act, APPI, Consumption Tax | JPY | consumption tax/digital service review | PG/MoR unconfirmed | draft only | no auto-renewal enabled | legal/native review required | disabled |
| US | United States | en | FTC Act, state consumer laws, CA ARL if applicable, state privacy laws | USD | sales tax/digital goods by state | PG/MoR unconfirmed | draft only | no auto-renewal enabled | federal/state legal review required | disabled |
| EU | EU/EEA | en, fr, de, es, nl | Consumer Rights Directive, GDPR, ePrivacy/cookie rules, VAT OSS | EUR | VAT MOSS/OSS and member-state rules | PG/MoR unconfirmed | draft only | no auto-renewal enabled | EU plus member-state review required | disabled |
| GB | United Kingdom | en | Consumer Contracts Regulations, UK GDPR/DPA, DMCC Act | GBP | VAT digital services | PG/MoR unconfirmed | draft only | no auto-renewal enabled | legal/native review required | disabled |
| CA | Canada | en, fr | PIPEDA, provincial consumer/privacy laws, GST/HST digital economy | CAD | GST/HST/PST/QST review | PG/MoR unconfirmed | draft only | no auto-renewal enabled | federal/provincial review required | disabled |
| AU | Australia | en | Australian Consumer Law, Privacy Act, GST imported services/digital products | AUD | GST | PG/MoR unconfirmed | draft only | no auto-renewal enabled | legal/native review required | disabled |
| NZ | New Zealand | en | Fair Trading/Consumer Guarantees review, Privacy Act, GST remote services | NZD | GST | PG/MoR unconfirmed | draft only | no auto-renewal enabled | legal/native review required | disabled |
| SG | Singapore | en, zh-CN, ms | Consumer Protection Fair Trading Act, PDPA, GST OVR | SGD | GST OVR | PG/MoR unconfirmed | draft only | no auto-renewal enabled | legal/native review required | disabled |
| TW | Taiwan | zh-TW, en | Consumer Protection Act, Personal Data Protection Act, VAT cross-border e-services | TWD | VAT/e-invoice review | PG/MoR unconfirmed | draft only | no auto-renewal enabled | legal/native review required | disabled |
| HK | Hong Kong | zh-TW, en | Trade Descriptions Ordinance, PDPO, e-commerce consumer rules | HKD | no broad VAT/GST; profits tax review | PG/MoR unconfirmed | draft only | no auto-renewal enabled | legal/native review required | disabled |
| CN | Mainland China | zh-CN | Consumer Rights Protection Law/regulations, PIPL, Cyber/Data/Security review, VAT | CNY | VAT/cross-border service review | PG/MoR unconfirmed | draft only | no auto-renewal enabled | legal/data/export review required | disabled |

## Official-source anchors captured in legal packs

The registry stores official URLs per market in `lib/market-policy/legal-packs/legal-market-packs.js`. Source categories include:

- Statutes or official legal databases.
- Government consumer, privacy, tax, and data-transfer regulators.
- Payment-provider support remains `UNCONFIRMED` until the active PG or Merchant of Record path is selected and verified.

## Launch blocker rules

A market remains blocked if any item is true:

- no legal pack;
- legal pack is not `LEGAL_APPROVED`;
- privacy, refund, digital-content, international-transfer, tax, business-disclosure, age, or payment notice review is incomplete;
- payment processor and settlement currency are unconfirmed;
- required native review is incomplete;
- locale translation completeness checks fail;
- current service capability would be misrepresented, including invented subscription-cancellation or auto-renewal rights.
