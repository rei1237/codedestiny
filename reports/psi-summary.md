# PSI Lighthouse Audit

- URL: https://code-destiny.com
- Enforce Thresholds: false

## Metrics

| Metric | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | 74 | 34 |
| Accessibility | 90 | 90 |
| SEO | 100 | 100 |
| FCP (ms) | 2101 | 536 |
| LCP (ms) | 4347 | 1020 |
| CLS | 0.000 | 1.293 |
| TBT (ms) | 338 | 7117 |
| Main Thread (ms) | 2688 | 16590 |

## Opportunity Summary

- Mobile unused CSS: Est savings of 109 KiB
- Desktop unused CSS: Est savings of 292 KiB
- Mobile unused JS: Est savings of 57 KiB
- Desktop unused JS: Est savings of 56 KiB
- Mobile render blocking: n/a
- Desktop render blocking: n/a

## Threshold Violations

### Mobile
- Performance 74 < 80
- TBT 338ms > 300ms
- LCP 4347ms > 2500ms
- FCP 2101ms > 1000ms

### Desktop
- Performance 34 < 80
- TBT 7117ms > 300ms
- CLS 1.293 > 0.1

Artifacts: reports\psi-mobile.json, reports\psi-desktop.json