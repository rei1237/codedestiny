---
status: in-progress
updated: 2026-09-30
next: Verify main CI and staging, then finish independent natal consumers and paid correction delivery
---
# 만세력 계산 수정 인수인계

상세 근거·정책·회귀 범위: [saju-time-contract-20260930.md](../context/saju-time-contract-20260930.md).

검증한 핵심 수정 커밋 `d9c21993a`, main 통합 `35f52ba9d`, 정정 큐 저장 확인 `feb8073d05ef93ce006ca80320fa312f9046c23d`는 main에 push했다. 이후 빈 출생지 placeholder를 명시적 기본 지역으로 처리하고 네오/오늘운세 윤달 전달 누락을 수정했다. 이 문서는 그 후속 변경과 함께 커밋한다.

- Node1928, typecheck, lint, Worker dry-run build 통과. 후속 정정mock6, 네오/오늘운세 Jest61, 네오품질, 시간계약941 통과.
- 기존 check:fast 유료 가드의 실패2개는 토큰 해시 원복, 프롬프트 버전 기대값, correction 모듈 lazy import로 고쳤고 해당 검사는 재통과했다. 전체 최종 판정은 GitHub main CI에서 확인해야 한다.
- 운영 배포/실LLM/운영DB 쓰기/고객 연락 없음. 운영 영향 건수 미조사, 정정 실제 발행0건.
- 아직 전체 해결이 아니다: 독립 animal-destiny/destiny-bias 엔진 옵션 이관, 전체 유료상품 정정과 고객 보관함 연결, 실제 로그인/공유/상담 재시도 E2E, 스테이징 동일 버전 검증이 남았다.
- 포스텔러 공식 https://beta-pro.forceteller.com/ 는 지역별 시차와 DST 보정을 안내하지만 정확한 반올림/자시 정책 전체는 확인되지 않았다. 서울 사례의 일치만 모든 설정의 동등성으로 일반화하지 않는다.

## 재개

작업 디렉터리 `D:\Development\code-destiny`, 문서 `D:\Development\code-destiny\docs\handoff\saju-calculation-fix-20260930.md`, main. 다른 세션의 marketing/next-env/tsconfig 미커밋은 보존한다. 관리 워크트리 `C:\Users\user\.codex\worktrees\saju-time-contract\code-destiny`에는 로컬 mock 브라우저 증거가 build-cache 아래에 있다.

```powershell
Set-Location 'D:\Development\code-destiny'
git status --short
git merge-base --is-ancestor feb8073d05ef93ce006ca80320fa312f9046c23d HEAD
gh run list --branch main --limit 10
Get-Content 'D:\Development\code-destiny\docs\handoff\saju-calculation-fix-20260930.md'
```

다음 행동: 최신 main CI 실패 유무부터 확인하고, 배포된 staging Pages/Worker SHA의 공통 엔진 포함 여부를 확인한다. 프로덕션 승격은 하지 않는다. 후속 계산 경로/정정 UI를 완성하기 전 서비스 전체 해결로 선언하지 않는다.

롤백은 사주 변경 커밋만 역순으로 revert한다. 관련 없는 main 병합 전체를 되돌리지 않는다. 엔진/정책/미러/캐시를 함께 원복하고 원본 주문 및 정정 기록은 삭제하지 않는다.
