# 아틀리에 대화 스프라이트 적용

사용자 요청: 튜토리얼과 라이트 노벨에 기존 연이 아틀리에 대화 에셋을 재사용한다. 연이·네오의 인간/동물 모습은 기존 스토리 변신 시점을 따른다. 길잡이 UI는 첨부된 기존 HelpDesk(왼쪽 책 읽는 꽃돼지, 오른쪽 FAQ·결과·문의 3개 링크)를 유지한다. 홈과 공통 SiteFooterHub가 같은 컴포넌트를 사용한다. 정적 상담 셸 index.html의 별도 버튼형 길잡이도 동일한 그림·3행 목록·소개 링크로 맞추고 sync:public으로 언어별 미러에 반영했다.

## 자산과 동작

원본: 사용자 소유 C:/Users/user/Documents/ChatGPT/코드데스티니 마케팅 2/atelier-release/assets/illustrated/talking/. 대응 명세: D:/Development/yeoni-atelier/src/render/asset-updates.js 및 sprite-renderer.js.

각 시트는 1280×384, 가로 4셀(320×384)이다. 셀 0은 정지, 1은 눈 깜빡임, 2·3은 대화다. 공개 복사본은 public/assets/novel/atelier/, 꽃돼지는 기존 public/assets/yeoni/atelier/talking-pig.webp를 재사용한다.

- 연이: formAt 정본의 pig 구간은 yeoni_pig, 앞뒤 인간 구간은 yeoni.
- 영냥이/네오: neoFormAt의 lion(기존 호환 키)은 neo_cat, human은 neo.
- 모카·윤달·서한비·무성·까마귀·청토끼: moka/yun/seohanbi/museong/raven/cheongtokki.
- 루나·루나 언니: luna/luna_sis. 원본 mouth:false를 유지하며 결함 있는 2·3셀을 사용하지 않고 0→1→0 눈 깜빡임만 표시한다.

일반 대화는 2→3→2→0을 440ms씩 두 번만 재생한다. 루나는 330ms 한 번이다. 대사 완료·다음 화자·동작 줄이기에서 정지한다. 자동 넘김·스킵·책갈피·대본과 변신 마커는 변경하지 않는다. 해당 캐릭터가 필요할 때만 시트를 읽으며, 실패하면 기존 표정 이미지를 유지한다.

무성 정체 공개 전 그림자, 루나 언니 회복 모습, 울음·분노·결혼 같은 지정 표정과 거울·검은 호랑이 등 대응 아틀리에 자산이 확인되지 않은 역할은 기존 그림을 보존한다. 이 구간을 새 대화 스프라이트로 제작했다고 보고하지 않는다.

영냥이 첫 안내도 neo_cat의 4셀을 440ms 한 번 재생하며 동작 줄이기에서는 정지한다. 연이 튜토리얼의 기존 4셀 안내는 유지한다.

## 확인

verify:novel-runtime 및 verify:novel-player-start는 변신 연속성·형태 매핑·특수 역할 보존·루나 금지 프레임·자산 실패를 검사한다. 실제 로컬 브라우저에서 390/1440px 셀 비율, 대사 완료, OS 동작 줄이기, 기존 HelpDesk 3개 안내 링크를 확인한다. API/결제/DB는 변경하지 않는다.

SEO: 소설 URL·제목·대본·H1·canonical·내부 링크는 유지하며 자산 표시만 바꾼다. 기존 사이트맵 생성기로 원장을 동기화한다.
