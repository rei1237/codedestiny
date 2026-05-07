# PSI Lighthouse Audit

- URL: https://code-destiny.com
- Enforce Thresholds: false

## Metrics

| Metric | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | 80 | 81 |
| Accessibility | 92 | 92 |
| SEO | 100 | 100 |
| FCP (ms) | 1695 | 502 |
| LCP (ms) | 3162 | 743 |
| CLS | 0.036 | 0.000 |
| TBT (ms) | 462 | 389 |
| Main Thread (ms) | 2444 | 2086 |

## Opportunity Summary

- Mobile unused CSS: Est savings of 13 KiB
- Desktop unused CSS: Est savings of 13 KiB
- Mobile unused JS: Est savings of 57 KiB
- Desktop unused JS: Est savings of 57 KiB
- Mobile render blocking: n/a
- Desktop render blocking: n/a

## Threshold Violations

### Mobile
- TBT 462ms > 300ms
- LCP 3162ms > 2500ms
- FCP 1695ms > 1000ms

### Desktop
- TBT 389ms > 300ms

Artifacts: reports\psi-mobile.json, reports\psi-desktop.json