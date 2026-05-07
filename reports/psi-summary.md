# PSI Lighthouse Audit

- URL: https://code-destiny.com
- Enforce Thresholds: false

## Metrics

| Metric | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | 90 | 27 |
| Accessibility | 90 | 90 |
| SEO | 100 | 100 |
| FCP (ms) | 2101 | 491 |
| LCP (ms) | 3001 | 1962 |
| CLS | 0.091 | 1.293 |
| TBT (ms) | 75 | 5861 |
| Main Thread (ms) | 2645 | 13469 |

## Opportunity Summary

- Mobile unused CSS: Est savings of 109 KiB
- Desktop unused CSS: Est savings of 121 KiB
- Mobile unused JS: Est savings of 57 KiB
- Desktop unused JS: Est savings of 57 KiB
- Mobile render blocking: n/a
- Desktop render blocking: n/a

## Threshold Violations

### Mobile
- LCP 3001ms > 2500ms
- FCP 2101ms > 1000ms

### Desktop
- Performance 27 < 80
- TBT 5861ms > 300ms
- CLS 1.293 > 0.1

Artifacts: reports\psi-mobile.json, reports\psi-desktop.json