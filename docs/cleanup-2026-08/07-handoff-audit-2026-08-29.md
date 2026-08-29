# 인수인계 문서 감사 — 삭제 0건 (2026-08-29)

> 컨텍스트·토큰 운영 최적화 계획 4절이 "인수인계 문서 29개 미독분 정리"를 별도 세션으로 미뤘고,
> 그 ④단계가 **`06-deleted.md` 형식의 대장 + 사용자 승인**이었다. 이 문서가 그 대장이다.
>
> 🔴 **결론: 이번 감사에서 삭제를 제안하는 문서는 0건이다.**
> 계획이 근거로 삼은 "미독 29건"은 **측정 오차**였고, 실제 미독분은 14건인데 그 14건이 전부
> 미종결 작업·운영 런북·살아 있는 포인터였다. 아래는 그 판정 근거다.

## 되살리는 법

삭제가 없으므로 복구 대상이 없다. 이 대장은 **판정 기록**으로만 남는다.
다음 세션이 같은 정리를 다시 시도하기 전에 §3(왜 미독이 삭제 근거가 못 되는가)과
§4(재검토 트리거)를 먼저 읽는다. 안 읽으면 같은 결론에 같은 비용으로 다시 도착한다.

---

## 0. 계획의 전제가 재측정에서 뒤집혔다

| | 계획(2026-08-29 오전) | 이 감사(2026-08-29) |
|---|---:|---:|
| 대상 문서 | 54 | 54 (`_TEMPLATE.md` 제외) |
| 트랜스크립트 | 302 세션 | **937** (루트 305 + 서브에이전트 사이드체인) |
| Read 0회 판정 | **29건 (54%)** | **14건 (26%)** |

차이의 원인은 **읽힘의 정의**다. 계획의 스크립트는 `Read`/`Write`/`Edit` 툴의 `file_path` 만 셌다.
그런데 이 레포의 세션 상당수는 오토 모드로 돌아 문서를 **Bash `cat`/`head`/`sed` 로 읽는다.**
그 경로를 세면 미독 판정이 절반 아래로 떨어진다 — 예시:

| 문서 | Read 툴 | Bash 읽기 | 계획의 판정 | 실제 |
|---|---:|---:|---|---|
| `fortune-tea-house-i18n.md` | 0 | 23 | 미독 | 3세션이 읽음 |
| `novel-story-improvement-2026-08-27.md` | 0 | 20 | 미독(대형 3건 중 하나) | 2세션이 읽음 |
| `korean-calendar-migration-2026-08-27.md` | 0 | 6 | 미독(대형 3건 중 하나) | 4세션이 읽음 |
| `seo-naver-diagnostic-2026-08-16.md` | 0 | 15 | 미독 | 3세션이 읽음 |

🔴 계획이 "최근 대형 3개 전부 미독"이라 적은 근거는 이 오차에서 나왔다. **셋 중 둘이 실제로는 읽혔다.**

---

## 1. 측정 방법과 범위

- **대상**: `origin/main` 의 `docs/handoff/*.md` **54개**. `_TEMPLATE.md`(PR #1267 신설)는 템플릿이라 제외.
  🔴 기본 작업 디렉터리의 미커밋 2건(`marketing-automation-2026-08-28.md` ·
  `reengagement-email-blocked-2026-08-28.md`)은 **다른 세션이 작업 중**이라 감사 대상에서 뺐다.
- **트랜스크립트**: 프로젝트 세션 로그 937개(`.jsonl`), 2026-08-18~08-29.
- **읽힘의 정의**: `Read` 툴의 `file_path` 일치 **또는** `Bash`/`PowerShell` 명령이
  `cat|head|tail|sed|less|type|Get-Content` 중 하나와 파일명을 함께 포함.
- **참조**: `git grep -F <파일명>` — 🔴 `rg` 가 아니다(CLAUDE.md 코딩 원칙 9, 리포 루트 `.ignore`).
  소스 + 테스트 + 다른 문서 3면을 모두 본다.
- **미종결 근거**: 각 문서를 실제로 열어 "남은 작업" 절과 그 대상 심볼·파일의 존재를 코드에서 확인.

---

## 2. 미독 14건 — 전건 판정

| 문서 | KB | 외부참조 | handoff내참조 | 판정 근거 (실측) | 판정 |
|---|---:|---:|---:|---|---|
| `seo-followups-2026-08-27.md` | 40 | 0 | 6 | 자체가 "PR #1184·#1186 이후 남은 것"의 원장. 미종결 항목 다수 | 🔴 보존 |
| `overseas-payment-krw-2026-08-28.md` | 36 | 0 | 0 | PR #1242 는 1단계만. 남은 항목 절이 살아 있음. 어제 작성 | 🔴 보존 |
| `seo-render-audit-2026-08-27.md` | 26 | 0 | 3 | 위 문서가 "선행 문서 — §10 을 먼저 읽을 것"으로 지목 | 🔴 보존 |
| `content-translation-2026-08-25.md` | 24 | 0 | 1 | 슬라이스 3b(26,723자)·4(105,015자) **⛔ 미착수** | 🔴 보존 |
| `locale-service-optimization-2026-08-25.md` | 21 | **4** | 1 | 소스·테스트 4곳이 이 문서를 소관 문서로 지목(아래 §2-1) | 🔴 보존 |
| `workers-ai-translation-2026-08-25.md` | 19 | 0 | 1 | **매일 돌리는 배치의 운영 절차서**. 회고가 아니라 런북 | 🔴 보존 |
| `solar-term-frame-kasi-verification.md` | 19 | 0 | 2 | 2026-08-28 종결이나 KASI 오류 3건·커버리지 2000~2028 의 근거 원본 | 🔴 보존 |
| `tarot-oracle-pricing-tiers.md` | 13 | 0 | 0 | PR #1171 종결이나 **Play Console 등록이 사람 손 미완** + 8절 부채 3건 | 🔴 보존 |
| `service-exposure-audit-2026-08-24.md` | 12 | 0 | 0 | 결론 절이 "②는 고쳤다. **①은 남아 있다(§4)**" | 🔴 보존 |
| `seo-content-expansion-roadmap.md` | 12 | 0 | 1 | 표제부터 "**P4 일부만 구현, 나머지는 계획**" | 🔴 보존 |
| `pass-tier-service-card-badges.md` | 9 | 0 | 0 | A·B 둘 다 미구현 — 아래 §2-2 의 코드 확인 | 🔴 보존 |
| `payment-503-and-renderer-unification.md` | 9 | 0 | 0 | 트랙 A 프로덕션 승격 절차 + 트랙 B 의 D-2·D-3·D-4 미착수 | 🔴 보존 |
| `fortune-weekly-monthly-reindex-2026-08-28.md` | 7 | 0 | 0 | "새로 남은 것은 §3 하나뿐이다" — 그 하나가 살아 있음 | 🔴 보존 |
| `human-design-fixture-expected-values.md` | 6 | 0 | 0 | 값 추가 절차서 + **미해결 정책 판단 1건**(모호 시각). 회고 아님 | 🔴 보존 |

**합계 255KB — 삭제 0건.**

### 2-1. 유일한 외부 참조 — `locale-service-optimization-2026-08-25.md`

```
__tests__/lib/assistant-sections.numbered-headings.test.js:69
__tests__/ui/love-simulation-content-i18n.static.test.js:11
app/naming-ai/namingDraftCopy.ts:5
app/saju/love-simulation/_utils/loveSimCopy.ts:11
```

네 곳 모두 "이 축은 저 문서 소관"이라고 적은 주석이다. 지우면 **죽은 링크 4개**가 소스에 남는다.
CLAUDE.md 원칙 9의 "임포터 0 은 죽음의 증거가 아니다"가 문서에도 그대로 적용되는 사례다.

### 2-2. `pass-tier-service-card-badges.md` 를 코드로 확인한 절차 (다른 항목도 같은 방식)

문서가 "남은 일 두 가지"로 지목한 대상이 실제로 없는지 본다.

```bash
ls lib/payment/pass-eligibility.ts                   # 없음 → A 미착수
git grep -n "coveredByCurrentPass" -- lib app src worker   # 0건
git grep -n "PassCycleCard" -- app src lib           # PointHistoryClient.tsx 내부 함수뿐 → B 미착수
```

🔴 **문서의 "완료" 선언만 읽고 판정하지 말 것.** 이 문서는 앞의 PR ①②를 "끝난 것"으로 적어
두었고, 첫 14줄만 보면 종결로 읽힌다. 대상 심볼을 코드에서 찾아야 A·B 가 남아 있는 것이 보인다.

---

## 3. 왜 "미독"이 삭제 근거가 못 되는가

1. **미독은 문서의 속성이 아니라 시간의 속성이다.** 14건 중 3건(`overseas-payment-krw` ·
   `fortune-weekly-monthly-reindex` · `solar-term-frame-kasi-verification`)은 **작성 1~2일차**다.
   아직 이어받을 세션이 없었을 뿐이다.
2. **런북·참조 문서는 원래 자주 안 읽힌다.** `workers-ai-translation` 은 배치를 돌리는 날에만,
   `human-design-fixture-expected-values` 는 픽스처를 추가하는 날에만 필요하다.
   호출 빈도가 낮은 것과 죽은 것은 다르다.
3. **미독분은 애초에 토큰을 만들지 않는다.** 계획 자체가 그렇게 적었다 — 읽히지 않는 문서의
   컨텍스트 비용은 0이다. 즉 이 정리는 **토큰 절감 작업이 아니다.** 남는 이득은 디렉터리 가독성뿐이고,
   그 대가는 "다음 세션이 미종결 작업을 못 찾는 것"이다. 비대칭이 크다.

---

## 4. 재검토 트리거 — 각 문서가 언제 삭제 가능해지는가

지금은 아니지만, 아래가 참이 되면 그때 다시 이 대장에 줄을 추가한다.

| 문서 | 삭제 가능 조건 |
|---|---|
| `content-translation-2026-08-25.md` | 슬라이스 3b·4 가 머지되고 `workers-ai-translation` 의 진행 기록이 종료 |
| `workers-ai-translation-2026-08-25.md` | 배치 운영이 끝나 스크립트가 제거될 때. **운영 중에는 불가** |
| `pass-tier-service-card-badges.md` | `lib/payment/pass-eligibility.ts` 가 생기고 `PassCycleCard` 가 공용 컴포넌트로 분리될 때 |
| `payment-503-and-renderer-unification.md` | 트랙 B 의 D-2·D-3·D-4 가 닫힐 때. 트랙 A 는 승격 절차라 별도 |
| `tarot-oracle-pricing-tiers.md` | Play Console 에 `cd_content_tier_14` 등록이 끝나고 8절 부채 3건이 닫힐 때 |
| `service-exposure-audit-2026-08-24.md` | §4 의 얇은 본문 `noindex` 항목이 닫힐 때 |
| `seo-content-expansion-roadmap.md` | P4 나머지의 착수/기각이 결정될 때 |
| `human-design-fixture-expected-values.md` | 모호 시각 정책이 외부 차트로 확정되고 값 추가 절차가 가드로 옮겨질 때 |
| `solar-term-frame-kasi-verification.md` | KASI 오류 3건이 `scripts/verify-solar-term-frame-kasi.mjs` 주석에 자족적으로 옮겨질 때 |
| `locale-service-optimization-2026-08-25.md` | 🔴 소스 4곳의 주석 포인터를 먼저 옮겨야 한다. 그 전에는 삭제가 곧 죽은 링크 4개 |
| `seo-render-audit-2026-08-27.md` | `seo-followups-2026-08-27.md` 가 §10 내용을 흡수했을 때 |
| 나머지 3건 | 각 문서의 "남은 것" 절이 비었을 때 |

---

## 5. 다음에 볼 축 — 읽힘이 아니라 종결

이번 감사가 보여 준 것은 **읽힘 축이 잘못된 축**이라는 것이다. 정리를 계속하려면 축을 바꿔야 한다.

- **종결 축**: "남은 것" 절이 비었고 그 지식이 가드·테스트·메모리에 있는 문서.
  단, 키워드 스캔은 못 쓴다 — 54개 전수 스캔 결과 **종결을 선언한 19건이 전부 미종결 표지도 함께 갖는다.**
  문서 하나당 대상 심볼을 코드에서 확인하는 수작업이 필요하다(§2-2 절차).
- **통합 축**: 계보가 이어지는 묶음을 하나로 접는다.
  예: `locale-sweep-2026-08-24` 계열 4건, `inp-round2`·`inp-round3`·`mobile-inp-and-stability` 3건.
  🔴 통합은 삭제가 아니므로 이 대장이 아니라 별도 PR 로 다룬다.

### 5-1. 🔴 `docs:stale` 의 삭제 제안을 그대로 실행하지 말 것

실측 2026-08-29, 이 브랜치에서:

```
node scripts/list-stale-docs.mjs --days 0
```

→ `git rm` 제안에 **handoff 문서 41개**가 들어온다. 그중 **10개가 §2 에서 보존으로 판정한 것**이다
(`payment-503-and-renderer-unification` · `human-design-fixture-expected-values` ·
`service-exposure-audit-2026-08-24` · `locale-service-optimization-2026-08-25` ·
`pass-tier-service-card-badges` · `content-translation-2026-08-25` ·
`workers-ai-translation-2026-08-25` · `tarot-oracle-pricing-tiers` ·
`fortune-weekly-monthly-reindex-2026-08-28` · `overseas-payment-krw-2026-08-28`).

이 스크립트는 **수정 시각과 참조만** 본다 — 문서 안의 "남은 작업"은 읽지 않는다.
그러니 제안 목록은 후보이지 판정이 아니다. 스크립트 자신도 "아무것도 지우지 않습니다"라고 적는다.

🔴 그리고 계획 4절의 ③(참조 색인에서 `docs/handoff/**` 제외)은 **이 위험을 키우는 방향**이다.
지금은 handoff 끼리의 상호참조가 14개를 후보에서 빼 주고 있는데(`후보에서 제외 14개`),
③을 하면 그 14개가 제안 목록에 합류한다. ③을 하려면 **"참조됨" 대신 "남은 작업 절이 비었는가"를
보는 판정 축이 먼저** 있어야 한다.

🔴 어느 축이든 **먼저 계획 4절의 ①~③을 해야 한다.** 이 감사는 그 셋 없이 돌 수 있는
④(대장)만 수행했다.

| 단계 | 내용 | 상태 |
|---|---|---|
| ① | `docs/CURRENT_DEV_BASELINE.md` 의 상대 링크 3개를 `docs/handoff/...` 형태로 정규화 | ⛔ 미착수 |
| ② | 인수인계 문서 프론트매터 백필(`docs/handoff/_TEMPLATE.md` 규격) | ⛔ 미착수 |
| ③ | `scripts/list-stale-docs.mjs` 의 참조 색인에서 `docs/handoff/**` 제외 | ⛔ 미착수 — 🔴 §5-1 을 먼저 읽을 것 |
| ④ | 이 대장 | ✅ 이 문서 |

---

## 6. 재현

저장소 루트에서 아래를 파일로 저장해 `node` 로 돌린다.
출력은 미독 목록과 문서별 언급 수다.

```js
import fs from 'node:fs';
import p from 'node:path';
const ROOT = 'C:/Users/user/.claude/projects/d--Development-code-destiny';
const NL = String.fromCharCode(10);
const SEP = String.fromCharCode(92); // 경로 구분자. 세션마다 다르므로 슬래시로 정규화한다
const READ_CMD = /\b(cat|head|tail|sed|less|type|Get-Content)\b/; // 🔴 단어 경계로 볼 것 — 앞뒤 공백만 보면 여러 줄 명령 안의 읽기를 놓친다(실측: 1건 오분류)
function walk(d) { let o = []; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = p.join(d, e.name); if (e.isDirectory()) o = o.concat(walk(f)); else if (e.name.endsWith('.jsonl')) o.push(f); } return o; }
const disk = fs.readdirSync('docs/handoff').filter((f) => f.endsWith('.md') && f !== '_TEMPLATE.md');
const stat = Object.fromEntries(disk.map((d) => [d, { read: 0, bash: 0, other: 0, sessions: new Set() }]));
for (const f of walk(ROOT)) {
  const sid = p.basename(f, '.jsonl');
  for (const L of fs.readFileSync(f, 'utf8').split(NL)) {
    if (!L || L[0] !== '{') continue;
    let e; try { e = JSON.parse(L); } catch { continue; }
    if (e.type !== 'assistant' || !Array.isArray(e?.message?.content)) continue;
    for (const b of e.message.content) {
      if (b.type !== 'tool_use') continue;
      const inp = JSON.stringify(b.input || '');
      const fp = String(b.input?.file_path || b.input?.path || '').split(SEP).join('/');
      const cmd = String(b.input?.command || '');
      for (const d of disk) {
        if (!inp.includes(d)) continue;
        const s = stat[d];
        if (b.name === 'Read' && fp.endsWith(d)) { s.read++; s.sessions.add(sid); }
        else if ((b.name === 'Bash' || b.name === 'PowerShell') && READ_CMD.test(cmd) && cmd.includes(d)) { s.bash++; s.sessions.add(sid); }
        else s.other++;
      }
    }
  }
}
const never = disk.filter((d) => stat[d].read === 0 && stat[d].bash === 0);
console.log('미독 ' + never.length + '/' + disk.length);
for (const d of never) console.log('  ' + d + '  (언급 ' + stat[d].other + ')');
```

참조 3면 확인(🔴 `rg` 가 아니라 `git grep`):

```bash
git grep -n -F "<파일 이름>.md" -- ':!docs/handoff'   # 소스·테스트·다른 문서
git grep -n -F "<파일 이름>.md" -- docs/handoff       # handoff 끼리의 참조
```

---

## 7. 미검증으로 남는 것

- **937개 트랜스크립트가 전량인지는 미검증**이다. 로그 보존 기간을 넘겨 지워진 세션이 있으면
  미독 판정이 과대집계된다. 즉 실제 미독은 **14건 이하**다 — 이 감사의 결론(삭제 0건)은
  그 방향으로 더 안전해질 뿐 뒤집히지 않는다.
- **Bash 읽기 탐지는 하한이다.** 글로브로 여러 문서를 한 번에 읽은 경우는 파일명이 명령에 없어
  안 잡힌다. 실제 읽힘은 표의 수치 이상이다.
- 판정에 쓴 "미종결" 근거는 **문서의 서술 + 대상 심볼의 코드 존재 확인**이다.
  각 항목이 실제로 제품에 필요한지(제품 판단)는 이 감사의 범위가 아니다.
