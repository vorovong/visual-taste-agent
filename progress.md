# Visual Taste Agent — 진행 기록

## 기본 정보

- **작성자**: 김민호 (Claude Code 전권 위임)
- **시작일**: 2026-03-05
- **한줄 목표**: 비디자이너의 시각적 취향을 발견·체계화하여 모든 매체에서 "나다운 디자인"을 만들 수 있게 하는 시스템
- **상태**: 진행 중

---

## 현재 상태

- **단계**: M1~M4 구현 완료, 봇 실행 중
- **완료**: M1(프로젝트 초기화), M2(텔레그램봇), M3(Puppeteer 캡쳐), M4(에이전트 정의)
- **다음**: 실사용 시작 → 레퍼런스 5개+ 모이면 에이전트 세션으로 패턴 추출 (M5)
- **블로커**: 없음

---

## 핵심 결정 로그

| 날짜 | 결정 | 근거 |
|---|---|---|
| 2026-03-05 | 전권 위임 모드 | 사용자 요청. 욕망/자율경계/기억범위 충분히 논의됨 |
| 2026-03-05 | Node.js + Puppeteer + 텔레그램봇 | 캡쳐 네이티브, 기존 프로젝트 참조 가능 |
| 2026-03-05 | 로컬 마크다운 + Git 저장 | 지식 저장소와 동일 패턴, 투명성 |

---

## 2026-03-05

### 대화 흐름

| 내가 한 말 | 결과 |
|---|---|
| end-to-end 전권 위임 요청 | 프로젝트 폴더 + 4개 핸드오버 문서 생성 |

### 결과

- 프로젝트 폴더 `~/projects/visual-taste-agent/` 생성
- CLAUDE.md, spec.md, planning.md, progress.md 작성 완료
- 이전 세션의 논의(지식 저장소 threads/cards) 전체를 문서에 반영

### 어려웠던 것 / 다음에 할 것

- 다음 세션에서 M1부터 구현 시작
- 텔레그램 봇 토큰 발급 필요 (사용자 액션)

---

## 2026-03-05 (세션 2)

### 결과

- M1~M4 전체 구현 완료
- 텔레그램봇: grammy 기반, long polling, URL/이미지/파일 수집, 인라인 키보드(매체→용도→판정)
- Puppeteer 캡쳐: 3종 뷰포트(375/768/1440) 자동 스크린샷
- 에이전트 정의: `.claude/agents/design-system.md` (Lv.0~4 행동 정의)
- E2E 시뮬레이션 테스트 21/21 통과

### 결정 & 근거

- **grammy 선택** (node-telegram-bot-api 대신): 인라인 키보드 API가 더 깔끔, ESM 네이티브 지원
- **Anthropic API 키 불필요**: Claude Code Max Plan으로 에이전트 실행, 봇은 AI 호출 안 함
- **레퍼런스 서브디렉토리 구조**: `references/ref-001/ref-001.md + screenshots/` — 스크린샷과 메타데이터를 함께 관리

### 버그 수정

- `getRefCount`/`checkDuplicateUrl`이 서브디렉토리를 인식 못하는 버그 → `getRefDirs()` 공통 함수 추출

### 변경 파일

- `package.json` (신규)
- `bot/index.js` (신규)
- `bot/handlers/collect.js` (신규)
- `bot/lib/reference.js` (신규)
- `scripts/capture.js` (신규)
- `.claude/agents/design-system.md` (신규)
- `design-system/profile.md` (신규)
- `test/e2e-simulate.js` (신규)
- `.env` (신규, git 미추적)
- `.env.example` (수정 — Anthropic API 키 제거)
- `.gitignore` (수정 — package-lock.json 추가)
