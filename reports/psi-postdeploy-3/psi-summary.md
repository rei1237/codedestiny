# PSI Lighthouse Audit

- URL: https://code-destiny.com
- Enforce Thresholds: false

## Metrics

| Metric | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | 96 | 52 |
| Accessibility | 92 | 92 |
| SEO | 100 | 100 |
| FCP (ms) | 1679 | 535 |
| LCP (ms) | 2476 | 819 |
| CLS | 0.036 | 0.170 |
| TBT (ms) | 73 | 6370 |
| Main Thread (ms) | 1550 | 15149 |

## Opportunity Summary

- Mobile unused CSS: Est savings of 13 KiB
- Desktop unused CSS: Est savings of 290 KiB
- Mobile unused JS: Est savings of 57 KiB
- Desktop unused JS: Est savings of 97 KiB
- Mobile render blocking: n/a
- Desktop render blocking: n/a

## Threshold Violations

### Mobile
- FCP 1679ms > 1000ms

### Desktop
- Performance 52 < 80
- TBT 6370ms > 300ms
- CLS 0.170 > 0.1

Artifacts: reports\psi-mobile.json, reports\psi-desktop.json