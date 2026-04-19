# 🔧 `scripts/` — 빌드 & 배포 자동화

> 이 폴더는 **프로젝트 빌드, 배포, 동기화를 자동화하는 Node.js 스크립트**를 포함합니다.

---

## 📂 **구조**

```
verify-runtime-cache-sync.mjs          → ✅ 런타임 캐시 검증
sync-legacy-static-to-public.mjs       → 🔄 index.html 동기화

... (package.json의 "scripts" 섹션에서 호출됨)
```

---

## 🎯 **핵심 스크립트**

### **1. Runtime Cache 검증**
```bash
npm run verify-runtime-cache-sync
```

**역할**:
- `js/core/index-inline-runtime.js`와 `public/js/core/index-inline-runtime.js` 동기화 확인
- 해시 비교로 파일 일치 여부 검증
- 불일치 시 동기화 경고

**실행 시기**: 배포 전 최종 검증

### **2. 정적 파일 동기화**
```bash
npm run sync-legacy-static-to-public
```

**역할**:
- `root/index.html` → `public/static/index.html` 복사
- 레거시 와 배포 버전 일치성 유지
- 다국어 파일도 자동 동기화

**실행 시기**: 빌드 파이프라인 중간

---

## 🚀 **npm scripts (package.json)**

```json
"scripts": {
  "build": "next build",              // Next.js 빌드
  "build:cf": "npm run build && ...", // Cloudflare 배포 빌드
  "dev": "next dev",                  // 로컬 개발 서버
  "verify-runtime-cache-sync": "node scripts/verify-runtime-cache-sync.mjs",
  "sync-legacy-static-to-public": "node scripts/sync-legacy-static-to-public.mjs"
}
```

---

## 🔄 **자동화 흐름**

```
git push
   ↓
[Cloudflare CI]
   ↓
npm run build
   ├─ Next.js 컴파일
   ├─ TypeScript 타입 검사
   └─ 정적 파일 생성
   ↓
scripts/sync-legacy-static-to-public.mjs
   ├─ root/index.html → public/ 복사
   └─ 다국어 파일 동기화
   ↓
npm run verify-runtime-cache-sync
   ├─ 파일 해시 비교
   └─ 일치 확인
   ↓
배포 완료 (code-destiny-web.pages.dev)
```

---

## ⚙️ **수동 실행 명령어**

```bash
# 빌드 (로컬)
npm run build

# 캐시 동기화 검증
npm run verify-runtime-cache-sync

# 레거시 파일 동기화 (수동)
npm run sync-legacy-static-to-public

# 전체 배포 빌드 (Cloudflare)
npm run build:cf
```

---

## 🛠️ **개발 중 체크리스트**

```
[ ] 파일 수정 (js/, public/, app/ 등)
[ ] npm run build (로컬 검증)
[ ] npm run verify-runtime-cache-sync (동기화 확인)
[ ] git status (변경사항 확인)
[ ] git add -- [파일] (선택적 스테이징)
[ ] git commit -m "feat/fix: [설명]"
[ ] git push origin main (배포 트리거)
```

---

## 📌 **주의사항**

### **⚠️ 수동 동기화 필수**
```
root/index.html 수정 시:
→ npm run sync-legacy-static-to-public 실행
   또는 Cloudflare CI가 자동 실행
```

### **⚠️ 파일 불일치 감지**
```
npm run verify-runtime-cache-sync에서 경고 시:
→ 해시 불일치 (파일이 다름)
→ 동기화 스크립트 재실행
```

### **⚠️ 배포 시간**
```
git push → Cloudflare CI 시작
└─ 빌드: ~2-3분
└─ 배포: ~1-2분
└─ 총 소요: ~5분 내
```

---

## 🚀 **빠른 시작**

### **새 기능 배포**
```bash
# 1. 파일 수정
vi app/new-feature/page.tsx

# 2. 빌드 검증
npm run build

# 3. 커밋
git add -- app/new-feature/page.tsx
git commit -m "feat: new feature"

# 4. 배포
git push origin main

# 5. 결과 확인
# → https://code-destiny-web.pages.dev 확인 (1-5분 후)
```

### **긴급 수정**
```bash
# 1. 파일 수정 (예: 텍스트)
vi public/index.html

# 2. 동기화 확인
npm run verify-runtime-cache-sync

# 3. 빠른 배포
git add -- public/index.html
git commit -m "fix: text update"
git push origin main
```

---

## 📊 **배포 환경 변수**

```bash
# Cloudflare Pages 환경에서 자동 설정됨
CI=true
BRANCH=main
DEPLOYMENT_ID=[auto-generated]
```

---

## 🎯 **다음 단계**

- 로컬에서 `npm run build` 후 오류 없는지 확인
- `npm run verify-runtime-cache-sync`로 파일 동기화 검증
- `git push` 후 5분 내 배포 완료 대기

📖 **더 자세히**: [QUICK_START.md](../QUICK_START.md) & [PROJECT_STRUCTURE.md](../PROJECT_STRUCTURE.md)
