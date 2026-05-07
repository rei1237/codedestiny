# PSI Lighthouse Audit

- URL: https://code-destiny.com
- Enforce Thresholds: false

## Metrics

| Metric | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | 70 | 31 |
| Accessibility | 90 | 90 |
| SEO | 100 | 100 |
| FCP (ms) | 2642 | 514 |
| LCP (ms) | 4360 | 1421 |
| CLS | 0.000 | 1.104 |
| TBT (ms) | 345 | 7587 |
| Main Thread (ms) | 2760 | 16531 |

## Opportunity Summary

- Mobile unused CSS: Est savings of 109 KiB
- Desktop unused CSS: Est savings of 120 KiB
- Mobile unused JS: Est savings of 57 KiB
- Desktop unused JS: Est savings of 57 KiB
- Mobile render blocking: n/a
- Desktop render blocking: n/a

## Threshold Violations

### Mobile
- Performance 70 < 80
- TBT 345ms > 300ms
- LCP 4360ms > 2500ms
- FCP 2642ms > 1000ms

### Desktop
- Performance 31 < 80
- TBT 7587ms > 300ms
- CLS 1.104 > 0.1

Artifacts: reports\psi-rerun\psi-mobile.json, reports\psi-rerun\psi-desktop.json