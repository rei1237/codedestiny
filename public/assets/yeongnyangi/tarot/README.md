# 영냥이 타로 에셋

`v1/`은 Phase 4a의 **메이저 22장 전용** 정적 배포 에셋이다. 마이너 56장은 아직 포함하지 않는다. 유료 결과 화면은 기존 덱을 유지하며 새 registry는 아직 호출부에 연결하지 않았다.

- 정본: `docs/design/yeongnyangi-tarot/asset-sources.json`(승인 원본·프레임 적용본의 상대 경로와 SHA256), 기존 `art-ledger.jsonl`.
- PNG 원본: 저장소 밖 `D:\Development\yeongnyangi-tarot-art`. 배포·커밋하지 않는다.
- 22장 + 뒷면 C + 프레임 × 240/600/1200w × WebP/AVIF = 144개. 프레임 SVG도 별도로 둔다.
- 승인된 프레임 적용본을 인코딩한다. 그림 속 카드명·번호는 추가하지 않고 i18n 오버레이용 명패를 유지한다.
- 원본은 1024×1536이다. 1200×1800은 확대본이며 새로운 원본 세부를 제공하지 않는다.
- 앞면 WebP q90, AVIF q60/4:4:4. 뒷면·프레임은 lossless. 뒷면은 크기마다 위 절반을 180도 복제하고 디코딩 픽셀 대칭을 검증한다.
- 기존 에셋을 덮어쓰지 않는다. v1 승인·출시 후 그림 변경은 새 버전 경로로 한다.
- SVG 텍스트의 SHA256은 LF로 정규화해 Windows와 Linux CI에서 같은 값을 사용한다. PNG와 배포용 래스터 파일은 바이트 그대로 해시한다.
- 역방향은 향후 화면의 CSS 회전으로 처리한다. 역방향 파일은 없다.
- 5개 사이트 로케일(ko/en/ja/zh-CN/zh-TW)의 카드명·alt 키가 있다. 기타 상담 언어는 en으로 폴백한다.
- `resolveTarotDeckCard`의 이미지 실패 결과는 영냥이 뒷면 + 카드명이다. 연이 이미지를 영냥이 폴백으로 쓰지 않는다. 실제 onError UI 연결은 후속 단계다.
- 호스트에서 읽은 manifest를 `createTarotDeckRegistry(manifest)`에 전달해 registry를 만든다. 공용 모듈은 JSON import 속성이나 파일시스템에 의존하지 않는다.

재생성(원본 디렉터리가 있는 로컬에서만):

```powershell
npm run tarot:assets:build -- --art-root=D:/Development/yeongnyangi-tarot-art
npm run verify:yeongnyangi-tarot-assets
```

CI는 원본 디렉터리 없이 배포 에셋의 스키마·파일 수·인코딩 해시·크기·i18n·뒷면 대칭·승인 원본 원장을 검증한다. `--full` 검사는 78장 전용이므로 Phase 4a에서는 의도적으로 실패한다.

```powershell
npm run verify:yeongnyangi-tarot-assets -- --full
```
