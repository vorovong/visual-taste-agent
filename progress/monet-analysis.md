# monet.design 분석 & VTA 적용 계획

> 2026-03-07 작성. monet.design GitHub 소스 분석 기반.

---

## 1. monet.design 컨텐츠 페이지 구조

monet.design은 **AI가 컴포넌트를 코드로 재현할 수 있도록 충분한 맥락을 제공하는 컴포넌트 라이브러리**. 프론트엔드는 비공개 레포, API/데이터 모델은 `monet-design/monet-registry`에 공개.

### 핵심 데이터 모델

**MetadataSchema** (`src/types/metadata.ts`):
- `tags`: 4차원 — functional(25종), style(22종), layout(18종), industry(23종)
- `fontFamily`: 사용 폰트
- `dependencies`: 필요 패키지 목록
- `source`: 출처 정보
- `pageInfo`: primaryColors(HEX[]), typography(headingFont, bodyFont)

**카테고리** (`src/types/categories.ts`):
- 20개 컴포넌트 카테고리 (hero, pricing, testimonial, footer 등)
- 각 태그 유형별 enum: functional 25개, style 22개, layout 18개, industry 23개

### 컨텐츠 상세 API (`/api/v1/components/[id]`)

응답 구조:
```typescript
{
  component: { id, name, description, category, metadata, screenshots, ... },
  parent_page: { id, url, title, description, metadata },  // 소속 페이지
  similar_components: [{ id, name, category, similarity_score, shared_tags }],  // 유사 추천 (4개)
  usage_hints: { best_for: string[], not_recommended_for: string[] }  // 사용 힌트
}
```

### 코드 API (`/api/v1/components/[id]/code`)

응답 구조:
```typescript
{
  component_id, name,
  code: string,           // 실제 React 컴포넌트 코드
  code_info: { language, framework, styling },
  dependencies: string[],
  integration_guide: string  // 사용법 가이드
}
```

### AI 주도 개발 보조 장치 요약

| 장치 | 설명 | AI에게 주는 가치 |
|------|------|-----------------|
| 4차원 태그 | 기능/스타일/레이아웃/산업 분류 | 검색 정밀도, 맥락 제공 |
| 코드 API | 실제 React 소스코드 | 직접 재사용/참조 가능 |
| integration_guide | 사용법 텍스트 | AI가 올바르게 통합 |
| usage_hints | best_for / not_recommended_for | 적합성 판단 |
| similar_components | 유사 컴포넌트 + shared_tags | 대안 탐색 |
| parent_page | 전체 페이지 맥락 | 섹션의 맥락 이해 |
| primaryColors + typography | 구조화된 디자인 토큰 | 스타일 재현 |

---

## 2. VTA 현재 상태 vs monet.design 비교

### 이미 있는 것
- 스크린샷 (desktop/tablet/mobile 멀티뷰포트)
- 디자인 메타데이터 (colors, fonts, layout, framework/libraries)
- 해시태그 (자유 풀)
- 평가 (like/dislike/delete)
- 관련 레퍼런스 추천 (공유 태그 기반)
- iframe 라이브 프리뷰

### 없는 것 (monet 대비)

| 항목 | monet | VTA | 반영 필요성 |
|------|-------|-----|------------|
| 코드 API | 실제 React 코드 제공 | 없음 | **낮음** (VTA는 컴포넌트 라이브러리 아님) |
| 4차원 태그 분류 | functional/style/layout/industry | 단일 풀 | **중간** (데이터 쌓인 후 에이전트 자동 분류) |
| usage_hints | best_for, not_recommended_for | 없음 | **높음** (AI 비평의 핵심) |
| parent_page 관계 | 섹션→페이지 추적 | 없음 | **낮음** (VTA는 페이지 단위 수집) |
| AI 분석 코멘트 | 없음 (monet도 없음) | 없음 | **최고** (VTA의 존재 이유) |
| 프롬프트 생성 | 코드 API가 사실상 이 역할 | 없음 | **최고** (수집→작업 연결) |

---

## 3. VTA에 반영할 것 — 우선순위 결정

### 핵심 인사이트

monet과 1:1 매칭은 방향이 아님. monet은 **컴포넌트 라이브러리**, VTA는 **취향 발견 도구**. 용도가 다름.

VTA 상세 페이지의 진짜 문제: **데이터는 있는데 해석이 없다.**

CLAUDE.md 핵심 문제:
> "별론데 왜인지 모름" → "이건 정보 밀도가 높아서 별로" 수준으로 끌어올리는 것

### 최우선: AI 분석 코멘트

상세 페이지 사이드바에 AI가 자동으로 디자인 언어로 분석한 코멘트 표시:
- 레퍼런스 수집 시 또는 평가 시 자동 생성
- 예: "여백이 넓고 타이포 계층이 명확한 미니멀 랜딩. 포인트 컬러를 하나만 사용해서 시선 유도가 강함"
- 예: "정보 밀도가 높은 대시보드. 12컬럼 그리드에 카드 패턴 반복"
- 사용자가 like/dislike 누를 때 **왜 그런지를 디자인 언어로 학습**하게 됨

구현 방향:
- `design_metadata` 테이블의 `meta.gemini` 필드에 이미 Gemini 분석 결과 저장 가능
- 또는 새 필드/테이블로 AI 코멘트 저장
- Puppeteer 수집 시 스크린샷 + 메타데이터를 Claude/Gemini에 보내서 분석 생성
- 사이드바에 "AI 분석" 섹션 추가

### 차우선: 프롬프트 생성 버튼

"이 스타일로 만들어줘" 버튼:
- 메타데이터 + 태그 + AI 분석을 조합
- V0/Bolt/Claude에 바로 붙여넣을 수 있는 프롬프트 생성
- 클립보드 복사

구현 방향:
- 상세 페이지에 "프롬프트 복사" 버튼
- 템플릿: 컬러 팔레트 + 폰트 + 레이아웃 + 태그 + AI 분석 요약 → 구조화된 프롬프트
- 사용자의 취향 프로필 (좋아한 것들의 공통점)도 포함 가능

### 후순위 (데이터 축적 후)

1. **태그 차원 표시** — 태그에 기능/스타일/레이아웃 분류 뱃지 (에이전트 자동 분류)
2. **추천 근거 표시** — 관련 레퍼런스에 실제 공유 태그 이름 표시
3. **타이포그래피 계층** — heading vs body 폰트 구분 시각화
4. **사용 힌트** — "이 디자인은 랜딩에 좋지만, 대시보드에는 부적합" (AI 비평)

---

## 4. 다음 세션 실행 계획

1. AI 분석 코멘트 기능 구현
   - DB 스키마에 AI 코멘트 필드 추가 (또는 `design_metadata.meta.ai_comment`)
   - 봇 수집 시 자동 분석 생성 (Claude API 또는 Gemini)
   - 상세 페이지 사이드바에 "AI 분석" 섹션 추가
   - 기존 레퍼런스에 대해 배치 분석 실행

2. 프롬프트 생성 버튼 구현
   - 상세 페이지에 버튼 추가
   - 메타데이터 조합 → 프롬프트 텍스트 생성
   - 클립보드 복사 기능

---

## 5. 이번 세션에서 완료한 UI 작업 (참고)

### 라이트 모드 수정
- 모든 컴포넌트에 `dark:` prefix 패턴 적용 (기존에 다크 모드 전용 하드코딩)
- 대상 파일: dashboard, header, filter-bar, reference-card, detail-client, gallery-client, hashtag-input, search-modal, upload-modal, theme-toggle, globals.css

### 폰트 크기 확대
- 전체적으로 1~2단계 상향 (예: text-[10px]→text-xs, text-xs→text-sm, text-2xl→text-4xl)
- 대시보드 통계 숫자, 섹션 제목, 본문 텍스트 모두 조정

### 상세 페이지 개선
- verdict 버튼 아이콘 h-4→h-6, 호버 시 컬러 피드백
- 사이드바 폭 w-80→w-[340px]
- 컬러 스워치 h-8→h-10
- 전체 텍스트/간격 확대
