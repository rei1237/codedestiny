# PSI Lighthouse Audit

- URL: https://code-destiny.com
- Enforce Thresholds: false

## Metrics

| Metric | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | 90 | 37 |
| Accessibility | 87 | 93 |
| SEO | 100 | 100 |
| FCP (ms) | 2029 | 1378 |
| LCP (ms) | 2995 | 2574 |
| CLS | 0.000 | 0.165 |
| TBT (ms) | 64 | 2525 |
| Main Thread (ms) | 2630 | 10423 |

## Opportunity Summary

- Mobile unused CSS: Est savings of 12 KiB
- Desktop unused CSS: n/a
- Mobile unused JS: Est savings of 57 KiB
- Desktop unused JS: n/a
- Mobile render blocking: n/a
- Desktop render blocking: n/a

## Threshold Violations

### Mobile
- LCP 2995ms > 2500ms
- FCP 2029ms > 1000ms
- Accessibility 87 < 90

### Desktop
- Performance 37 < 80
- TBT 2525ms > 300ms
- CLS 0.165 > 0.1
- LCP 2574ms > 2500ms
- FCP 1378ms > 1000ms

Artifacts: reports\psi-mobile.json, reports\psi-desktop.json