# PSI Lighthouse Audit

- URL: https://code-destiny.com
- Enforce Thresholds: false

## Metrics

| Metric | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | 90 | 38 |
| Accessibility | 92 | 92 |
| SEO | 100 | 100 |
| FCP (ms) | 1689 | 1265 |
| LCP (ms) | 2476 | 2302 |
| CLS | 0.036 | 0.198 |
| TBT (ms) | 300 | 2723 |
| Main Thread (ms) | 2463 | 10621 |

## Opportunity Summary

- Mobile unused CSS: Est savings of 13 KiB
- Desktop unused CSS: n/a
- Mobile unused JS: Est savings of 57 KiB
- Desktop unused JS: Est savings of 147 KiB
- Mobile render blocking: n/a
- Desktop render blocking: n/a

## Threshold Violations

### Mobile
- FCP 1689ms > 1000ms

### Desktop
- Performance 38 < 80
- TBT 2723ms > 300ms
- CLS 0.198 > 0.1
- FCP 1265ms > 1000ms

Artifacts: reports\psi-mobile.json, reports\psi-desktop.json