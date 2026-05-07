# PSI Lighthouse Audit

- URL: https://code-destiny.com
- Enforce Thresholds: false

## Metrics

| Metric | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | 94 | 91 |
| Accessibility | 92 | 92 |
| SEO | 100 | 100 |
| FCP (ms) | 1683 | 385 |
| LCP (ms) | 2551 | 625 |
| CLS | 0.036 | 0.000 |
| TBT (ms) | 159 | 243 |
| Main Thread (ms) | 1977 | 1517 |

## Opportunity Summary

- Mobile unused CSS: Est savings of 13 KiB
- Desktop unused CSS: Est savings of 13 KiB
- Mobile unused JS: Est savings of 57 KiB
- Desktop unused JS: Est savings of 58 KiB
- Mobile render blocking: n/a
- Desktop render blocking: n/a

## Threshold Violations

### Mobile
- LCP 2551ms > 2500ms
- FCP 1683ms > 1000ms

### Desktop
- none

Artifacts: reports\psi-mobile.json, reports\psi-desktop.json