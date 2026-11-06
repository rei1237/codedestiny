# 검증용 천문 라이브러리 원장 · 통합 트리 추가분

2026-11-07 KST. 기존 감사 트리의 Phase 1 원장은 `c6ec06f2fa210ae63724d022fad58120a055c2db:docs/engine-audit/01-license-ledger.md`에 있다.

| 패키지 | 고정 버전 · upstream SHA | SPDX | 설치 후 확인 경로 | 전이 의존성 |
| --- | --- | --- | --- | --- |
| `astronomy-engine` | `2.1.19` · `61dc07020aaa6885d2c7f688a4d82beaf6edb9ef` | MIT | `tools/oracle/ephemeris-candidate/node_modules/astronomy-engine/package.json` 및 `esm/astronomy.js` 상단 MIT 라이선스 전문 | 0개, 설치 스크립트 0개 |

npm 레지스트리의 배포 gitHead와 upstream `v2.1.19^{}`를 대조했다. 검증 디렉터리에서 설치 전 잠금 파일 검사를 통과한 후 `npm ci --prefix tools/oracle/ephemeris-candidate --ignore-scripts --no-audit --no-fund`를 실행했다. 설치된 패키지는 위 1개다. tarball SHA-512는 잠금 파일에 고정했고 설치 ESM의 SHA-256은 `068f1445ed0c636c94818fe6d20d7d125120e605e0bab9fc4675c3d531be5ad7`이다. 운영 package.json·잠금 파일에는 항목을 추가하지 않았다. JPL·IMD로부터는 관측 숫자만 조회했다.
