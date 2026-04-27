# FeTreeOS MVP 런칭 체크리스트

목표일: 2026-04-30 (수)
배포: Vercel 무료 도메인 (*.vercel.app)

## 1. 브랜딩 반영

- [ ] package.json — name, version(0.1.0), description 갱신
- [ ] layout.tsx — `<title>`, `<meta>` 태그에 FeTreeOS 반영
- [ ] OG 메타태그 — 공유 시 표시될 제목/설명/이미지
- [ ] favicon — FeTreeOS 로고 또는 임시 아이콘
- [ ] 바탕화면 환영 파일 — "FeTree OS" → "FeTreeOS" 명칭 통일
- [ ] Vercel 프로젝트명 결정 (fetreeos → fetreeos.vercel.app)

## 2. 버전 관리 체계

- [ ] package.json version: "0.1.0" (MVP 시작점)
- [ ] CHANGELOG.md 생성 — SemVer 기반, [Unreleased] 섹션 운용
- [ ] fetree-fs-version — 현재 값(3) 유지, 향후 변경 시 순차 마이그레이션 구조 확인

### 마이그레이션 체인 구조 (조사 필요)

현재 `initDefaultFS`는 단일 버전 체크 후 일괄 처리.
버전이 누적되면 v1→v2→v3 순차 적용이 필요할 수 있음.

```
// 현재
if (version < CURRENT_VERSION) { ... 일괄 처리 }

// 향후 고려
const migrations = { 3: v2to3, 4: v3to4, 5: v4to5 };
for (let v = savedVersion; v < CURRENT_VERSION; v++) {
  migrations[v + 1]?.(nodes);
}
```

**결정 필요**: MVP 시점에서 체인 구조를 도입할지, 아니면 사용자 수가 적은 초기에는 현재 방식 유지할지.

## 3. 데이터 안전

### localStorage 한계 인지

- 브라우저 초기화/변경 시 데이터 소실
- 시크릿 모드에서는 세션 종료 시 삭제
- 용량 제한 (~5MB, 브라우저별 상이)

### 대응책 (조사 후 구현 판단)

- [ ] **내보내기/가져오기** — JSON 파일로 FS 데이터 다운로드/업로드 (Settings 앱에 추가). Supabase 전까지의 수동 백업 수단. 구현 난이도 낮음
- [ ] **데이터 버전 태깅** — 내보낸 JSON에 fs-version 포함, 가져올 때 마이그레이션 자동 적용
- [ ] **용량 모니터링** — localStorage 사용량 표시 (Settings). 5MB 근접 시 경고

## 4. 배포 설정

- [ ] Vercel 프로젝트 연결 (GitHub repo → Vercel)
- [ ] 환경변수 확인 — 현재 없음, Supabase 연동 시 추가 예정
- [ ] 빌드 확인 — `next build` 로컬 성공 확인 후 배포
- [ ] 프리뷰 배포 테스트 — PR 기반 프리뷰 URL 동작 확인

### Vercel 배포 시 확인사항 (조사 필요)

- [ ] Next.js 16 + Vercel 호환성 확인
- [ ] `next.config.ts` 설정 검토 (output, images 등)
- [ ] 404/에러 페이지 — 기본 Next.js 제공 vs 커스텀
- [ ] Analytics — Vercel Analytics 무료 티어 활용 여부

## 5. MVP 범위 결정

### 포함 (현재 완성된 기능)

- 데스크톱 쉘 (윈도우 매니저, 드래그, 스냅, 리사이즈)
- 파일 시스템 (생성, 삭제, 이동, 휴지통)
- 파일 탐색기 (폴더 탐색, 정렬, 크로스 드래그)
- 메모장, 브라우저, 설정 앱
- 컨텍스트 메뉴 (새로 만들기, 정렬, 새로고침)
- iframe 앱 (Experience Space, Interactive Plains)

### 런칭 전 추가 기능

- [ ] URL 바로가기 만들기 — 컨텍스트 메뉴 또는 브라우저 앱에서 URL 입력 → .url 파일 생성 → 바탕화면에 아이콘 추가. 기존 FSNode url 필드 + EXT_APP_MAP 활용. 콘텐츠 브릿지의 첫 단추
- [ ] 내보내기/가져오기 — Settings에서 FS 데이터 JSON 다운로드/업로드 (Supabase 전까지의 수동 백업)

### 콘텐츠 앱 (독립 웹앱 → iframe 탑재, 런칭 후 순차 추가)

세 앱 모두 독립 웹앱으로 개발, FeTreeOS에서는 iframe으로 탑재. 상세 설계는 TODO.md 앱 로드맵 참조.

- **미니홈피** — Interactive Plains 확장 (계정 시스템 + 프로필 + 방명록)
- **플래시 게임 사이트** — 게임 포털 (목록 + iframe 2단 중첩으로 게임 실행)
- **티비플** — YouTube embed + 구름 자막 (본편 타임라인 추종 동기화)

### 제외/후순위 (런칭 후)

- 고유파일 규칙 (중복 불허, 충돌 다이얼로그)
- Supabase 연동 (인증, 클라우드 저장)
- 모바일 대응
- 커뮤니티 콘텐츠 연결 / 앱 카탈로그

### 검토 필요

- [ ] iframe 앱들의 현재 접근 가능 여부 확인 (배포 URL 유효한지)
- [ ] 초기 진입 경험 — 처음 방문자가 뭘 보고 뭘 하게 되는가
- [ ] 성능 — 모바일 브라우저에서 최소한 깨지지 않는지 (대응은 안 하더라도)
- [ ] 에러 바운더리 — 예상치 못한 에러 시 흰 화면 방지

## 6. 코드 품질

- [ ] `next build` 경고 0건 확인
- [ ] TypeScript strict 에러 0건 확인
- [ ] 콘솔 에러/경고 정리
- [ ] CLAUDE.md 작성 (프로젝트 규칙 문서)

## 7. 법적 / 라이센스 (결정 완료)

**방침**: MIT 오픈소스 + 브랜딩 제외

- 코드(OS 쉘, 룩앤필, UI 구현) → MIT 라이센스. 포크/재사용 자유
- 브랜딩("FeTreeOS" 이름, 로고, 아이콘) → 제외. 포크 시 자체 브랜딩 사용 필요
- 콘텐츠(iframe 앱, 채널 연동 콘텐츠) → 별도 자산. 라이센스 범위 밖

근거: _ref 코드(ProzillaOS, daedalOS, Elara) 참조 경위 + 오픈소스 생태계 기여 의도

- [ ] LICENSE 파일 생성 (MIT + 브랜딩 제외 조항)
- [ ] iframe 임베드 프로젝트가 본인 소유인지 확인

## 8. 런칭 후 모니터링

- [ ] Vercel 대시보드에서 빌드/배포 상태 확인 방법 숙지
- [ ] 롤백 방법 숙지 (Vercel 이전 배포로 원클릭 복원)
- [ ] 에러 리포팅 — 콘솔 에러 수집 방법 결정 (Vercel Analytics 또는 수동)
