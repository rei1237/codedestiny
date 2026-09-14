# 이미지 생성 기록과 재사용 규칙

도구: ChatGPT 내장 image_gen. API 키 기반 별도 과금 호출 없음. Instagram 전달본은 JPG 또는 PNG이며, WebP는 마스터·중간 원본으로만 둔다. 한국어 문구는 Pillow로 후처리했다. 최종 참조 파일 경로는 STRATEGY/HANDOFF의 사용자 정본 2개가 우선한다.

## 승인된 첫 연이 배경
`assets/yeoni-saju-generated.webp`. 사용자 정본 경로 지시 **이전**에 저장소 flower-pig-single-a.webp를 참조해 생성. 사용자가 현재 그림을 좋다고 평가. 새로 생성할 때는 이 자산만 참조하지 말고 지정 프로필2개를 함께 참조한다.

Prompt: Instagram editorial illustration, premium Korean fortune-telling app aesthetic, moonlit fantasy, elegant East Asian celestial symbolism, soft cinematic lighting, modern mobile friendly composition, ample negative space for Korean typography, no embedded text, consistent CODE DESTINY visual identity. Strictly preserve flower pig Yeoni's pink round body, glossy brown eyes, pink snout, lotus on viewer-left ear, lavender scarf and curled tail. Portrait 4:5. Yeoni in lower 55%, warmly holding a blank cream notebook, tiny water droplet and green sprout. Airy blush, pearl ivory, lavender moonlit garden. Upper 42% quiet for dark plum Korean text. No fake chart, logos or extra characters.

## 숙요 보조 배경
`assets/moon-distance-generated.webp`. 인물 없는 신규 생성. 사주 중심 전환 전 제작했으며 관계 노트 보조 시리즈에 사용.

Prompt: Instagram editorial illustration, premium Korean fortune-telling app aesthetic, moonlit fantasy, elegant East Asian celestial symbolism, soft cinematic lighting, modern mobile friendly composition, ample negative space for Korean typography, no embedded text, consistent CODE DESTINY visual identity. Portrait 4:5. Deep midnight indigo, muted lavender, pearl moonlight. Two small luminous moons in lower half, linked loosely by a fine blush-red silk thread. Mist and delicate pale flowers, quiet dark upper 50%. No people, mascot, lettering, fake UI, dragons or talismans.

## 정본2개 참조 교사 연이 — 미채택
두 사용자 프로필 참조 후 노트를 든 투명 연이를 요청했으나 반환 PNG가 RGB이며 체크무늬 배경이 실제 픽셀에 들어갔다. 투명 자산으로 쓰지 않았다. 도구 기본 생성 폴더의 원본 보존. 추후 재생성 시 단색 배경 일러스트로 요청하거나 실제 알파를 확인한다.

## 다음 생성용 고정 입력
연이: `C:\Users\user\Desktop\CodeDestiny-Build\연이 프로필1.png`, `C:\Users\user\Desktop\CodeDestiny-Build\연이 프로필2.png` 두 장을 모두 view_image로 확인하고 referenced_image_paths에 넣는다.
네오: 같은 폴더 `네오프로필1.png`, `네오프로필2.png`를 모두 확인해 참조. 이번 작업에서 네오를 새로 그리지 않았다.
모든 프롬프트에 위 9개 영문 스타일 조건을 유지. 실제 이미지 포맷은 확장자가 아닌 디코딩 결과로 확인한다. Instagram 전달 전 JPG/PNG의 글자·표정·색감·폰 크기 가독성을 확인한다.
