# Visual Taste Agent v2 -- 기술 명세

---

## 1. 시스템 철학

### 1.1 이 시스템이 하는 일

사용자가 텔레그램으로 URL을 보내면, 자동 캡쳐 + 디자인 메타데이터 추출 후 DB에 저장. monet.design 스타일 웹앱에서 열람하며 좋아요/싫어요/삭제 + 해시태그로 평가. 축적된 데이터에서 에이전트가 패턴을 추출하고, 최종적으로 "이걸로 작업해줘"가 가능한 디자인 시스템을 생성.

### 1.2 네 가지 책임 영역

**AI가 혼자 해야 하는 것**
- URL -> Puppeteer 캡쳐 (3종 뷰포트) + 디자인 메타데이터 추출
- X-Frame-Options 체크 -> iframe_allowed 플래그
- 레퍼런스 제목 자동 추출 (meta title)
- 해시태그 usage_count 집계 + 제안 순서 결정
- 해시태그 카테고리 자동 분류 (충분한 데이터 축적 후)
- 레벨 자동 판단

**사람이 직접 해야 하는 것**
- 좋다/싫다/삭제 판정
- 해시태그 선택 (AI가 제안, 사람이 탭)
- 토큰 값 최종 결정
- 디자인 시스템 확정

**사람이 씨앗 -> AI가 숲**
- URL 하나 보내면 -> AI가 캡쳐 + 메타추출 + 유사 리서치
- 해시태그 몇 개 탭하면 -> AI가 패턴 추출 + 디자인 언어로 분석
- "이걸로 작업해줘" 한마디 -> AI가 디자인 시스템 기반 전체 설계

**AI가 발판 -> 사람이 행동**
- AI가 해시태그 제안 -> 사용자가 선택/거부
- AI가 패턴 제시 -> 사용자가 반박/수정 -> 수렴
- AI가 디자인 시스템 초안 -> 사용자가 확정/수정

---

## 2. 사용자 흐름

### 흐름 A: 레퍼런스 수집 (텔레그램, 5초)

```
1. 사용자가 텔레그램 봇에 URL 전송
2. 봇: Puppeteer 캡쳐 + 메타추출 + DB 저장 (pending)
3. 봇: "저장됨. (현재 47개, 미평가 4개)"
```

### 흐름 B: 평가 (웹앱, 배치)

```
1. 웹앱 접속 -> 대시보드에 "미평가 4개" 표시
2. [지금 평가하기] 클릭 -> 미평가 레퍼런스만 필터
3. 각 카드에서:
   - 좋아요/싫어요/삭제 탭
   - 해시태그 선택 (기존 풀에서 탭, 또는 새로 입력)
4. 완료. 타이핑 0 (해시태그 풀 성숙 후)
```

### 흐름 C: 상세 리뷰 (웹앱)

```
1. 카드 클릭 -> 상세 페이지
2. Desktop/Tablet/Mobile 뷰포트 전환 (iframe 또는 스크린샷)
3. 사이드바: 컬러팔레트, 폰트, 레이아웃 구조 확인
4. 해시태그 추가/수정, verdict 변경 가능
5. AI Analysis 확인 (에이전트 세션 이후 표시)
```

### 흐름 D: 패턴 리뷰 (에이전트 세션)

```
1. claude --agent design-system
2. 에이전트가 DB에서 평가 데이터 로드
3. "20개 레퍼런스에서 3가지 패턴 발견:
    - #여백좋음 태그 15/20 -> 넓은 여백 선호
    - #미니멀 + #쇼핑몰 조합 빈번 -> 쇼핑몰에서 미니멀 선호
    반박하실 것 있나요?"
4. 반박 -> profile.md 갱신 -> 수렴
```

### 흐름 E: 디자인 시스템 활용 (Lv.5)

```
1. 사용자: "쇼핑몰 프로젝트 시작할건데, DS-A로 작업해줘"
   또는: "DS-A 기반인데, 좀 더 따뜻한 색감으로"
2. 에이전트가 design_systems 테이블에서 DS-A 로드
3. 토큰 + 아토믹 스펙 기반으로 자율 설계
4. 비평: "취향엔 맞는데, 40대 타겟에겐 폰트 살짝 키우는게..."
```

---

## 3. 입력 명세

### 3.1 텔레그램 메시지

```yaml
텔레그램_메시지:
  format: URL | 이미지(jpg/png/webp) | 파일
  source: 텔레그램 봇 API (long polling)
  constraints:
    - 이미지 최대 20MB
    - URL은 공개 접근 가능해야 함
    - chat_id 화이트리스트로 제한
```

### 3.2 웹앱 입력

```yaml
웹앱_입력:
  format: verdict(like/dislike/delete) | 해시태그 선택/입력
  source: Next.js API routes
  constraints:
    - Google OAuth 인증 필수
    - 이메일 화이트리스트로 제한
```

### 3.3 에이전트 입력

```yaml
에이전트_입력:
  format: 자연어 | DB 쿼리 결과
  source: claude --agent design-system
  constraints:
    - DB 직접 쿼리 또는 /api/agent/data 엔드포인트
```

---

## 4. 출력 명세

### 4.1 DB 레코드

```yaml
references:
  format: SQLite 레코드
  fields: id, url, title, verdict, source_type, iframe_allowed, captured_at, evaluated_at

screenshots:
  format: PNG 파일 + DB 레코드
  storage: public/screenshots/{ref_id}/{viewport}.png

design_metadata:
  format: JSON (DB에 저장)
  fields:
    colors: { background, text, primary, secondary, accent }
    fonts: [{ family, size, weight }]
    layout: { type, columns, gap, padding }
    meta: { framework, libraries }
```

### 4.2 해시태그

```yaml
hashtags:
  format: DB 레코드
  fields: id, name, category(nullable), usage_count
  behavior:
    - 새 태그: category = null, usage_count = 1
    - 기존 태그 사용 시: usage_count++
    - 에이전트가 축적 후 category 자동 분류 (why/purpose/style/layout/typography)
```

### 4.3 디자인 시스템 (Lv.5)

```yaml
design_systems:
  format: DB 레코드 + 마크다운 파일
  fields:
    name: "Clean Dashboard v1"
    philosophy: 디자인 철학 요약 (마크다운)
    tokens: JSON (색상, 타이포, 스페이싱 등)
    atomic_spec: 아토믹 디자인 스펙 (마크다운)
    based_on: 근거 reference IDs (JSON)
    status: draft | stable | archived
  destination: design-system/systems/{name}.md (에이전트가 생성)
```

---

## 5. 성공 기준

### MVP (Phase 1-2)
- [ ] 텔레그램으로 URL 전송 -> 자동 캡쳐 + 메타추출 -> DB 저장 (pending)
- [ ] 웹앱에서 레퍼런스 갤러리 열람 (monet.design 스타일)
- [ ] 상세 페이지에서 멀티뷰포트 프리뷰 + 디자인 메타데이터 표시
- [ ] Google OAuth 인증 (단일 사용자)

### Core (Phase 3)
- [ ] 좋아요/싫어요/삭제 평가
- [ ] 해시태그 선택 + 새 태그 추가
- [ ] 미평가 레퍼런스 필터링
- [ ] 대시보드 (통계, 미평가, 최근)
- [ ] 동적 그룹 탭

### Integration (Phase 4)
- [ ] 에이전트가 DB 데이터 기반 패턴 추출
- [ ] profile.md 자동 생성

### Production (Phase 5)
- [ ] 보안 (OAuth + 화이트리스트 + CSP + HTTPS)
- [ ] 배포 (Railway/Fly.io)
- [ ] 봇 + 웹앱 안정 운영

### Vision (범위 밖, 미래)
- [ ] Lv.5 디자인 시스템 프리셋 생성 + "이걸로 작업해줘" 실행
- [ ] 트렌드 추적 자동화
- [ ] 지식 저장소 등 다른 모듈과 통합 허브
- [ ] Computer Use로 Puppeteer 대체

---

## 6. 엣지 케이스

| 상황 | 대응 |
|---|---|
| URL이 로그인 필요 | 캡쳐 실패 -> "캡쳐 불가. 스크린샷을 보내주세요" |
| 동일 URL 중복 전송 | 기존 레퍼런스 존재 알림, 중복 생성 방지 |
| iframe 차단 사이트 | iframe_allowed = false, 스크린샷 폴백 자동 |
| 메타데이터 추출 실패 | 스크린샷만 저장, design_metadata = null |
| 봇 서버 다운 | 텔레그램 재전송 (서버 재시작 시 처리) |
| 이미지만 전송 (URL 없음) | 이미지 자체를 레퍼런스로 저장, iframe 불가 |
| 해시태그 오타/중복 | 자동완성으로 방지, 에이전트가 나중에 병합 제안 |
| DB 파일 손상 | SQLite WAL 모드 + Git으로 백업 가능 |
