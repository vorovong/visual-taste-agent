# Visual Taste Agent

비디자이너의 시각적 취향을 발견하고, 디자인 언어로 체계화하는 시스템.

## 왜 만들었나

좋은 디자인을 보면 "좋다"는 건 안다. 하지만 **왜 좋은지** 디자인 언어로 설명할 수 없다. AI 도구(V0, Bolt 등)로 UI를 생성해도 결과가 제네릭하다 — "내 UI"가 아니다.

핵심 병목은 **생성이 아니라 평가**다. "별론데 왜인지 모름" 상태를 "정보 밀도가 높아서 별로"로 끌어올리는 것. 비평 AI보다 **취향 추출**이 먼저다.

레퍼런스를 모으고, 좋고 싫음을 판단하고, 그 판단들에서 패턴을 뽑아내면 — 결국 나만의 디자인 시스템이 된다.

## 어떻게 동작하나

```
텔레그램으로 URL 전송 (5초)
        ↓
자동 캡처 + 디자인 메타데이터 추출
        ↓
웹앱에서 갤러리 열람 + 평가 (좋아요/패스/삭제 + 해시태그)
        ↓
에이전트가 패턴 추출 → 토큰화 → 디자인 시스템 생성
```

### 3개 컴포넌트

| 컴포넌트 | 역할 | 기술 |
|---|---|---|
| **텔레그램봇** | 수집 (URL → 캡처 → DB) | Grammy, Puppeteer |
| **웹앱** | 열람 + 평가 (갤러리 → 상세 → 판정) | Next.js 15, Tailwind v4, NextAuth v5 |
| **에이전트** | 분석 (패턴 추출 → 디자인 시스템) | Claude Code Agent |

### 수집 → 평가 분리

수집은 빨라야 한다. URL만 던지면 pending으로 저장 (5초). 평가는 웹앱에서 나중에 배치로. 양이 먼저, 판단은 나중.

### 레벨 시스템

```
Lv.0  빈 상태           → "레퍼런스를 보여주세요"
Lv.1  5개+ 평가         → 해시태그 제안, 초기 패턴
Lv.2  20개+ 평가        → 그룹 탭 자동 생성, 패턴 안정화
Lv.3  패턴 안정화       → 디자인 토큰 제안
Lv.4  토큰 확정         → 비평 모드 + 트렌드 비교
Lv.5  시스템 수렴       → 완성본 디자인 시스템
```

## 기술 스택

- **프론트엔드**: Next.js 15 App Router + Tailwind CSS v4 + TypeScript
- **인증**: NextAuth v5 + Google OAuth (단일 사용자 화이트리스트)
- **DB**: SQLite + Drizzle ORM (WAL 모드, 봇/웹/에이전트 공유)
- **캡처**: Puppeteer (스크린샷 + CSS 컬러/폰트/레이아웃 추출)
- **봇**: Grammy (텔레그램)
- **배포**: Fly.io (Docker, persistent volume, Tokyo 리전)
- **테스트**: Playwright E2E

## 로컬 실행

```bash
# 환경변수 설정
cp .env.example .env
# .env에 TELEGRAM_BOT_TOKEN, GOOGLE_CLIENT_ID 등 입력

# 의존성 설치
npm install

# DB 초기화
npm run migrate

# 웹앱 (localhost:3000)
npm run dev

# 텔레그램봇 (별도 터미널)
npm run bot
```

## 배포

Fly.io에 Docker 컨테이너로 배포. 봇 + 웹앱이 하나의 컨테이너에서 SQLite를 공유.

```bash
flyctl auth login
flyctl launch --no-deploy
flyctl volumes create vta_data --region nrt --size 1
flyctl secrets set TELEGRAM_BOT_TOKEN=... GOOGLE_CLIENT_ID=... # etc
flyctl deploy
```

## 프로젝트 구조

```
bot/                  텔레그램봇 (수집)
app/                  Next.js 웹앱 (열람 + 평가)
  api/agent/data/     에이전트 데이터 API
  components/         UI 컴포넌트
  ref/[id]/           레퍼런스 상세 페이지
lib/
  db/                 SQLite + Drizzle 스키마
  capture/            Puppeteer 캡처 + 메타추출
  auth.ts             NextAuth 설정
design-system/        에이전트 산출물 (패턴, 토큰, 시스템)
```

## 앞으로

이 프로젝트는 **개인 디자인 감각의 구조화** 실험이다.

**단기 (v2.1)**
- 해시태그 자동 제안 (빈도 기반)
- 에이전트의 패턴 추출 자동화 (Lv.2+)
- 유사 레퍼런스 리서치 기능

**중기 (v3)**
- 디자인 토큰 생성 → V0/Bolt에 주입 가능한 형태로 export
- 비평 모드: "이 UI를 내 취향으로 평가하면?"
- 트렌드 비교: "2026 트렌드 중 내가 좋아하는 것은?"

**장기**
- `/visual` 모듈로서 개인 지식 허브에 통합
- 다른 모듈 (`/knowledge`, `/meeting` 등)과 크로스 도메인 연결
- 디자인 시스템 완성 후 모든 프로젝트 UI에 일관 적용

## 개발 맥락

이 프로젝트는 Claude Code에 전권을 위임하여 end-to-end로 구현되었다. 아키텍처, 기술 스택, 구현 순서 모두 AI가 판단하고 실행. UI 품질은 [Ralph Wiggum 기법](https://ghuntley.com/ralph/) (반복 루프 10회)으로 MVP에서 프로덕션급으로 끌어올림.

## License

MIT
