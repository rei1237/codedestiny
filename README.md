# CODE DESTINY Admin Portal (Secure Flower)

이 프로젝트는 기존 `Next.js + Express(API)` 기반으로 동작하며, 관리자 포털은 **비밀 32자리 해시 경로**에서만 서빙됩니다.

## 1) 요구사항

- Node.js >= 20
- MongoDB (프로젝트 기존 설정 사용)
- `ADMIN_SECRET_HASH`, `ADMIN_ALLOWED_IPS` 등 관리자용 환경변수 설정

## 2) 설치

```bash
npm install
```

## 3) 환경변수 설정

### 관리자 환경변수

기본 예시는 `admin/.env.example` 를 참고하세요.

필수:
- `ADMIN_SECRET_HASH` : 32자리 랜덤 해시 (실제 값은 소스코드에 남기지 말 것)
- `ADMIN_ALLOWED_IPS` : 허용할 IP 목록(콤마 구분)
- `JWT_SECRET` : 기존 Express JWT 서명 비밀(토큰 검증에 사용)

선택:
- `ADMIN_SMTP_*` : 로그인 잠금 해제(이메일 인증) 기능을 위한 SMTP 설정

## 4) 실행

API 서버:

```bash
npm run api
```

웹(Next) 서버:

```bash
npm run dev
```

## 5) 관리자 접근

1. 관리자 로그인 후 세션 쿠키가 발급됩니다.
2. 사이트 화면 하단의 🌸 버튼이 보이면 버튼을 눌러 비밀 경로로 이동합니다.
3. 관리자 포털은 로그인(2FA 포함) -> 대시보드 순으로 동작합니다.

## 6) 보안 참고

- 접근 거부는 사용자에게 `403`를 노출하지 않고 `404`로 위장합니다.
- 세션은 쿠키 기반으로 발급되며, CSRF는 Double Submit Cookie 패턴을 가정합니다.
- 비활동 로그아웃(30분)은 서버 상태값/토큰 정책 확장을 통해 구성됩니다.

