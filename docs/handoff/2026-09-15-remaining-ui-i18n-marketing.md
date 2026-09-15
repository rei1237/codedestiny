---
status: active
updated: 2026-09-15
next: "현재 main과 다른 세션 변경을 확인한 뒤 헤더·상세창·운세 로케일의 실제 화면 검수부터 진행한다."
---

# 남은 작업 인수인계: UI → 번역 → 마케팅

## 기준과 완료한 일

- 작업 디렉터리: `D:\Development\code-destiny`. 작성 기준 main: `530c79813017d660b8c5d6fcf0b96109682358f4`. 시작할 때 최신 HEAD/원격과 CI를 다시 확인한다.
- 이용권 환급 재작업과 과거 워크트리 5개 정리는 완료했다. [정리 기록](2026-09-15-worktree-reconciliation.md). 같은 작업을 재구현하지 않는다.
- **구 소설과 라이트 노벨은 별개다.** 구 소설 산문 코드 35개(`lib/stories/chapters/*` 32개, `data.ts`, `types.ts`, `metrics.ts`)는 폐기했다. 라이트 노벨 원본 `content/novel`, `lib/stories/vn`, `/stories/` 텍스트 리더, `public/codedestiny-novel.html` 플레이어와 번역 도구는 유지한다. 파일명의 novel만 보고 삭제하지 않는다.

## 1. 실제 UI 검수

- [ ] 헤더: light/neo 테마, 로그인 전후·이용권 배지, 모바일/데스크톱에서 대비와 넘침을 확인한다. 현행 인증 스타일을 기준으로 재현한 결함만 수정한다.
- [ ] 프리미엄 상세창: CSS/데이터 지연, 재진입, 실패·재시도에서 깜빡임을 확인한다. 소개·공유·기존 CTA를 유지한다. 옛 레이아웃 패치를 복원하지 않는다.
- [ ] 운세: en/ja/zh-CN/zh-TW × today/tomorrow/weekly/monthly의 실제 화면과 문장을 검수한다. 한국어 폴백·언어 혼입·기간별 내용 불일치가 없어야 한다.
- 정본: `app/fortune/[period]/[sign]/SignFortuneView.tsx`, `lib/fortune/localized-evidence.ts`, `lib/fortune/localization.ts`. 상세창 13개 검사와 운세 24별자리×4기간×4언어 구조 검사는 통과했지만 실제 브라우저 검수는 미완료다.

## 2. 라이트 노벨 번역

- [ ] `content/novel/translations`: en 39개, zh-CN 39개, zh-TW 2,544개 누락. ja 8,932개는 구조만 완전하며 의미·화자·고유명사 검수는 남았다. 시작할 때 원문 해시와 개수를 재계산한다.
- 영어 재개 첫 요청이 HTTP 429로 중단됐다. 제한 해소 후 아래 명령을 로케일별 순차 실행한다. 첫 429에서 즉시 중단하고 진행분을 보존한다. 유료 API로 대체하거나 반복 재시도하지 않는다.

```powershell
node scripts/translate-novel.mjs --locale=en
node scripts/translate-novel.mjs --locale=zh-CN
node scripts/translate-novel.mjs --locale=zh-TW
node scripts/verify-novel-locale-completeness.mjs
```

- [ ] 모든 번역의 완성도·편집 검수 후 현재 `scripts/build-novel-runtime.mjs`와 플레이어에 필요한 최소 로케일 연결을 구현한다. 현재 초안은 플레이어에 연결되지 않았다. 옛 빌더/public 패치를 일괄 복구하지 않는다. 미완성 번역 공개와 검사 완화 금지.

## 3. 마케팅 원본 후속 검수

- [ ] `marketing/README.md`와 게시 기록을 기준으로 재사용할 콘텐츠의 현재 링크·가격·날짜 문구 및 이미지/영상을 검수한다. 352개 이미지 메타데이터 확인은 시각 검수나 영상 재생 검증이 아니다.
- 과거 일정과 `marketing/HANDOFF.md`는 이력이다. 자동 재개·외부 게시하지 않는다. WebP 원본과 JPG 전달본은 용도가 다르다.

## 실행·완료 기준

- 시작 시 다른 세션의 `package.json`, `scripts/verify-palm-mobile-payment-recovery.mjs` 변경을 보존한다. 현재 상태를 다시 확인하고 동시 작업이면 안전 워크트리로 격리한다.
- 필요한 변경만 `npm run check:fast -- --plan` → `npm run check:fast` → 작업별 커밋 → main 통합/push → 해당 SHA의 `CI required` 성공 확인. 임시 워크트리는 공유 정션을 분리한 뒤 정리한다.
- 실제 화면 증거·검증 결과·남은 외부 제한을 구분해 기록한다. 가격/결제 정책 변경, 실결제·유료 LLM·운영 DB 수정·운영 배포는 범위 밖이다.

## 구 소설 삭제 검증

- 소스·테스트·검증기·public 코드에서 삭제 경로/심볼 참조 없음. `verify-novel-runtime`, `verify-story-text-sync`, `verify-novel-player-start`, `typecheck`, `verify-handoff-contract` 통과.
- `check:fast -- --plan` 확인 후 `check:fast` 실행: 결제 게이트 87/88 통과(`npm test` 포함). 나머지 해외결제 안내 검사는 미스테이징 삭제 파일을 `git ls-files`로 읽어 실패했으며, 삭제를 스테이징한 뒤 동일 검사 재실행 통과. 전체 check:fast 후속 단계가 실행됐다고 해석하지 않는다. 최종 공식 게이트는 해당 main 커밋의 CI다.
