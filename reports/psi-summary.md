# PSI Lighthouse Audit

- URL: https://code-destiny.com
- Enforce Thresholds: false

## Metrics

| Metric | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | 52 | 37 |
| Accessibility | 94 | 94 |
| SEO | 100 | 100 |
| FCP (ms) | 6629 | 2908 |
| LCP (ms) | 7829 | 3888 |
| CLS | 0.166 | 0.055 |
| TBT (ms) | 103 | 661 |
| Main Thread (ms) | 12073 | 12669 |

## Opportunity Summary

- Mobile unused CSS: Est savings of 318 KiB
- Desktop unused CSS: Est savings of 156 KiB
- Mobile unused JS: Est savings of 247 KiB
- Desktop unused JS: Est savings of 489 KiB
- Mobile render blocking: n/a
- Desktop render blocking: n/a

## Threshold Violations

### Mobile
- Performance 52 < 80
- CLS 0.166 > 0.1
- LCP 7829ms > 2500ms
- FCP 6629ms > 1000ms

### Desktop
- Performance 37 < 80
- TBT 661ms > 300ms
- LCP 3888ms > 2500ms
- FCP 2908ms > 1000ms

Artifacts: reports\psi-mobile.json, reports\psi-desktop.json