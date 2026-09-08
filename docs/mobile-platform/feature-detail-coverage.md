# 기능별 상세페이지 확장 원장

2026-09-08 완료 기준. 레지스트리 원본 69개 목적지를 slug 기준 64개 고유 기능으로 정규화했다. 실제 구현 근거를 확인한 62개는 독립 소개주소·OG·CTA·모바일 상세 콘텐츠를 공개한다. 소개주소는 `noindex, follow`이며 sitemap에서 제외해 기존 실제 서비스 랜딩의 검색 소유권을 유지한다. 2개는 아래 사유로 제외한다.

정본:

- 수기 상세 콘텐츠: `index.html`의 `FEATURE_VISUAL_DETAILS`
- 기능 목록·마케팅 문구: `js/core/service-registry.js`, `app/_lib/serviceFeatureRegistry.ts`, `index.html`의 `FEATURE_MARKETING_COPY`
- 검토 허용 목록·구현 근거 판정: `scripts/lib/build-visual-details.mjs`
- 생성 결과: `lib/marketing/feature-visual-details.generated.json`, `public/feature-details/`

## 완료 현황

| 분류 | 수 | 공개 기능 ID |
| --- | ---: | --- |
| 관계·궁합 | 6 | master-love-codex, love-secret-ai, love-simulation, nakshatra-compat, mbti-animal-compat, destiny-meeting-place |
| 사주·심층 상담 | 18 | fortune-tea-house, fortune-chat, neo-operation-room, destiny-compass, saju-sibyl, life-book-ai, karma-destiny-ai, saju-guardian, naming-ai, fusion-fortune, saju, ziwei, sukuyo, manse, famous-saju, sukyo, bias-destiny, ziwei-ai |
| 타로·신탁 | 17 | tarot-love-relationship, tarot-reunion, tarot-mindscan, tarot-ijik, tarot-year-fortune, tarot-celestial-harmony, tarot, kemet-oracle, ifa-oracle, juyuk-turtle, tarot-numerology, tarot-crystal-soul, royal-tea-oracle, geomancy-oracle, stonehenge-runes, tarot-prompt-maker, omikuji |
| 오늘·시기 | 4 | new-year-ai, daily-fortune, today-hub, luck-sync-diary |
| 별자리·동양 점성 | 6 | nakshatra-muhurta, vedic, astrology, human-design, nakshatra, maya |
| 상징·마음 | 7 | palm-reading, physiognomy, dream, psychotest, animal-destiny, dream-psycho-analysis, animal-totem |
| 휴식·콘텐츠 | 4 | neville-meditation, yoga-guru, music, novel |
| 합계 | 62 | `public/feature-details/catalog.json`과 일치 |

## 의도적으로 제외한 항목

| 기능 ID | 이유 | 다음 조건 |
| --- | --- | --- |
| points | 이용권 상점. 운세 결과 상세가 아니며 가격·정책 화면을 소개 콘텐츠로 재해석하지 않는다. | 결제 정책 전용 작업에서 별도 검토 |
| face-reading | React 레지스트리의 `launchRoute`가 관상 화면이 아닌 `/saju-guardian`을 가리킨다. 잘못된 CTA를 공개하지 않는다. | 라우트 소유 작업에서 `/face-reading` 계약 확인 후 검토 목록 추가 |

## 완료 조건과 증거

- 62개 모두 실제 파일 근거가 존재하고, 새 레지스트리 항목은 명시적 검토 목록 없이는 공개되지 않는다.
- 소개 목록은 slug 중복이 없고 검색·분류·빈 상태 복구를 제공한다.
- 각 소개주소는 직접 진입·새로고침·canonical/OG·기존 CTA를 유지한다.
- 320/360/375/390/412/430/768/1280px에서 가로 넘침을 검사한다.
- 공통 SVG/HTML 미리보기는 결과를 가장하지 않고 기존 마케팅 정본의 제공 항목을 요약한다.
- 정적 팝업은 CSS 로드 완료 후에만 기존 섹션을 감추며, 실패 시 기존 내용을 유지하고 재시도를 제공한다.
- 가격 숫자·결제 조건은 새로 하드코딩하지 않고 기존 가격 hook과 feature key를 사용한다.

미검증 경계: 실기기 iOS/Android, 운영 Kakao 설정, 실제 LLM·PG·운영 DB, 배포 후 CWV. 개발 검증은 mock localhost만 사용한다.
