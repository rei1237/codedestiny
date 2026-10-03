# 공유 미리보기 캐시 초기화 (카카오·페이스북) — 2026-10-03

## 다음 세션 첫 문장

> `docs/handoff/og-share-cache-refresh-2026-10-03.md` 를 읽고, 1단계 사전 확인부터 순서대로 진행해 줘. 코드·배포는 건드리지 말 것.

## 목적

2026-10-03 운영 배포(커밋 `67ef77e1d`)로 링크 공유 카드가 바뀌었다.

- 꿀꿀 운세: 꽃돼지 연이 단독 카드 `https://code-destiny.com/og/code-destiny-og-vvip.png`
- 영냥이: 영냥이 전용 카드 `https://code-destiny.com/og/yeongnyangi-og.png`

카카오톡과 페이스북은 예전에 긁어 간 미리보기를 캐시하고 있다. 그래서 이미 공유된 적이 있는 URL은 한동안 옛 카드(고양이와 돼지가 함께 있는 보라색 회원카드)가 뜬다. 이 작업은 그 캐시를 초기화해 새 카드가 바로 뜨게 하는 것이다.

**코드 변경·커밋·배포는 하지 않는다.** 사이트는 이미 맞게 서빙하고 있다. 이 작업은 외부 도구의 캐시만 다룬다.

## 대상 URL

| URL | 기대 og:image |
|---|---|
| `https://code-destiny.com/ggulggul/` | `/og/code-destiny-og-vvip.png?v=build-<12자리>` |
| `https://code-destiny.com/kkul-kkul-unse/` | `/og/code-destiny-og-vvip.png?v=c0dc91b4a3` |
| `https://code-destiny.com/yeongnyangi/` | `/og/yeongnyangi-og.png?v=a97cb41a65` |
| `https://code-destiny.com/yeongnyangi/fortune/` | `/og/yeongnyangi-og.png?v=a97cb41a65` |
| `https://code-destiny.com/yeongnyangi/1000-won-fortune/` | `/og/yeongnyangi-og.png?v=a97cb41a65` |

- `/ggulggul/` 의 `build-<12자리>` 는 배포 커밋마다 바뀐다. 12자리 hex 이기만 하면 정상이다.
- 상담 결과 공유 링크는 `/yeongnyangi/fortune/?…` 처럼 쿼리가 붙는다. 카카오는 전체 URL 단위로 캐시하므로 이 링크들을 하나씩 찾아 초기화할 수는 없다. 캐시가 만료되면 자연히 바뀐다. 대상에서 뺀다.

## 1단계 — 사전 확인 (읽기 전용, 셸에서 실행)

운영이 새 카드를 서빙하는지 먼저 확인한다. 여기서 기대값과 다르면 **캐시를 초기화하지 말고 멈춘 뒤 보고**한다. 그 사이 다른 세션이 운영 배포를 다시 했을 수 있기 때문이다.

```bash
for p in /ggulggul/ /kkul-kkul-unse/ /yeongnyangi/ /yeongnyangi/fortune/ /yeongnyangi/1000-won-fortune/; do
  img=$(curl -sL "https://code-destiny.com$p" | grep -oE '<meta[^>]+property="og:image"[^>]*>' | grep -oE 'content="[^"]+"' | head -1)
  echo "$p -> $img"
done
for f in yeongnyangi-og.png code-destiny-og-vvip.png; do
  curl -sI "https://code-destiny.com/og/$f" | grep -iE '^HTTP|content-type' | tr -d '\r' | paste -sd' '
done
```

통과 기준은 두 가지다.
- 다섯 줄 모두 위 표의 기대 og:image 와 같다.
- 두 PNG 모두 `HTTP/1.1 200` 에 `image/png` 이다.

## 2단계 — 카카오 캐시 초기화 (브라우저, 로그인 필요)

1. https://developers.kakao.com/tool/debugger/sharing 에 접속한다. 카카오 계정 로그인이 필요하다.
2. 대상 URL 다섯 개를 하나씩 입력하고 **"캐시 초기화"** 를 누른다.
3. 초기화한 뒤 같은 URL 로 다시 조회한다. 미리보기 이미지가 새 카드인지 확인한다.
   - 꿀꿀 URL 은 왼쪽에 책 읽는 분홍 돼지, 오른쪽에 "당신이 태어난 날, 하늘이 남긴 한 줄" 이 보여야 한다.
   - 영냥이 URL 은 남색 바탕 오른쪽에 두루마리를 든 고양이, 왼쪽에 "오늘 밤, 고양이가 당신의 사주를 펼쳐요" 가 보여야 한다.

**로그인할 수 없으면** 2단계와 3단계는 사용자에게 넘긴다. 로그인 정보를 요구하거나 저장하지 않는다. 사용자에게는 위 URL 목록과 절차를 그대로 전달한다.

## 3단계 — 페이스북 다시 스크랩 (브라우저, 로그인 필요)

1. https://developers.facebook.com/tools/debug/ 에 접속한다. 페이스북 로그인이 필요하다.
2. 대상 URL 다섯 개를 하나씩 넣고 **"디버그"** 를 누른 다음 **"다시 스크랩"** 을 누른다.
3. 미리보기 이미지가 2단계와 같은 새 카드인지 확인한다.

이 저장소에는 페이스북 앱 ID 나 시크릿이 등록돼 있지 않다(`git grep -iE "fb:app_id|FB_APP_ID"` 결과 0건). 그래서 Graph API(`scrape=true`)로 자동화하지 않는다. 웹 도구로만 처리한다.

## 하지 말 것

- 코드·메타 태그·이미지 수정, 커밋, push, 운영 배포. 사이트 쪽 작업은 끝났다.
- `npm run og:render` 재실행. 다시 렌더하면 PNG 해시가 바뀌어 위 기대값이 깨지고, 참조 20여 곳을 다시 갱신해야 한다.
- `scripts/set-og-cache-bust.mjs` 실행. 이 스크립트의 정규식이 셸의 `?v=build-…` 를 망가뜨리는 알려진 버그가 있다(미수정, 별도 과제).
- 계정 비밀번호·토큰의 출력이나 저장.

## 완료 보고 형식

- 1단계 출력 원문(다섯 줄 + 두 줄)
- 카카오: URL 별로 초기화 여부와 새 카드 확인 여부 (또는 "로그인 불가, 사용자에게 넘김")
- 페이스북: 위와 같은 형식
- 옛 카드가 계속 뜨는 URL 이 있으면 그 URL 과 디버거에 표시된 og:image 값
