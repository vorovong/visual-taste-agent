# Visual Taste Agent v2 -- 마일스톤 + 실행 순서

---

## 마일스톤 개요

```
Phase 1: 기반 (DB + 봇 마이그레이션)
  M1: DB 스키마 + 공유 라이브러리
  M2: 봇 마이그레이션 (마크다운 -> DB)
  M3: Puppeteer 강화 (디자인 메타데이터 추출)

Phase 2: 웹앱 코어
  M4: Next.js 스캐폴딩 + 인증
  M5: 갤러리 (그리드 + 필터)
  M6: 상세 페이지 (프리뷰 + 메타데이터)

Phase 3: 인터랙션
  M7: 평가 시스템 (verdict + 해시태그)
  M8: 대시보드

Phase 4: 에이전트 통합
  M9: 에이전트 DB 연동 + 패턴 추출

Phase 5: 배포 + 안정화
  M10: 보안 강화 + 배포
```

---

## Phase 1: 기반

### M1: DB 스키마 + 공유 라이브러리

**목표**: SQLite + Drizzle ORM 설정, 공유 코드 구조

- [ ] TypeScript 전환 (tsconfig, ts-node 설정)
- [ ] drizzle-orm + better-sqlite3 설치
- [ ] lib/db/schema.ts (references, screenshots, hashtags, reference_hashtags, design_metadata, taste_log, design_systems)
- [ ] lib/db/index.ts (DB 연결, 싱글턴)
- [ ] lib/db/migrate.ts (초기 마이그레이션)
- [ ] drizzle.config.ts
- [ ] lib/types.ts (공유 타입)
- [ ] data/ 폴더 생성, .gitignore에 data/*.db 추가

### M2: 봇 마이그레이션

**목표**: 텔레그램봇 저장소를 마크다운 -> DB로 전환, 플로우 간소화

- [ ] bot/index.ts (기존 index.js를 TS로 전환)
- [ ] bot/handlers/collect.ts (v2 플로우: URL -> 캡쳐 -> pending 저장. 평가 단계 제거)
- [ ] lib/reference.ts -> lib/db 쿼리로 대체
- [ ] 기존 ref-001, ref-002를 DB로 마이그레이션하는 스크립트
- [ ] 봇에 chat_id 화이트리스트 적용
- [ ] 동작 확인 (텔레그램으로 URL 보내기 -> DB 확인)

### M3: Puppeteer 강화

**목표**: 스크린샷 + 디자인 메타데이터 자동 추출

- [ ] lib/capture/index.ts (기존 scripts/capture.js 이동 + TS 전환)
- [ ] 메타데이터 추출 추가:
  - [ ] 컬러 팔레트 (background-color, color, button 색상 등)
  - [ ] 폰트 정보 (font-family, size, weight)
  - [ ] 레이아웃 구조 (display, grid/flex, gap/padding)
  - [ ] 프레임워크/라이브러리 감지 (meta generator, script src)
- [ ] X-Frame-Options 헤더 체크 -> iframe_allowed 플래그
- [ ] 추출 결과를 design_metadata 테이블에 저장

---

## Phase 2: 웹앱 코어

### M4: Next.js 스캐폴딩 + 인증

**목표**: Next.js 15 App Router + Google OAuth

- [ ] Next.js 15 초기화 (App Router, TypeScript)
- [ ] Tailwind CSS + shadcn/ui 설치
- [ ] NextAuth v5 + Google OAuth Provider 설정
- [ ] 이메일 화이트리스트 미들웨어 (.env의 ALLOWED_EMAIL)
- [ ] 기본 레이아웃 (헤더 + 메인 + 푸터, monet.design 스타일)
- [ ] 미인증 시 로그인 페이지 리다이렉트

### M5: 갤러리 (그리드 + 필터)

**목표**: monet.design 스타일 카드 그리드

- [ ] 메인 페이지: 레퍼런스 카드 그리드
- [ ] 카드 컴포넌트 (스크린샷 썸네일, 제목, verdict 배지, 주요 해시태그)
- [ ] 필터바: verdict (좋아요/싫어요/미평가/전체) + 해시태그 필터
- [ ] 동적 그룹 탭 (DB에서 가장 많이 사용된 해시태그 기반 자동 생성)
  - [ ] 그룹 전환 드롭다운 (목적별 / 스타일별 / 전체)
- [ ] 검색
- [ ] 정렬 (최신순, 오래된순)
- [ ] API route: GET /api/references (쿼리 파라미터로 필터)

### M6: 상세 페이지

**목표**: monet.design 컴포넌트 상세와 동일한 레이아웃

- [ ] ref/[id]/page.tsx
- [ ] 프리뷰 영역:
  - [ ] Desktop/Tablet/Mobile 탭
  - [ ] iframe 시도 (iframe_allowed === true)
  - [ ] 스크린샷 폴백 (iframe 불가 시)
- [ ] 사이드바:
  - [ ] Verdict (좋아요/싫어요/삭제 버튼)
  - [ ] 해시태그 (기존 표시 + 추가)
  - [ ] Design Metadata: Colors (팔레트 시각화), Fonts, Layout
  - [ ] AI Analysis (에이전트 분석 결과)
  - [ ] Open in New Tab 링크
- [ ] API route: GET/PATCH /api/references/[id]

---

## Phase 3: 인터랙션

### M7: 평가 시스템

**목표**: 좋아요/싫어요/삭제 + 해시태그 선택

- [ ] Verdict 버튼 (like/dislike/delete) -> DB 업데이트 + taste_log 기록
- [ ] 해시태그 시스템:
  - [ ] 기존 해시태그 목록에서 선택 (usage_count순 정렬)
  - [ ] 새 해시태그 입력 (자동완성)
  - [ ] 해시태그 제거
- [ ] 그리드에서도 빠른 verdict 토글 가능
- [ ] API routes: POST /api/hashtags, POST /api/references/[id]/hashtags

### M8: 대시보드

**목표**: 통계 + 미평가 + 최근 추가

- [ ] 대시보드 섹션 (접기/펼치기):
  - [ ] 총 레퍼런스 수, 좋아요/싫어요/삭제 수
  - [ ] 미평가 레퍼런스 카운트 + [지금 평가하기] 링크 (클릭 시 미평가만 필터)
  - [ ] 최근 추가 갤러리 (가로 스크롤)
  - [ ] 에이전트 인사이트 (profile.md에서 추출, 있으면 표시)

---

## Phase 4: 에이전트 통합

### M9: 에이전트 DB 연동

**목표**: 에이전트가 DB를 직접 활용

- [ ] API route: GET /api/agent/data (전체 평가 데이터 + 메타데이터 JSON 덤프)
- [ ] .claude/agents/design-system.md 업데이트 (DB 쿼리 방법, API 엔드포인트)
- [ ] 에이전트 실행 시 DB에서 패턴 추출 -> design-system/patterns/ 갱신
- [ ] profile.md를 DB 데이터 기반으로 자동 생성하는 스크립트

---

## Phase 5: 배포 + 안정화

### M10: 보안 강화 + 배포

**목표**: 프로덕션 배포

- [ ] 환경변수 정리 (.env.example 갱신)
- [ ] CSP 헤더 설정 (iframe 보안)
- [ ] HTTPS 강제
- [ ] Dockerfile 작성 (봇 + 웹앱 단일 컨테이너)
- [ ] Railway 또는 Fly.io 배포
- [ ] 커스텀 도메인 설정 (선택)
- [ ] 봇 안정성 확인 (장시간 실행, 에러 핸들링)
- [ ] E2E 동작 확인

---

## 실행 순서

```
M1 -> M2 -> M3 -> M4 -> M5 -> M6 -> M7 -> M8 -> M9 -> M10
|--- Phase 1 ---|  |--- Phase 2 ---|  |- Phase 3-|  |4| |5|
     기반              웹앱 코어       인터랙션     통합 배포

사용자 액션 필요 지점:
  M1 전: Google OAuth 크리덴셜, 허용 이메일
  M4: OAuth 설정 확인
  M10: 배포 플랫폼 결정, 도메인 (선택)
```

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| 런타임 | Node.js (TypeScript) |
| 웹 프레임워크 | Next.js 15 (App Router) |
| UI | Tailwind CSS + shadcn/ui |
| 인증 | NextAuth v5 + Google OAuth |
| DB | SQLite (better-sqlite3) + Drizzle ORM |
| 텔레그램 | grammy |
| 캡쳐 | Puppeteer |
| 에이전트 | Claude Code custom agent (.claude/agents/) |
| 배포 | Railway 또는 Fly.io (Docker) |

---

## 오케스트레이션 전략

각 Phase 내 마일스톤은 순차 실행. Phase 간 의존성:
- Phase 1 완료 -> Phase 2 시작 가능
- Phase 2의 M5 완료 -> Phase 3의 M7 시작 가능 (병렬)
- Phase 4는 Phase 3 이후
- Phase 5는 전체 완료 후

**세션 단위 실행 계획**:
- 세션 1: M1 + M2 (DB + 봇 마이그레이션)
- 세션 2: M3 + M4 (Puppeteer 강화 + Next.js 스캐폴딩)
- 세션 3: M5 + M6 (갤러리 + 상세)
- 세션 4: M7 + M8 (평가 + 대시보드)
- 세션 5: M9 + M10 (에이전트 + 배포)
