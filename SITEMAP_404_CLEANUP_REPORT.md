# Sitemap 404 Cleanup Report

## 1. 작업 요약
- 검증한 sitemap: `https://code-destiny.com/sitemap.xml`
- 총 URL 수: 306
- 정상 URL 수: 306
- redirect URL 수: 0
- 404 URL 수: 0
- 제거한 URL 수: 1
- 복구한 URL 수: 0
- redirect 추가 URL 수: 0
- 보류 URL 수: 1

## 2. 제거한 URL
| URL | 제거 이유 | 관련 파일 |
|---|---|---|
| `https://code-destiny.com/account/delete/` | 계정 액션 안내 페이지로 공개 도움말 접근은 유지하되 sitemap/index 대상에서는 제외 | `scripts/generate-sitemap.mjs`, `app/account/delete/page.js`, `public/_headers` |

## 3. 복구한 URL
| URL | 원인 | 수정 내용 |
|---|---|---|
| 없음 | - | - |

## 4. redirect 추가 URL
| 기존 URL | 새 URL | redirect 유형 | 이유 |
|---|---|---|---|
| 없음 | - | - | - |

## 5. 보류 URL
| URL | 보류 이유 | 필요한 확인 |
|---|---|---|
| `https://code-destiny.com/sitemap-insights.xml` | 메인 sitemap 범위 밖, robots 미선언, 운영에서는 404 | 별도 insight sitemap을 실제 운영에 다시 노출할 필요가 있는지 정책 확인 필요 |

## 6. 수정한 파일
| 파일 | 변경 이유 |
|---|---|
| `scripts/generate-sitemap.mjs` | exact-match noindex 누락 방지, `/account/delete/` 제외 |
| `lib/seo-site-urls.ts` | public indexable route registry에서 비색인 경로 제거 |
| `lib/seo/siteSeo.ts` | 공통 noindex 판정과 `_headers` 정책 정렬 |
| `app/account/delete/page.js` | 계정 삭제 안내 페이지를 noindex, nofollow로 전환 |
| `public/_headers` | `/account/delete` 응답에 `X-Robots-Tag: noindex, nofollow` 추가 |
| `scripts/verify-sitemap-integrity.mjs` | sitemap 무결성 및 선택적 live 상태 검증 스크립트 추가 |
| `package.json` | `verify:sitemap` 스크립트 추가 |
| `SITEMAP_404_AUDIT.md` | 감사 근거 기록 |
| `SITEMAP_404_CLEANUP_REPORT.md` | 정리 결과 기록 |

## 7. 테스트 결과
- lint: 통과 (`next lint`, 기존 경고 다수 유지)
- typecheck: 실패, 기존 오류 `app/_lib/use-content-unlock.ts(76,14) Property 'degraded' does not exist on type '{ unlockMap: { [x: string]: boolean; }; }'`
- build: 실패, 기존/환경성 검증 실패 `verify:runtime-cache-sync`에서 `js/sibyl-system.js != public/js/sibyl-system.js`
- sitemap 검증:
  - 로컬 `node scripts/verify-sitemap-integrity.mjs` 통과
  - 로컬 생성 sitemap `306` URL
  - 운영 `node scripts/verify-sitemap-integrity.mjs --live` 결과: 운영 sitemap `307` URL 모두 `200`, `sitemap-insights.xml`은 `404`, 단 아직 배포 전이라 live/local drift로 실패
- 내부 링크 검증: `/account/delete` 내부 링크 유지, 추가 404 링크 수정 없음

## 8. SEO 영향
- sitemap에서 제거된 URL:
  - `/account/delete/`
- 검색 유입 영향 가능성:
  - 계정 삭제 안내 페이지는 검색 유입보다 계정 액션 안내 성격이 강해 영향은 낮음
- redirect로 보존한 URL:
  - 없음
- Search Console 제출 필요 여부:
  - 배포 후 sitemap URL 수가 `307 -> 306`으로 바뀌므로 재제출 권장

## 9. 남은 리스크
- 확인 불가 URL:
  - preview URL 확인 필요
- 운영에서만 확인 가능한 항목:
  - 최종 배포 후 live robots/meta 반영 여부
  - 현재 운영 sitemap에는 아직 `/account/delete/`가 남아 있음
- 후속 작업:
  - 배포 후 `node scripts/verify-sitemap-integrity.mjs --live` 재실행
  - 기존 `typecheck`/`build` 실패 원인 별도 정리 필요
