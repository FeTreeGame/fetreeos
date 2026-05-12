# FeTreeOS Storage Architecture — P2P형 저장소 분리

## 핵심 아이디어

FeTreeOS를 씬 클라이언트 브릿지로 운용.
서버는 인덱스(메타+썸네일+상호작용)만 보유, 실제 데이터는 유저 소유 저장소에서 직접 fetch.
BitTorrent 트래커와 동일한 원리 — OS가 트래커 역할.

## 설계 철학

- 창작의 주권 + 탈중앙화 (블록체인 없이)
- AI 의존 줄이기: 에셋 제작은 인간이 직접
- 사용자 소유권: 서비스 소멸해도 파일은 유저 계정에 잔존
- 역할 분리: 개인 데이터 = 탈중앙(유저 소유) / 공유 상태 = 중앙(라이브러리, 최소한)

## 저장소 2층 구조

```
서버(콘텐츠) — Supabase
  ├─ 공유 에셋 참조 원본 (assets 테이블)
  ├─ 에셋 메타데이터 (format, tags, thumbnail)
  ├─ 상호작용 (좋아요, 댓글, 조회수)
  └─ 서비스가 제공하는 라이브러리

유저 데이터 — GitHub / Google Drive (사용자 소유)
  ├─ 사용자 제작 아이콘, 배경화면, 사운드, 설정
  ├─ 창작 도구 결과물
  ├─ 레시피 영상 원본
  └─ public repo: 갤러리 공유 / private repo: 비공개
```

## 저장소 백엔드 (교체 가능 추상화)

| 백엔드 | 용도 | 용량 | 비고 |
|--------|------|------|------|
| Supabase Storage | 서비스 콘텐츠 기본 | 1GB 무료 | 라이브러리 전용 |
| GitHub | 유저 에셋/레시피 | 실질 무제한 | 버전 히스토리, 심사 불필요 |
| Google Drive | 대용량/바이너리 | 15GB 무료 | drive.file 스코프, 앱 전용 폴더 |
| File System Access API | 오프라인 | 로컬 | 폴백 |

## iframe ↔ 호스트 브릿지

- postMessage 프로토콜로 iframe 앱이 저장소에 접근
- iframe → 호스트: save 요청 (path + data)
- 호스트 → iframe: file 전달 (data)
- iframe은 Supabase 키/인증 불필요, 프로토콜만 알면 됨

## 인증 & 온보딩

- 게스트 모드: Supabase 임시 버킷 (UUID + TTL 3~7일)
- 1회 OAuth 인증 → refresh token → 이후 자동 갱신
- 온보딩: 게스트 체험 → 계정 연결 → 임시 데이터 마이그레이션 → 영구 소유

## 세션 메모리 패턴

- 세션 시작: 유저 저장소에서 메타(파일 트리, 썸네일)만 로드
- 세션 중: 메모리(변수/IndexedDB)에 캐싱, 로컬처럼 동작
- 바이너리: 열 때만 fetch → LRU 캐시
- 변경: 일정 간격 또는 명시적 저장 시 원격 sync
- 탭 닫으면: 메모리 해제 (프라이버시)

## 레시피 영상 플랫폼 — P2P형 확장

- 서버 비용과 품질이 분리: 원본은 유저 저장소, 서버는 메타+썸네일만
- 품질 향상 가능: 128px(~1MB/2min) → 256~384px(~3-5MB/2min)
- 유저 부담이므로 서버 비용 불변
- 에지맵 양식은 강제가 아닌 미학적 선택으로 존속
- 재생: 클라이언트가 유저 저장소에서 레시피 fetch → 팔레트 렌더링

## 에셋 라이브러리 — 썸네일 압축 + 원본 분리

```
서버 (Supabase DB):
  ├─ id, creator, tags, created_at
  ├─ thumbnail: 에지맵 압축 (1bpp+gzip, ~1KB 이하)
  ├─ source_ref: 유저 저장소 URL (GitHub raw / Drive link)
  └─ interactions: 좋아요, 댓글, 조회수
```

- 갤러리 브라우징: 에지맵 썸네일만 렌더링 (~1KB/작품)
- 클릭 시: source_ref로 유저 저장소에서 원본 fetch
- 1만 작품 = 썸네일 ~10MB + 메타 수 MB → 무료 티어 내
- recipe-video-proto의 압축 기술이 썸네일에 재활용

## 분리 근거

- 서비스 비용 절감 (유저 바이너리가 서버를 먹지 않음)
- 책임 경계 명확 (서비스 장애 시에도 유저 데이터 안전)
- 스케일링 (유저 증가 ≠ 서버 비용 증가)
- 법적/윤리적 ("당신의 데이터를 보관하지 않습니다")

## 미결 논의

- postMessage 프로토콜 스펙 (타입, 포맷, 에러 처리)
- 보안: origin 검증, 허용 경로 제한
- 가상 FS (localStorage) vs 원격 저장소 분기 기준
- "다운로드 폴더" UX
- GitHub vs Google Drive: 초기 구현 순서
- user_assets 테이블: 유저 저장소 참조점을 Supabase에 두는 구조
