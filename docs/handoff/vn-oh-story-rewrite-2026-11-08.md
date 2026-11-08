---
status: in-progress
updated: 2026-11-08
next: 1단계 B — 진단 병렬(아크별 리뷰·황금 3장·정체 노출·복선 공정성·말버릇) → reports/*.md
---

# VN 스토리 개선 (oh-story 활용) 인수인계

## 첫 행동
`D:\Development\story-lab\code-destiny-vn`(작업실)과 이 워크트리를 확인하고, 아래 단계 중 체크되지 않은 첫 항목부터 진행한다.

## 지금 상태
- 워크트리: `D:\Development\codedestiny-worktrees\vn-oh-story-20261108`, 브랜치 `wt/vn-oh-story-20261108`, 기준 origin/main `cc1ae9598`.
- oh-story 14개 스킬은 전역 설치 완료(`~/.agents/skills/story-*`, Claude Code 심링크).
- 작업실(별도 git 저장소, code-destiny와 섞지 않음)
  - `scripts/export-vn.mjs <source.json> <outDir> [EP키...]`: 화별 마크다운으로 내보낸다. 각 줄 끝 `<!-- ep-xx:n -->`가 비트 id다.
  - `source/正文/001-PROLOGUE.md` … `073-*.md`(73화), `source/设定/`(바이블·가이드라인·점술 수치·네오 편집 계약 사본).
  - `reports/`: 진단 결과를 둔다.

## 승인 상태 (사용자, 2026-11-08)
- 요청 원문: "oh-story 스킬 활용해서 라이트 노벨 스토리를 더 재밌고 몰입감 있으며, 복선도 더 호불호 없도록 만들어주도록해줘"
- 선택: 범위 "진단 후 우선 화부터", 설치 위치 "별도 작업실".
- 불만: "일단 스토리 자체가 재미가 없고 네오 = 박병하가 너무 뻔하고 문장이 자연스럽지 않아"
- 1단계 진단이 끝나면 **멈추고** 진단 요약·우선순위를 사용자에게 확인받는다. push·배포는 하지 않는다.

## 작업 규칙과 함정
- 원고 정본은 `content/novel/episodes.source.json`만 고친다. 생성물(`public/data/novel/**`, `lib/stories/vn/episodes.generated.json`, `content/novel/scene-matrix.generated.json`)은 `npm run novel:build`로만 만든다. 검증은 `npm run verify:story-sync`.
- 비트 id는 가능한 한 유지한다(북마크·번역 대응). 번역(`content/novel/translations/*.json`)은 다시 번역하지 않고, 바뀐 비트 목록만 보고서에 남긴다.
- oh-story는 중국 웹소설용이다. 방법론(4관점 리뷰, S1~S4, 황금 3장, 보상 리듬, 복선 추적, 去AI味)만 쓰고 중국어 lint·플랫폼 rubric은 참고만 한다. 보고서는 한국어로 쓴다.
- `/story-setup`은 작업실에만 한다. code-destiny 저장소에 훅·CLAUDE.md 블록을 배포하지 않는다.
- **사천왕 금지**: feat/world-cast-page의 `fdc44db85`(4천왕 개그·EP.35/41 네오 봉인 명리학자)는 origin/main에 없다. origin/main 가이드(2026-11-03)는 "흑월·청토끼 등을 사천왕 조직으로 묶지 않는다"고 정했다. 이 커밋은 얹지 않는다.
- 고정 설정: 네오는 은발 인간 남성이고 희생형이다(혼자 팔 벌리고 고개 젖히는 과시 금지, 헌신은 연이를 향함). 「박지은」 영구 금지. 사주·점술 값은 `vn-divination-facts.md` 엔진 값만. 서한비 개심은 포옹만으로 끝내지 않는다. 바이블 §8 톤·분량(한글 1,800자 이상, 비트 250자 상한, ASCII 큰따옴표·역슬래시 금지).

## 진단에서 이미 본 것
- '이번엔/이번에는'이 거의 모든 화에 나온다(EP.29·52·53은 12회 안팎). 문장 부자연스러움의 대표 증상.
- 네오 회귀 단서가 노골적이다: EP.01 「이번에는… 놓치지 않는다.」, EP.21A 「한 번만 더. 이번에는 끝까지 옆에서.」, EP.38A 박병하 실명. 대안 후보가 없어 EP.42 공개가 확인에 그친다.

## 설계 (2단계에서 바이블에 반영)
- 네오=박병하 미스디렉션: 회귀·우산 든 남자 단서를 받을 대안 후보(윤달/강새벽 1순위, 무성 2순위). 네오의 말실수는 EP.42 전 2~3개만, 나머지는 다시 읽으면 보이는 행동 단서로. 박병하 실명 노출은 늦추거나 위장. EP.42는 앞 장면의 의미가 뒤집히는 순간으로.
- 재미: 화마다 연이의 능동 목표·실패 대가, 웃음 장치 리듬, 설명 구간 축소.
- 복선: 원장 모든 줄에 심기·상기·회수 세 번 닿기. 약한 떡밥은 합치거나 뺀다.

## 1A 결과 (2026-11-08, 작업실 커밋 d185ed2 → d1850d1 → 10deaba → de9b568)
- 배포: 작업실에만 `/story-setup`(Claude Code, agents_version 41, setup 1.3.9). `.claude/hooks`·`rules`·`agents`(7종)·`skills/story-setup/references/agent-references`, `CLAUDE.md` 관리 블록, `.claude/settings.local.json`, `.story-deployed`. code-destiny에는 아무것도 배포하지 않았다.
- 책 디렉터리: `D:\Development\story-lab\code-destiny-vn\코드데스티니`(`.active-book`=코드데스티니). 설정/·大纲/(大纲.md, 卷纲 4권, 细纲_第001~073章.md 73개, 계약 검사 통과)·正文/(73편, 본문·비트 id 원문 그대로)·参考资料/화번호_대응표.md.
- 拆文 결과: `拆文库/코드데스티니/`(概要·拆文报告·剧情/节奏·情绪模块·散落情节·角色/·设定/·文风.md·章节/第N章_摘要.md). 5단계 모두 completed.
- 추적: `코드데스티니/追踪/_tracking-state.json`, `上下文.md`, `伏笔.md`, `角色状态/`, `时间线/`, `逐章记录/`. 원본 입력 `.story/work/init.json`. 결정적 검사 `PYTHONUTF8=1 py C:/Users/user/.agents/skills/story-import/scripts/tracking_commit.py check --project 코드데스티니`(작업실 루트에서) → `{"last_committed_chapter": 73, "state_revision": 0}`, exit 0.
- 복선 원장: 31행(바이블 §5 24행 F001–F024 + 신규 7행 F025–F031). 已回收 30, 已埋 1(F023 바다 약속, 여행 자체 미등장). 상기 없음 1행(F022 박병하 가운데 글자). 비트 id까지 적은 상세판은 `코드데스티니/参考资料/伏笔원장_상세.md`. 바이블과 본문이 다른 곳(검은 깃털 EP.06, 그릇은 비어야 EP.12A, 첫 번째 봄 책 EP.16, 化忌 무곡 EP.30 심기, 金克木 한자는 ep-24:22 처음, 흰 털 EP.43 문장 없음 → EP.51 심기, 네오 화상 앞발 좌우 혼재)은 본문을 따르고 비고에 적었다. 2단계 바이블 재설계 때 반영할 것.
- 리뷰어 에이전트 호출: `.claude/agents/*.md`(story-explorer, consistency-checker, narrative-writer, story-architect, character-designer, chapter-extractor, story-researcher)는 배포 세션에 등록되지 않는다. 새 세션을 작업실에서 열거나, Agent 도구 general-purpose(sonnet)에 "먼저 `D:\Development\story-lab\code-destiny-vn\.claudegents\{이름}.md`를 읽고 그 계약대로 하라"고 지시해 쓴다. `/story-review`는 agent가 없으면 solo로 떨어지므로 위 방식으로 4관점을 병렬로 돌린다.

## 1A에서 알게 된 함정
- 파이썬은 `py`. 반드시 `PYTHONUTF8=1 PYTHONIOENCODING=utf-8`를 붙인다(안 그러면 cp949로 한글 깨짐).
- 작업실은 `core.autocrlf false` + `.gitattributes`(`* -text`). CRLF로 바뀌면 장 해시가 깨진다.
- 장 번호 ≠ 화 번호: 第N章 = 파일 순서(第1章=PROLOGUE … 第73章=EP.53S). 대응은 `参考资料/화번호_대응표.md`.
- 第71–73章(EP.51S–53S)은 第68–70章(EP.51–53)과 나란한 대체 결말이다. 둘 다 第67章 EP.50 뒤에 온다. 추적의 "현재 위치"는 第73章이므로 현실 분기를 볼 때 섞지 않는다.
- 拆文 원문 `拆文库/코드데스티니/原文/原文.txt`는 화 제목 줄을 `第N章 {화 키} {제목}`으로 바꾼 사본이다. 원고 정본은 여전히 code-destiny의 `content/novel/episodes.source.json`이다.
- 본서 `设定/文风.md`는 작가 확인 전이라 만들지 않았다. 拆文库 쪽 `文风.md`만 있다('이번엔' 105회 + '이번에는' 30회 = 135회 관측).
- 细纲·角色 카드 일부에 `[待补充]`(근거 부족 칸)가 남아 있다. 진단 재료로 쓰되 사실로 인용하지 않는다.

## 단계
- [x] 0. 전역 설치, 작업실 생성, 내보내기 스크립트, 워크트리 생성
- [x] 1A. 작업실 `/story-setup`(Claude Code) → `/story-import`(source/正文, 设定)로 추적 상태·복선 원장 생성
- [ ] 1B. 진단 병렬: 아크별 `/story-review full`, 황금 3장·보상 리듬, 정체 노출 감사, 복선 공정성 감사, 문장 말버릇 집계 → `reports/*.md`
- [ ] 1C. 진단 종합 `docs/webnovel_review/oh-story-diagnosis-2026-11-08.md` 커밋 → **사용자 확인**
- [ ] 2. 바이블 재설계(§3·§4·§5·§8) 커밋
- [ ] 3. 우선 화 묶음별 개고(묶음마다 build·verify·커밋·이 문서 갱신)

## 검증
- `npm run novel:build`, `npm run verify:story-sync` 통과.
- 개고 화의 '이번엔' 계열·금지 반복어 빈도 전후 비교.
- 정체 노출 감사 재실행: EP.42 전 노골도 3 단서 0개, 다시 읽으면 보이는 단서 3개 이상.
- `public/codedestiny-novel.html`에서 개고 화 재생·북마크 확인.
