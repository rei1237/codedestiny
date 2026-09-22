# 영냥이 상담 작업 큐 연결

## 구현과 활성화 경계

결제 확정은 상담 ID를 큐로 보내고, 소비자는 서버 스냅샷과 결제 증명을 다시 읽어 다음 미저장 챕터 하나를 처리한다. 챕터 저장·재조회 후 다음 메시지를 보낸다. 소비자 실행 중 브라우저는 필요하지 않다. 기존 10분 복구는 등록 실패·메시지 유실을 복구한다.

큐 리소스 생성과 운영 배포는 승인되지 않았으므로 기본 배포 설정에 아직 존재하지 않는 리소스를 넣지 않는다. 이 상태에서는 기존 주기 복구가 서버에서 진행하며 즉시 큐 처리는 활성화되지 않는다. 자동 staging 배포가 큐를 임의 생성하는 것도 방지한다.

승인 후 사용할 **전체 설정**은 다음 오프라인 명령으로 준비한다. 기존 환경의 vars·라우트·비밀정보 참조를 보존하고 큐 바인딩만 추가한다. 출력에는 비밀 값이 없으며 파일 생성 외 동작은 없다.

```powershell
node scripts/prepare-yeongnyangi-queue-config.mjs --target=staging --output="$env:TEMP/yeongnyangi-staging.toml"
node scripts/prepare-yeongnyangi-queue-config.mjs --target=production --output="$env:TEMP/yeongnyangi-production.toml"
```

승인된 릴리스에서는 `yeongnyangi-consultation-staging`과 `yeongnyangi-consultation-production` 큐를 각각 생성하고 해당 설정의 `queues.producers`·`queues.consumers`를 각 환경 정본에 반영한다. 동일한 큐를 두 환경에서 공유하지 않는다. 설정 parity 검사는 큐 소비자를 인식하고 두 환경의 큐 이름이 다른지 검사한다. 공식 CI/릴리스 절차로 활성화한다. 이 문서는 생성·업로드·배포 승인이 아니다.

## 제한과 복구

- 메시지에는 `requestId`만 포함한다. 원문 질문·출생정보·토큰은 큐와 로그에 넣지 않는다.
- 배치 1, 동시 소비자 2. 챕터별 90초 provider 제한과 DB 저장 여유를 유지한다.
- 챕터 호출은 자동 3회까지, 30초·120초 대기. 메시지 재전달과 수동 복구도 상담 총 호출 예산을 초기화하지 않는다.
- 큐 재전달은 최대 5회다. 이후에도 DB의 미완료 주문이 주기 복구의 근거이며, 자동 중단된 상담은 재등록하지 않는다.
- 중복 메시지·결제 콜백·새로고침은 동일 주문·챕터 잠금을 사용한다. 저장된 챕터를 덮어쓰지 않는다.
- 큐가 생성된 뒤에만 실제 연결·재전달·최장 상담의 완료 시간·실기기 이탈을 검증한다. 현재 mock 결과를 운영 검증으로 취급하지 않는다.

## 관측

`[yeongnyangi-queue]`의 상담 ID·저장 챕터 수·오류 코드와 `[yeongnyangi-recovery]`의 집계만 사용한다. `AUTOMATIC_RECOVERY_STOPPED`는 사용자 복구 가능 상태이고 `GENERATION_REVIEW_REQUIRED`는 총 예산 소진으로 추가 확인이 필요한 상태다. 운영 장애 사례의 로그는 이번 구현에서 확보하지 않았다.
