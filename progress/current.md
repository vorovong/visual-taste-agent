# Visual Taste Agent - Progress

## 현재 상태

- **단계**: M1~M13 전체 구현 완료 (M11 매체확장, M12 UX개선, M13 대시보드/테마/관련)
- **완료**: DB, 봇, Puppeteer, 웹앱(인증+갤러리+상세+평가+대시보드), UI 엘리베이션, 에이전트 DB 연동, Docker+Fly.io 배포, 매체 확장(파일업로드+Gemini Vision), UX(스와이프+검색모달+무한스크롤), 대시보드(레벨+인사이트+테마+관련레퍼런스)
- **검증**: 프로덕션 빌드 성공. 전체 15개 태스크 완료.
- **URL**: https://visual-taste-agent.fly.dev/
- **남은 작업**: 재배포 (M11-M13 반영)
- **블로커**: 없음

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
  NEXTAUTH_URL=https://visual-taste-agent.fly.dev \
  GEMINI_API_KEY=your_key

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

### Phase 6: M11 매체 확장 (완료)
- [x] M11-1: DB 스키마 확장 (contentType, sourceDomain, originalFilename)
- [x] M11-2: sharp 이미지 처리 (dominant color, thumbnail, PDF 렌더링)
- [x] M11-3: Gemini 3 Flash Vision API (디자인 분석)
- [x] M11-4: 텔레그램봇 파일 업로드 (사진/문서/PDF)
- [x] M11-5: API cursor-based pagination + 필터 확장
- [x] M11-6: 갤러리 UI (무한스크롤, Cmd+K 검색, 웹 업로드, 필터바)
- [x] M11-7: 통합 테스트

### Phase 7: M12 UX 개선 (완료)
- [x] M12-1: 스와이프 평가 모드 (터치 제스처 + 퀵 태그)
- [x] M12-2: 웹 업로드 UI + API (드래그앤드롭)
- [x] M12-3: 상세 페이지 (모바일 바텀시트, prev/next 네비)
- [x] M12-4: 통합 테스트

### Phase 8: M13 대시보드/테마/폴리싱 (완료)
- [x] M13-1: 대시보드 인사이트 (레벨 시스템 Lv.0~3, 취향 DNA, 에이전트 인사이트)
- [x] M13-2: CSS 변수 테마 (다크/라이트/시스템, 순환 토글)
- [x] M13-3: 관련 레퍼런스 (태그/도메인 기반 추천) + URL 안전성 폴리싱
- [x] M13-4: 최종 E2E 테스트 + 보고서

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
| 03-06 | monet.design 나노 분석 | 벤치마크 사이트 역공학 |
| 03-06 | Gemini 3 Flash Vision | 파일 기반 디자인 메타데이터 추출 (비용/성능 최적) |
| 03-06 | sharp + Puppeteer PDF | 이미지 컬러 추출 + PDF 1페이지 렌더링 |
| 03-06 | cursor-based pagination | 무한스크롤 지원, 오프셋 없는 효율적 페이지네이션 |
| 03-06 | 터치 스와이프 평가 | 모바일 원핸드 조작 최적화 |
| 03-06 | CSS custom properties 듀얼 테마 | 다크/라이트/시스템, localStorage 영속 |
| 03-06 | 태그 기반 관련 레퍼런스 | SQLite raw query, shared tag count 순위 |

---

## 아키텍처 요약

```
bot/index.ts               -- 텔레그램봇 (상주 프로세스)
bot/handlers/collect.ts    -- URL/사진/문서 수집 + Gemini 분석
app/                       -- Next.js 15 웹앱
app/api/agent/data/        -- 에이전트 데이터 API
app/api/references/        -- CRUD + cursor pagination
app/api/references/search/ -- 검색 API
app/api/stats/             -- 통계 + contentTypes + topDomains
app/api/upload/            -- 파일 업로드 API
app/evaluate/              -- 스와이프 평가 모드
app/ref/[id]/              -- 상세 페이지 (관련 레퍼런스 포함)
lib/db/                    -- SQLite + Drizzle
lib/capture/               -- Puppeteer 캡쳐 + 메타추출
lib/capture/image.ts       -- sharp 이미지 처리
lib/ai/gemini.ts           -- Gemini Vision API 클라이언트
lib/auth.ts                -- NextAuth v5 + Google OAuth
middleware.ts              -- 인증 미들웨어 + 보안 헤더
design-system/             -- 에이전트 산출물
Dockerfile                 -- 봇+웹앱 단일 컨테이너
fly.toml                   -- Fly.io 배포 설정
```
