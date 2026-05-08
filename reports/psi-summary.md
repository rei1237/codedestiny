# PSI Lighthouse Audit

- URL: https://code-destiny.com
- Enforce Thresholds: false

## Metrics

| Metric | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | 83 | 32 |
| Accessibility | 91 | 91 |
| SEO | 100 | 100 |
| FCP (ms) | 2101 | 710 |
| LCP (ms) | 3001 | 1225 |
| CLS | 0.176 | 1.189 |
| TBT (ms) | 34 | 12817 |
| Main Thread (ms) | 2776 | 28726 |

## Opportunity Summary

- Mobile unused CSS: Est savings of 109 KiB
- Desktop unused CSS: n/a
- Mobile unused JS: Est savings of 59 KiB
- Desktop unused JS: Est savings of 222 KiB
- Mobile render blocking: n/a
- Desktop render blocking: n/a

## Threshold Violations

### Mobile
- CLS 0.176 > 0.1
- LCP 3001ms > 2500ms
- FCP 2101ms > 1000ms

### Desktop
- Performance 32 < 80
- TBT 12817ms > 300ms
- CLS 1.189 > 0.1

Artifacts: reports\psi-mobile.json, reports\psi-desktop.json