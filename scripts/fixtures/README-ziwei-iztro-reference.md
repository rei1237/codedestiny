# ziwei-iztro-reference.json

`scripts/verify-ziwei-reference.mjs` 가 읽는 자미두수 외부 기준 대조 명반이다. 셸·워커·앱 세 엔진의 명반을 이 표와 칸 단위로 맞춘다.

**손으로 고치지 말 것.** 갱신은 아래 명령으로만 한다.

```
# 레포 밖 폴더에 iztro@2.6.1 을 설치한다(레포 의존성이 아니다 — package-lock 수정 금지).
npm i --prefix <레포 밖 폴더> iztro@2.6.1
node scripts/verify-ziwei-reference.mjs --emit --iztro <레포 밖 폴더>
node scripts/verify-ziwei-reference.mjs
```

- 출처: iztro 2.6.1 (MIT), 기본 설정 그대로. 호출·설정·입력 규칙은 파일 머리(`reference`, `inputRules`)에 있다.
- 음력은 한국 음양력 코어(KASI) 값을 `byLunar` 로 넣는다. iztro 의 중국 음력에 없는 날짜(30일)는 행으로 남기지 않고 제외 목록에 이유와 함께 남는다.
- `calendar.tableFingerprint` 가 코어 표와 다르면, 또는 `rowsSha256` 가 본문과 다르면 대조가 실패한다. 표본 규칙(`buildSubjects`)을 바꿨으면 다시 `--emit` 한다.
- 두 출처(iztro·『紫微斗數全書』)가 갈리는 칸은 fixture 를 고치지 말고 스크립트의 `SCHOOL_RULES` 에 근거와 함께 적는다.
