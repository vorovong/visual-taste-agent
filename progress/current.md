# Visual Taste Agent - Progress

## 현재 상태

- **단계**: M1~M10 전체 구현 + Fly.io 배포 완료!
- **완료**: DB, 봇, Puppeteer, 웹앱(인증+갤러리+상세+평가+대시보드), UI 엘리베이션, 에이전트 DB 연동, Docker+Fly.io 배포
- **검증**: Playwright 16/16 E2E 통과. 빌드 성공. 배포 성공.
- **URL**: https://visual-taste-agent.fly.dev/
- **남은 작업**: 없음 (Google OAuth 리디렉션 URI 추가 완료)
- **블로커**: 없음
- **GitHub**: https://github.com/minhokim/visual-taste-agent

---

## 배포 가이드

```bash
# 1. Fly.io CLI 설치
curl -L https://fly.io/install.sh | sh

# 2. 로그인
flyctl auth login

# 3. 앱 생성 + 볼륨 생성
flyctl launch --no-deploy
flyctl volumes create vta_data --region nrt --size 1

# 4. 환경변수 설정
flyctl secrets set \
  TELEGRAM_BOT_TOKEN=your_token \
  ALLOWED_CHAT_ID=6888996945 \
  GOOGLE_CLIENT_ID=your_id \
  GOOGLE_CLIENT_SECRET=your_secret \
  ALLOWED_EMAIL=vorovong@gmail.com \
  NEXTAUTH_SECRET=$(openssl rand -base64 32) \
  NEXTAUTH_URL=https://visual-taste-agent.fly.dev

# 5. 배포
flyctl deploy

# 6. Google OAuth 리디렉션 URI 추가
# Google Cloud Console에서 https://visual-taste-agent.fly.dev/api/auth/callback/google 추가
```

---

## 구현 상태 체크리스트

### Phase 1: 기반 (완료)
- [x] M1: TypeScript + SQLite + Drizzle ORM 설정
- [x] M2: 봇 JS->TS 마이그레이션, v2 플로우
- [x] M3: Puppeteer 메타데이터 추출

### Phase 2: 웹앱 코어 (완료)
- [x] M4: Next.js 15 + Google OAuth
- [x] M5: 갤러리 (그리드 + 필터 + 검색)
- [x] M6: 상세 페이지 (멀티뷰포트 + 메타데이터)

### Phase 3: 인터랙션 (완료)
- [x] M7: 평가 시스템 (verdict + 해시태그)
- [x] M8: 대시보드 (통계 + 진행률)

### UI 퀄리티 엘리베이션 (완료)
- [x] Ralph Loop 10회: 로그인/카드/헤더/대시보드/필터/상세/해시태그/404/모바일 바텀네비

### Phase 4: 에이전트 통합 (완료)
- [x] M9: GET /api/agent/data, 에이전트 정의 업데이트, profile.md 자동 생성

### Phase 5: 배포 (완료)
- [x] M10: 보안 헤더, Dockerfile, fly.toml, docker-entrypoint.sh
- [x] 실제 Fly.io 배포 완료 (2026-03-06)

---

## 실행 방법

```bash
# 로컬 개발
npm run migrate        # DB 초기화
npm run dev            # 웹앱
npm run bot            # 텔레그램봇

# 프로필 생성
npm run profile        # design-system/profile.md 갱신

# 에이전트
claude --agent design-system

# 배포
flyctl deploy
```

---

## 핵심 결정 로그

| 날짜 | 결정 | 근거 |
|---|---|---|
| 03-05 | 전권 위임 모드 | 사용자 요청 |
| 03-06 | v2 피벗: 웹앱 추가 | 사용자 피드백 |
| 03-06 | SQLite + Drizzle + WAL | 단일 사용자, 봇/웹앱 동시 접근 |
| 03-06 | Tailwind v4 CSS-first | tailwind.config 불필요 |
| 03-06 | Ralph Loop 10회 UI 엘리베이션 | monet.design 벤치마크 |
| 03-06 | 모바일 바텀 네비 | 디바이스별 UX 원칙 |
| 03-06 | Fly.io 무료 티어 배포 | 비용 0, Puppeteer 지원 |
| 03-06 | standalone output + Chromium | Docker 최적화 |
| 03-06 | 봇+웹앱 단일 컨테이너 | SQLite 공유, 단순화 |
| 03-06 | force-dynamic DB 페이지 | 빌드 시 SSG가 DB 접근 방지 |
| 03-06 | AUTH_TRUST_HOST=true | Fly.io 프록시 뒤 NextAuth 필수 |

---

## 아키텍처 요약

```
bot/index.ts          -- 텔레그램봇 (상주 프로세스)
app/                  -- Next.js 15 웹앱
app/api/agent/data/   -- 에이전트 데이터 API
lib/db/               -- SQLite + Drizzle
lib/capture/          -- Puppeteer 캡쳐 + 메타추출
lib/auth.ts           -- NextAuth v5 + Google OAuth
middleware.ts         -- 인증 미들웨어 + 보안 헤더
design-system/        -- 에이전트 산출물
Dockerfile            -- 봇+웹앱 단일 컨테이너
fly.toml              -- Fly.io 배포 설정
```
