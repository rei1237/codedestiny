# PSI Lighthouse Audit

- URL: https://code-destiny.com
- Enforce Thresholds: false

## Metrics

| Metric | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | 83 | 35 |
| Accessibility | 92 | 92 |
| SEO | 100 | 100 |
| FCP (ms) | 1697 | 408 |
| LCP (ms) | 2476 | 2523 |
| CLS | 0.036 | 0.233 |
| TBT (ms) | 546 | 3274 |
| Main Thread (ms) | 3854 | 9264 |

## Opportunity Summary

- Mobile unused CSS: Est savings of 13 KiB
- Desktop unused CSS: Est savings of 292 KiB
- Mobile unused JS: Est savings of 57 KiB
- Desktop unused JS: Est savings of 57 KiB
- Mobile render blocking: n/a
- Desktop render blocking: n/a

## Threshold Violations

### Mobile
- TBT 546ms > 300ms
- FCP 1697ms > 1000ms

### Desktop
- Performance 35 < 80
- TBT 3274ms > 300ms
- CLS 0.233 > 0.1
- LCP 2523ms > 2500ms

Artifacts: reports\psi-mobile.json, reports\psi-desktop.json