# 일 스타일 리포트와 검색 문구 로컬 검증 결과

검증일: 2026-10-28 KST. 기준 커밋: `1c8f19fac3772dfbd9faebd656292d6a9f5eb4cc`.
결과: 로컬 mock 서버의 대표 15페이지, FAQ 본문·구조화 데이터 67쌍, 대표 내부 링크 7개 통과. 제품 코드 수정 없음.

## 확인한 범위

| 대상 | 확인 결과 |
|---|---|
| `/`, `/faq/` | 서버 HTML의 제목·설명·단일 H1·self-canonical·사이트맵·색인 허용, FAQ 9쌍·21쌍의 질문과 답변이 본문에 모두 존재. FAQ에서 네오사주·사주 성지 문구 확인. |
| `/psychotest/`, `/human-design/guide/`, `/saju/career-style/` | 같은 공개 메타·색인 검사와 기능별 핵심 본문 확인. 휴먼 디자인 FAQ 5쌍 일치. 일 스타일의 프로필·결제·후기·공유 안내 확인. |
| `/fortune/{today,tomorrow,weekly,monthly}/{rat,aries}/` | 기간 4종 × 띠·별자리 각 1종, 8페이지 모두 200. 각 4쌍의 FAQ가 실제 본문과 일치. 기간·대상별 title·description·canonical을 JSON에 기록. |
| `/human-design/report/`, `/fortune/share/` | 200 응답과 `noindex`, 사이트맵 제외 유지. 개인 결과나 유료 본문을 생성·열람하지 않음. |
| 내부 링크 | 실제 HTML에 있는 `/`, `/saju/`, `/faq/`, `/human-design/`, `/human-design/guide/`, `/saju/career-style/`, `/fortune/today/` 7개 목적지의 200 응답 확인. 전체 링크 목적지 검사는 아님. |
| 기타 | JSON-LD 파싱, 있는 hreflang 주소의 자사 origin 확인, 링크에 개발용 주소·javascript URL이 없는지 검사. hreflang 언어별 역방향 링크의 전수 검사는 아님. |

상세 값: [career-discovery-html-20261028.json](career-discovery-html-20261028.json).

본문 검사는 JavaScript를 실행하지 않고 HTTP 응답을 파싱했다. 접힌 FAQ도 서버 HTML에 존재하는지 확인했다. 이는 개발 서버의 렌더 검증이며, 배포 빌드·크롤러 색인·검색 순위·운영 계정 검증은 아니다.

## 실행과 초기 실패 원인

1. 격리 작업 폴더에서 `MOCK_DEV_PORT=23840`, `MOCK_DEV_API_PORT=23841`로 `npm run dev`를 실행했다. 외부 Node/browser API 요청을 차단하는 기존 mock 설정을 사용했다.
2. 제한 실행 환경의 localhost 연결은 EACCES·ETIMEDOUT으로 실패했다. mock 설정을 유지한 권한 있는 로컬 실행에서 서버와 검사기를 재시작해 연결했다.
3. 최초 띠 페이지 요청은 500이었다. 오류 로그의 원인은 격리 폴더에 `fortune/data/daily-2026-10-28.json`이 없는 것이었다. 기존 `npm run fortune:build-data`를 외부 네트워크 차단 설정으로 실행해 최근 30일과 내일의 로컬 계산 자료를 생성했다. 생성 파일은 Git 변경에 포함되지 않았다.
4. 위 준비 후 전체 대표 검사 재실행이 종료 코드 0으로 통과했다. 개발 서버에는 기존 동적 경로의 동기식 `params` 접근 경고가 남는다. 해당 경고를 운영 장애나 해결 완료로 판단하지 않았고 이번 검증 범위에서 코드를 변경하지 않았다.

## 재현 방법

아래 작업은 의존성이 준비된 로컬 체크아웃에서 실행한다. 다른 세션의 개발 서버 포트를 사용하거나 종료하지 않는다.

```powershell
$env:NODE_OPTIONS='--require=./scripts/lib/mock-network-guard.cjs'
npm run fortune:build-data
$env:MOCK_DEV_PORT='23840'
$env:MOCK_DEV_API_PORT='23841'
npm run dev
```

별도 터미널에서 같은 체크아웃을 작업 디렉터리로 사용한다. 이번 점검용 스크립트는 제품 코드·CI에 추가하지 않고 로컬 증거 폴더에 보관했다.

```powershell
node 'C:\Users\user\.codex\visualizations\2026\10\28\01a181d9-1c97-7ff3-8046-b1ca2de24fc3\verify-career-discovery-html.mjs' http://127.0.0.1:23840 docs/seo/career-discovery-html-20261028.json
```

출력: `PASS 15 server-rendered pages; 7 representative internal links`, exit 0.

문서 3개 변경에 대한 `npm run check:fast -- --plan` 확인 후 `npm run check:fast` 실행도 exit 0. 선택된 검사는 whitespace와 `verify:doc-freshness`이며 후자는 `OK`를 출력했다. 이는 이번 문서 변경의 검사 결과로, 기존 기능 전체의 lint·typecheck·빌드를 새로 실행했다는 의미가 아니다.

## 재사용한 기존 증거

[career-discovery-verification-20261028.json](career-discovery-verification-20261028.json)에 기록된 96개 기간 FAQ·12개 로케일·24개 절기 경계·144개 띠 관계 검사와 상담 화면·저장 결과 재열람 mock 검증을 재사용했다. 이번 세션에서 같은 검사를 다시 실행한 것으로 표기하지 않는다. 기존 `check:fast` 중단 후 개별 검사로 마무리한 이력도 그대로 보존한다.

이번 제품 UI 변경은 없으며 독립 시각 검수를 새로 주장하지 않는다. 기존 저장 결과 샘플의 빈 근거 카드는 fixture가 근거를 포함하지 않은 한계로 기록되어 있다. 이번 HTML 검증은 그 fixture를 확장하지 않았고, 운영 결과의 근거 표시를 확인한 것은 아니다.

## 캠페인 조사와 남은 확인

[대학 캠페인 검토안](../marketing/career-campus-campaign-20261028.md)에 대학 9곳·플랫폼 2곳의 공식 연락 경로, 허용 여부 미확인 항목, 캠페인안, 대학 담당자·학생회·플랫폼별 초안을 정리했다. 로그인·프로필 기반 무료 리포트, 후기·공유 의무 없음, 운영자의 유입·인지도 목적을 명시했다.

사용자 지시에 따라 push·배포·발송·전화·양식 제출·공개 게시를 하지 않았다. 운영 반영·실계정 흐름·원격 CI는 미검증이다. 승인 없이 실 LLM·실결제·운영 DB로 폴백하지 않는다. 정책·인증·API·DB·라우팅과 다른 세션의 미커밋 8개 파일은 수정 범위에서 제외했다.

외부 진행 시에는 먼저 운영 반영 검증과 수신처·발신 정보·최종 문안의 승인이 필요하다. 플랫폼 또는 대학의 실제 게재 허용·비용·조건은 담당자 답변으로 확정해야 한다. 검색 유입 효과는 배포 뒤 별도 관찰 대상이다.
