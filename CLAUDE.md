# Visual Taste Agent v2 — 비디자이너의 시각적 취향 발견·체계화 시스템

---

## A. 프로젝트 개요

비디자이너가 자신의 시각적 취향을 발견하고, 디자인 언어로 체계화하여, 모든 시각 매체에서 "나다운 디자인"을 일관되게 만들 수 있게 하는 시스템.

- **최종 사용자**: 김민호 (40대, 개발자, 디자인 비전공, Claude Code + 아이폰 + 텔레그램 사용)
- **개발자**: Claude Code (전권 위임 -- end-to-end 자율 구현)
- **현재 문제**: 좋고 싫음은 아는데 "왜 좋은지" 디자인 언어로 표현 못함. AI 도구(V0, Bolt 등)의 결과가 제네릭함 -- "내 UI"가 아님. 레퍼런스가 산재하고 체계 없음.
- **해결**: 텔레그램으로 URL을 던지면 자동 캡쳐+메타추출 -> DB 저장 -> 웹앱에서 열람+평가 -> 패턴 추출 -> 토큰화 -> 디자인 시스템 -> 비평. 에이전트가 디렉터(나의 취향) x 프로듀서(청중 적합성)를 동시 수행.

---

## B. 사용자 맥락

- 개발자이지만, 프론트엔드 **디자인** 영역은 비전문가.
- AI 증강의 승수효과를 이해함: 기존능력(2) x AI배율(3) = 6. 디자이너(8) x 3 = 24. 핵심 병목은 **평가 능력**.
- 구조/논리에 대한 취향은 뚜렷하지만, **디자인 취향은 별개** -- 아직 발견·축적 단계.
- 모바일 사용성이 없으면 시스템 사용 중단. 텔레그램봇이 핵심 입력 채널.
- Opus를 튜터이자 협업자로 활용. 3개 프론티어 LLM 동시 사용.

---

## C. 행동 오버라이드

이 프로젝트는 **전권 위임** 모드로 진행한다.

- **end-to-end 자율 구현**: 아키텍처, 기술 스택, 구현 순서 모두 AI가 판단하고 실행.
- **판단 근거 기록**: 자율 실행하되, 모든 기술적 판단과 근거를 progress/current.md에 기록.
- **기존 자산 활용**: 지식 저장소의 논의 기록, `~/projects/` 하위의 기존 프로젝트 패턴을 참조.
- **부족한 것은 자체 해결**: 필요한 도구/라이브러리/스크립트가 없으면 직접 개발.
- **사용자 확인이 필요한 것**: 외부 서비스 API 키 입력, 배포, 비용 발생하는 결정만.

---

## D. 아키텍처 (v2)

### 설계 원칙

1. **타이핑 최소화**: 수집은 URL만, 평가는 탭으로, 이유는 해시태그 선택
2. **수집 먼저, 평가 나중**: URL 던지면 pending 저장 (5초). 평가는 웹에서 배치로
3. **분류는 데이터에서 성장**: 하드코딩 카테고리 없음. 해시태그 풀이 자라남
4. **하나의 테이스트 그래프**: 다차원 데이터(verdict/purpose/style/time) + 필터 조합
5. **디바이스별 UX 최적화**: 단순 반응형(flexible)이 아닌, 디바이스별 사용 맥락에 맞는 UI/UX. 모바일: 터치 타겟, 스와이프, 바텀 네비, 한손 조작. PC: 호버, 사이드바, 넓은 그리드, 키보드 네비. 구현 시 AI가 자율적으로 UI/UX 판단.

### 컴포넌트 구조

```
[텔레그램봇 프로세스]              [Next.js 프로세스]
  (수집: URL -> 캡쳐              (열람: 갤러리 + 평가)
   + 메타추출 -> DB)               (Google OAuth)
         |                              |
         v                              v
    +-----------+                 +-----------+
    | SQLite DB | <----------->  | SQLite DB |
    | (단일파일)  |                | (동일파일)  |
    +-----------+                 +-----------+
         ^
         |
    [Claude Code 에이전트]
    (패턴추출, 비평, 디자인시스템 생성)
```

### 3개 컴포넌트

1. **텔레그램봇** -- 수집 채널. URL 수신 -> Puppeteer 캡쳐 + 디자인 메타데이터 추출 -> DB 저장 (pending)
2. **Next.js 웹앱** -- 열람 채널. monet.design 벤치마크. 갤러리 + 상세 + 대시보드 + 평가(좋아요/싫어요/삭제 + 해시태그)
3. **에이전트 코어** -- `.claude/agents/design-system.md`. DB 쿼리 -> 패턴추출 -> 토큰화 -> 디자인시스템 생성 -> 비평

### 데이터 모델

```sql
references (id, url, title, verdict[nullable], source_type, iframe_allowed, captured_at, evaluated_at)
screenshots (reference_id, viewport, path)
hashtags (id, name, category[nullable], usage_count)
reference_hashtags (reference_id, hashtag_id)
design_metadata (reference_id, colors, fonts, layout, meta)
taste_log (reference_id, field, old_value, new_value, changed_at)
design_systems (id, name, philosophy, tokens, atomic_spec, based_on, status)
```

- `verdict` nullable = 미평가(pending) 지원
- `hashtags` 통합 풀 = 이유/목적/스타일 구분 없이 수집, 분류는 에이전트가 나중에
- `design_metadata` = Puppeteer가 추출한 컬러팔레트, 폰트, 레이아웃, 프레임워크 정보
- `design_systems` = Lv.5에서 에이전트가 생성한 완성본 디자인 시스템

### 디자인 메타데이터 자동 추출 (Puppeteer 강화)

Puppeteer가 스크린샷 + 구조화된 디자인 데이터 추출:
- **Colors**: 배경색, 텍스트색, 포인트색, 버튼색 (computed style)
- **Fonts**: font-family, size, weight 조합
- **Layout**: grid/flex 구조, 주요 간격값
- **Meta**: 사용 프레임워크/라이브러리 감지 (meta 태그, script src)

### 웹앱 화면 구성

1. **헤더**: 동적 그룹 탭 (데이터에서 자동 생성, 전환 가능: 목적별/스타일별/컴포넌트별), 검색, 미평가 카운트
2. **대시보드** (접기/펼치기): 통계, 미평가 목록 + [지금 평가하기] 링크, 최근 추가, 에이전트 인사이트
3. **그리드**: monet.design 스타일 카드, 필터 (verdict/tags)
4. **상세 페이지**: iframe 시도 + 스크린샷 폴백 (멀티뷰포트), 디자인 메타데이터 (컬러코드/폰트/레이아웃), 해시태그, AI 분석

### 봇 플로우 (v2)

```
v1: URL -> 매체 -> 용도 -> 판정 -> 마크다운 저장
v2: URL -> 자동캡쳐 + 메타추출 -> pending으로 DB 저장 (끝. 5초)
    평가는 웹에서 또는 텔레그램에서 나중에
```

### 레벨 시스템

```
Lv.0  빈 상태           -> "레퍼런스를 보여주세요"
Lv.1  5개+ 평가됨       -> 해시태그 제안 시작, 초기 패턴
Lv.2  20개+ 평가됨      -> 그룹 탭 자동 생성, 패턴 안정화
Lv.3  패턴 안정화       -> 디자인 토큰 제안
Lv.4  토큰 확정         -> 비평 모드 + 트렌드 비교
Lv.5  시스템 수렴       -> design_systems에 완성본 등록. "이걸로 작업해줘" 가능
```

---

## E. 기술 결정과 근거

| 결정 | 왜? |
|---|---|
| 텔레그램봇 (입력) | 모바일/PC에서 5초 수집. 사용자가 이미 텔레그램 사용 |
| grammy (텔레그램 라이브러리) | 인라인 키보드 API 깔끔, ESM 네이티브, 활발한 유지보수 |
| Next.js 15 + Tailwind + shadcn/ui | monet.design과 동일 스택. 벤치마크 일치 |
| NextAuth v5 + Google OAuth | 단일 사용자, 최소 설정 |
| SQLite + Drizzle ORM | 단일 사용자, 파일 하나. 봇/웹/에이전트 공유 |
| Puppeteer (캡쳐 + 메타추출) | 스크린샷 + CSS 추출 + 프레임워크 감지 |
| 해시태그 통합 풀 | 이유/목적/스타일 구분 없이 수집, 에이전트가 나중에 분류 |
| iframe + 스크린샷 폴백 | 라이브 프리뷰 시도, X-Frame-Options 차단 시 폴백 |
| Railway 또는 Fly.io 배포 | Puppeteer + 상주 프로세스 필요 -> Vercel 서버리스 부적합 |
| 수집/평가 분리 | pending 상태 지원. 양이 먼저, 판단은 나중 |

---

## F. 검증 완료

- v1(텔레그램봇 + 마크다운 + Puppeteer): E2E 테스트 21/21 통과. 실사용 확인.
- v2 피벗: 사용자 실사용 피드백 기반. monet.design 벤치마크 분석 완료.

---

## G. 보안 (절대 위반 금지)

- API 키, 토큰, OAuth 시크릿: **.env 파일에만 저장**. 코드에 하드코딩 절대 금지.
- .env는 .gitignore에 반드시 포함.
- 커밋 전 `git status`로 untracked 파일 확인 필수.
- Google OAuth: 허용 이메일 화이트리스트 (.env)
- 텔레그램봇: 허용 chat_id 화이트리스트 (.env)
- 모든 API route에 세션 체크 미들웨어
- iframe CSP 제한 (`Content-Security-Policy: frame-src`)
- HTTPS 강제 (배포 시)
- 사용자 레퍼런스 이미지/캡쳐는 로컬 전용. 외부 전송 시 명시적 동의 필요.

---

## H. 폴더 구조

```
visual-taste-agent/
├── CLAUDE.md                    <- 이 파일
├── spec.md                      <- 입출력 명세 + 성공 기준
├── planning.md                  <- 마일스톤 + 실행 순서
├── progress/
│   ├── current.md               <- 현재 상태 + 결정 로그
│   └── archive/                 <- 지난 기록 (컨텍스트 관리용)
├── .env                         <- 실제 키 (git 추적 안 함)
├── .env.example                 <- 필요한 변수 목록
├── .gitignore
├── package.json
├── drizzle.config.ts            <- Drizzle ORM 설정
├── .claude/
│   └── agents/
│       └── design-system.md     <- 에이전트 정의 파일
├── lib/                         <- 공유 코드
│   ├── db/
│   │   ├── schema.ts            <- Drizzle 스키마
│   │   ├── index.ts             <- DB 연결
│   │   └── migrate.ts           <- 마이그레이션
│   ├── capture/
│   │   └── index.ts             <- Puppeteer 캡쳐 + 메타추출
│   └── types.ts                 <- 공유 타입
├── bot/                         <- 텔레그램봇 (별도 프로세스)
│   ├── index.ts                 <- 봇 엔트리포인트
│   └── handlers/
│       └── collect.ts           <- URL 수집 핸들러
├── app/                         <- Next.js 15 웹앱
│   ├── layout.tsx
│   ├── page.tsx                 <- 메인 (대시보드 + 그리드)
│   ├── ref/[id]/page.tsx        <- 상세 페이지
│   ├── api/
│   │   ├── auth/[...nextauth]/  <- Google OAuth
│   │   └── references/          <- CRUD API
│   └── components/              <- UI 컴포넌트
├── public/
│   └── screenshots/             <- 캡쳐 이미지 (git 미추적)
├── design-system/               <- 에이전트 산출물
│   ├── profile.md               <- 에이전트의 뇌 (DB에서 생성)
│   ├── patterns/                <- 추출된 패턴
│   └── systems/                 <- Lv.5 완성본 디자인 시스템
└── data/
    └── vta.db                   <- SQLite DB 파일 (git 미추적)
```

---

## I. 세션 프로토콜

새 세션을 시작할 때 반드시 아래 순서를 따른다:

**시작:**
1. **`progress/current.md`를 읽는다** -- 현재 상태, 결정 로그, 아키텍처 요약
2. 필요 시 `planning.md`, `spec.md` 참조
3. 현재 상태를 요약하고, 다음 단계를 실행한다 (전권 위임 모드 -- 확인 없이 진행)

**종료:**
1. **progress/current.md의 "현재 상태" 블록을 최신으로 갱신**한다
2. 중요한 결정이 있었으면 **핵심 결정 로그에 추가**한다
3. current.md가 비대해지면, 당장 불필요한 맥락을 `progress/archive/`로 이동

---

## J. 참조 자료 (지식 저장소)

| 자료 | 경로 |
|---|---|
| 기획서 + v2 프롬프트 | `~/Library/.../knowledge/threads/2026/03/비주얼-취향-에이전트-기획.md` |
| 논의 전문 (프로듀서/디렉터 -> 에이전트) | `~/Library/.../knowledge/threads/2026/03/프로듀서-디렉터-AI시대-프론트엔드-디자인증강.md` |
| 프롬프트 패턴 분석 | `~/Library/.../knowledge/threads/2026/03/프롬프트-발화-수집-패턴-추출.md` |
| AI 증강 승수효과 카드 | `~/Library/.../knowledge/cards/AI-증강-승수효과-격차확대.md` |

> 경로 축약: `~/Library/...` = `~/Library/Mobile Documents/iCloud~md~obsidian/Documents`

---

## K. 핵심 개념 요약 (새 세션용 컨텍스트)

### 에이전트의 존재 이유
비디자이너의 핵심 병목은 **평가 능력**. "별론데 왜인지 모름" 상태를 "이건 정보 밀도가 높아서 별로" 수준으로 끌어올리는 것. 생성 AI보다 **비평 AI**가 먼저 필요하고, 비평보다 **취향 추출**이 선행.

### 테이스트 그래프 (v2 핵심 모델)
3개 레이어 분리가 아닌, **하나의 다차원 데이터**:
- **Verdict**: 좋다/싫다/미평가
- **Purpose**: 쇼핑몰, ERP, 랜딩, 뉴스레터, 프레젠테이션...
- **Style 속성**: 미니멀, 볼드, 정보밀도...
- **시간**: 취향은 변한다. 모든 판단에 시간축.

"레이어"는 이 데이터의 **필터 조합**:
- "쇼핑몰에서 싫어한 것" = purpose:쇼핑몰 + verdict:dislike
- "랜딩 취향 변화" = purpose:랜딩 + verdict:like, 시간순
- "2026 트렌드 중 내가 좋아한 것" = tag:2026-trend + verdict:like

### 해시태그 성장 모델
처음엔 비어있어서 직접 타이핑 -> 10개 쌓이면 빈번한 태그 제안 -> 50개 쌓이면 탭만으로 평가. **타이핑 -> 선택 -> 탭** 으로 마찰 감소.

### 자율 경계
| 행동 | 자율 | 확인 필요 |
|---|---|---|
| URL 캡쳐+메타추출+DB 저장 | O | |
| 유사 레퍼런스 리서치 | O | |
| 해시태그 카테고리 자동 분류 | O | |
| 패턴 추출+제안 | O (제안) | 확정은 확인 |
| 토큰 값 결정 | | O |
| 디자인 시스템 초안 생성 | O (초안) | 확정은 확인 |
| 비평 | O | |
| 비평 기반 자동 수정 | | O |

### 디렉터 x 프로듀서 = 에이전트
- **디렉터 역할**: 사용자의 취향 프로필 기반 일관성 유지
- **프로듀서 역할**: "이 취향을 이 청중에게 통하게 하려면 어디를 조율해야 하는지" 제안

### 미래 비전 (지금은 안 함)
- 이 웹앱이 `/visual` 모듈이 되고, `/knowledge` 등 다른 모듈과 통합 허브로 성장
- 각 모듈은 전담 에이전트가 관리
