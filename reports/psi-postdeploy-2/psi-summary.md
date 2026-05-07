# PSI Lighthouse Audit

- URL: https://code-destiny.com
- Enforce Thresholds: false

## Metrics

| Metric | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | 89 | 54 |
| Accessibility | 90 | 93 |
| SEO | 100 | 100 |
| FCP (ms) | 1718 | 391 |
| LCP (ms) | 2551 | 763 |
| CLS | 0.036 | 0.171 |
| TBT (ms) | 303 | 1976 |
| Main Thread (ms) | 2501 | 6267 |

## Opportunity Summary

- Mobile unused CSS: Est savings of 13 KiB
- Desktop unused CSS: Est savings of 292 KiB
- Mobile unused JS: Est savings of 57 KiB
- Desktop unused JS: Est savings of 386 KiB
- Mobile render blocking: n/a
- Desktop render blocking: n/a

## Threshold Violations

### Mobile
- TBT 303ms > 300ms
- LCP 2551ms > 2500ms
- FCP 1718ms > 1000ms

### Desktop
- Performance 54 < 80
- TBT 1976ms > 300ms
- CLS 0.171 > 0.1

Artifacts: reports\psi-postdeploy-2\psi-mobile.json, reports\psi-postdeploy-2\psi-desktop.json