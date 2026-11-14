# 네이버 서치어드바이저에서 직접 할 일

작성일 2026-11-14. 서치어드바이저(`https://searchadvisor.naver.com`)는 사이트 주인 계정으로만 들어갈 수 있어서, 아래는 사용자가 직접 해야 한다. 주소는 모두 저장소에서 확인한 것만 적었다.

**먼저 알아 둘 것**: 이번 브랜치의 변경(`/points/` 차단 해제, 제목·문구 수정 등)은 아직 운영에 올라가지 않았다. 1~3번은 지금 해도 되고, 4번은 운영 반영 뒤에 한다.

## 1. 소유 확인
- [ ] 서치어드바이저 → 웹마스터 도구에 `https://code-destiny.com`이 등록돼 있고 "소유확인 완료"로 보이는지 확인한다.
  - 사이트 모든 페이지에 `naver-site-verification` 메타 태그가 이미 들어 있다(`app/layout.js`, `index.html`에 각 1개).
  - 새 확인 코드를 받았다면 알려 달라. 코드 두 곳을 같이 바꿔야 한다.

## 2. 사이트맵 제출
- [ ] 요청 → 사이트맵 제출에 아래 주소가 등록돼 있는지 확인하고, 없으면 넣는다.
  - `https://code-destiny.com/sitemap-index.xml`
  - 이 파일 하나가 언어별 사이트맵 5개(한국어 571쪽, 영어 127, 일본어 128, 중국어 간체 127, 번체 119)를 가리킨다. robots.txt에도 이 주소가 적혀 있다.
- [ ] 예전에 `https://code-destiny.com/sitemap.xml`을 넣어 두었다면 그대로 둬도 된다(같은 1,072쪽을 한 파일에 담은 것). 둘 다 있어도 문제는 없다.
- [ ] 제출 뒤 상태가 "정상"인지, 오류 줄이 없는지 본다.

## 3. RSS 제출
- [ ] 요청 → RSS 제출에 아래 주소를 넣는다.
  - `https://code-destiny.com/rss.xml`
  - 인사이트 최신 글 60건이 들어 있다.

## 4. robots.txt 확인 (운영 반영 뒤)
- [ ] 검증 → robots.txt에서 "수집 요청"을 눌러 새 내용을 읽게 한다.
  - 주소: `https://code-destiny.com/robots.txt`
- [ ] 읽어 온 내용에 `Disallow: /points/` 줄이 **없는지** 확인한다(이번에 뺐다. 그 페이지는 noindex 메타로만 막는다).
- [ ] 같은 화면의 "수집 가능 여부 확인"에 아래를 넣어 본다.
  - `/` → 수집 가능
  - `/saju/` → 수집 가능
  - `/fortune/2027/` → 수집 가능

## 5. 대표 페이지 수집 요청 (운영 반영 뒤)
요청 → 웹 페이지 수집에 하나씩 넣는다. 하루 요청 수에 한도가 있으니 위에서부터 한다.

- [ ] `https://code-destiny.com/`
- [ ] `https://code-destiny.com/ggulggul/`
- [ ] `https://code-destiny.com/saju/`
- [ ] `https://code-destiny.com/manse/`
- [ ] `https://code-destiny.com/saju/free/`
- [ ] `https://code-destiny.com/ziwei/`
- [ ] `https://code-destiny.com/tarot/`
- [ ] `https://code-destiny.com/today/`
- [ ] `https://code-destiny.com/fortune/2027/`
- [ ] `https://code-destiny.com/new-year-ai-consultation/`
- [ ] `https://code-destiny.com/yeongnyangi/`
- [ ] `https://code-destiny.com/about/`

## 6. 리포트에서 볼 것 (1~2주 뒤)
- [ ] 리포트 → 사이트 최적화: "사이트 제목"이 "꿀꿀 운세"로 잡히는지. 다른 이름이 보이면 화면을 찍어 알려 달라.
- [ ] 리포트 → 수집 현황: 수집 오류(404, 5xx)가 늘지 않았는지.
- [ ] 리포트 → 색인 현황: 색인된 쪽수가 줄지 않았는지.
- [ ] 리포트 → 검색어: "만세력", "무료사주", "자미두수", "신년운세"로 어떤 페이지가 나오는지. `docs/seo/keyword-page-map.md`의 대표 페이지와 다르면 알려 달라.

## 7. 알려 주면 좋은 것
- 서치어드바이저의 검색어 리포트(검색어·노출·클릭) 내려받은 파일. `keyword-page-map.md`의 "미확인" 칸을 채울 수 있다.
- 네이버 검색광고 키워드 도구의 월간 검색 수. 지금 표의 수치는 2026-10-08에 본 값이다.

## 참고
- 저장소에는 IndexNow 제출 명령(`npm run seo:indexnow`)도 있다. 외부 서비스로 URL 목록을 보내는 일이라 사용자 승인 없이는 돌리지 않는다.
- `llms.txt`(`https://code-destiny.com/llms.txt`)는 서치어드바이저에 제출하는 파일이 아니다.
- 예전 등록 안내는 `docs/seo/checklists.md` §2에 있다. 그 문서는 확인 코드가 2개라고 적었지만 지금 코드에는 1개다.
