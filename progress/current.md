# Visual Taste Agent - Progress

## 현재 상태

- **단계**: Phase 1~3 구현 완료 (M1~M8) + UI 퀄리티 엘리베이션 완료.
- **완료**: DB 스키마, 봇 마이그레이션(TS), Puppeteer 강화(메타추출), Next.js 웹앱(인증+갤러리+상세+평가+대시보드), E2E 테스트, UI 프리미엄 리디자인
- **검증**: Playwright 16/16 E2E 테스트 통과. 빌드 성공.
- **기존 자산**: ref-001, ref-002 DB 마이그레이션 완료. 스크린샷 새 경로로 복사됨.
- **다음**: Phase 4 (M9: 에이전트 DB 연동) + Phase 5 (M10: 배포)
- **블로커**: 없음

---

## 구현 상태 체크리스트

### Phase 1: 기반 (완료)
- [x] M1: TypeScript + SQLite + Drizzle ORM 설정
- [x] M2: 봇 JS->TS 마이그레이션, v2 플로우 (URL -> 캡쳐 -> pending)
- [x] M3: Puppeteer 메타데이터 추출 (colors, fonts, layout, framework)

### Phase 2: 웹앱 코어 (완료)
- [x] M4: Next.js 15 + Google OAuth + 이메일 화이트리스트
- [x] M5: 갤러리 (그리드 + 필터 + 검색 + 정렬)
- [x] M6: 상세 페이지 (멀티뷰포트 + iframe/스크린샷 + 메타데이터)

### Phase 3: 인터랙션 (완료)
- [x] M7: 평가 시스템 (verdict + 해시태그 + taste_log)
- [x] M8: 대시보드 (통계 + 미평가 CTA + 인기 태그)

### UI 퀄리티 엘리베이션 (완료, Ralph Loop 10회)
- [x] 로그인: 그래디언트 배경, 글래스모피즘, Google 아이콘
- [x] 갤러리 카드: 호버 엘리베이션, 스켈레톤 로딩, verdict 배지
- [x] 헤더: 로고 마크, 미평가 펄스 인디케이터
- [x] 대시보드: StatCard 아이콘, 진행률 바, 접기 애니메이션
- [x] 필터바: 세그먼트 컨트롤, 검색 아이콘
- [x] 상세 페이지: 디바이스 아이콘, verdict 아이콘, 컬러 스와치 복사
- [x] 해시태그: 키보드 네비게이션, 해시 아이콘
- [x] 모바일 바텀 네비게이션 (4탭)
- [x] 404 페이지, 빈 상태, 스크롤 투 탑
- [x] focus-visible 링, lazy loading, 카드 진입 애니메이션
- [x] iOS safe area, 터치 타겟 48px

### Phase 4: 에이전트 통합 (미착수)
- [ ] M9: 에이전트 DB 연동 + 패턴 추출

### Phase 5: 배포 (미착수)
- [ ] M10: Docker + Railway/Fly.io 배포

---

## 실행 방법

```bash
# DB 초기화
npm run migrate

# 기존 레퍼런스 마이그레이션 (최초 1회)
npm run migrate:refs

# 봇 실행
npm run bot

# 웹앱 개발 서버
npm run dev

# 웹앱 빌드
npm run build
```

---

## 핵심 결정 로그

| 날짜 | 결정 | 근거 |
|---|---|---|
| 03-05 | 전권 위임 모드 | 사용자 요청 |
| 03-05 | Node.js + grammy + Puppeteer | 캡쳐 네이티브, 기존 검증 |
| 03-06 | v2 피벗: 웹앱 추가 | 사용자 피드백 |
| 03-06 | SQLite + Drizzle + WAL 모드 | 단일 사용자, 봇/웹앱 동시 접근 |
| 03-06 | "references" 테이블명 따옴표 | SQLite 예약어 충돌 |
| 03-06 | .js 확장자 import 제거 | Next.js webpack이 .js 확장자 resolve 불가 |
| 03-06 | Tailwind CSS v4 + @tailwindcss/postcss | tailwind.config 불필요, CSS-first 설정 |
| 03-06 | NextAuth v5 beta | App Router 네이티브 지원 |
| 03-06 | Server Component + Client Component 분리 | 메인/상세 페이지 SSR + 인터랙션 CSR |
| 03-06 | Playwright E2E 테스트 도입 | 자동 페이지 검증, SKIP_AUTH 환경변수로 dev 바이패스 |
| 03-06 | Ralph Loop 10회로 UI 퀄리티 엘리베이션 | monet.design 벤치마크 수준으로 |
| 03-06 | 모바일 바텀 네비 도입 | CLAUDE.md 디바이스별 UX 원칙 준수 |
| 03-06 | white/[opacity] 컬러 패턴 통일 | 다크 테마에서 일관된 표면 계층 |
| 03-06 | 순수 Tailwind (shadcn/ui 미사용) | 의존성 최소화, 커스텀 자유도 |

---

## 아키텍처 요약

```
bot/index.ts          -- 텔레그램봇 (tsx로 실행, 별도 프로세스)
app/                  -- Next.js 15 웹앱
lib/db/               -- SQLite + Drizzle (봇/웹앱 공유)
lib/capture/          -- Puppeteer 캡쳐 + 메타추출
lib/auth.ts           -- NextAuth v5 + Google OAuth
middleware.ts         -- 인증 미들웨어
public/screenshots/   -- 캡쳐 이미지 (ID별 폴더)
data/vta.db           -- SQLite DB (WAL 모드)
```
