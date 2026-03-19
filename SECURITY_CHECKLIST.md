# 관리자 포털 보안 체크리스트

이 문서는 “요청하신 보안 요구사항”을 기준으로 구현/연동 여부를 점검하기 위한 체크리스트입니다.

## 접근 제어

1. 관리자 전용 비밀 경로
   - `/${ADMIN_SECRET_HASH}/...` 만 서빙되는가?
   - 잘못된 경로는 `404`로 위장되는가?
2. `robots.txt` 차단
   - `/admin` 및 `/api/admin` 경로가 `Disallow` 되어 있는가?
3. IP 화이트리스트
   - Express/Next 양쪽에서 동일한 `ADMIN_ALLOWED_IPS` 정책을 적용하는가?
   - 차단 시 `403`이 노출되지 않고 `404`로 응답하는가?
4. Rate Limiting
   - 관리자 API 전체가 분당 60회 제한을 적용하는가?
   - 로그인 실패 횟수(5회)와 30분 잠금이 구현되어 있는가?

## 인증/세션

1. 아이디+비밀번호
   - 비밀번호는 bcrypt( salt rounds: 12 )로 해싱되어 있는가?
2. 2단계 TOTP 2FA
   - `otplib + qrcode` 기반 QR 출력이 동작하는가?
   - 백업코드 10개가 생성되고 bcrypt 해시로 저장되는가?
   - OTP 실패/백업코드 사용 시 로그가 남는가?
3. JWT 세션 쿠키 정책
   - Access 토큰: 15분
   - Refresh 토큰: 7일
   - 쿠키: `HttpOnly + Secure + SameSite=Strict` 적용 여부
   - 동시 세션 1개만 허용(리프레시 토큰 해시 비교) 여부
4. 비활동 30분 자동 로그아웃
   - 서버에서 비활동 시간 판정이 수행되는가?
   - 만료/미갱신 시 쿠키를 정리하고 접근을 차단하는가?

## CSRF/XSS/SQLi

1. CSRF
   - Double Submit Cookie 패턴 적용 여부
   - POST 요청에 `x-csrf-token` 검증이 강제되는가?
2. XSS
   - 관리자 UI에서 외부 입력을 DOM에 주입할 때 escape/검증을 하는가?
3. SQL Injection
   - MongoDB 쿼리에 대한 입력값 sanitize/validate 정책이 있는가?

## 감사 로그/알림

1. Audit Log
   - 로그인/로그아웃/2FA 설정/2FA 검증/중요 관리자 행동이 저장되는가?
2. 이상 접근 감지
   - 잠금 트리거/반복 실패/비정상 패턴이 email 알림으로 연결되는가?

## 운영 체크

1. HTTPS 강제
   - 토큰 쿠키 `Secure` 옵션에 의해 HTTPS에서만 쿠키가 전달되는가?
2. 콘솔/응답 메시지 민감정보 노출 금지
   - OTP/토큰/백업코드 원문이 로그/에러에 노출되지 않는가?

