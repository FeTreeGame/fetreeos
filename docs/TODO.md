# TODO

## 완료

- [x] OS 데스크톱 쉘 기본 구조 (바탕화면, 창, 태스크바, 시작메뉴)
- [x] 브라우저 앱 (주소창 + 게임 목록 + iframe)
- [x] 메모장 앱 (메뉴바 + textarea)
- [x] 윈도우 드래그 이동
- [x] 윈도우 8방향 리사이즈
- [x] 최대화 버튼 + 타이틀바 더블클릭
- [x] 스냅 도킹 (좌/우 반분할, 4코너 쿼터, 상단 전체화면)
- [x] 스냅 프리뷰 오버레이
- [x] 활성/비활성 타이틀바 시각 구분
- [x] 태스크바 활성 표시 + 클릭 최소화 토글
- [x] 비율 기반 좌표계 전환 (반응형)
- [x] 아이콘 바운딩 (flex-wrap, overflow-hidden)
- [x] 앱 기본 크기 통일 + 커스텀 필드

- [x] 앱 정의 분리 (apps.ts) + iframe 타입 추가
- [x] 콘텐츠 앱 연동 (Experience Space, Interactive Plains — iframe 임베드)

- [x] 스냅/최대화 창 타이틀바 드래그로 해제 + 이전 크기 복원

- [x] 시계 컴포넌트 분리 (Clock.tsx) + 1초 갱신 + 캘린더 팝업
- [x] 가상 파일 시스템 (fileSystem.ts — FSNode, localStorage 기반, Supabase 교체 지점 분리)
- [x] 바탕화면 통합 렌더링 (FSNode 기반 — 앱/파일/폴더 단일 루프)
- [x] 파일 탐색기 (FileExplorer.tsx — 폴더 탐색, 뒤로/앞으로, 인라인 이름 변경)
- [x] 메모장 파일 시스템 연동 (Notepad.tsx — FSNode 기반 CRUD, Open 다이얼로그)
- [x] 우클릭 컨텍스트 메뉴 (ContextMenu.tsx — 바탕화면/파일/앱/휴지통 분기)
- [x] 휴지통 시스템 (moveToTrash/emptyTrash, 앱 노드 삭제 보호)
- [x] FS 버전 관리 (앱 추가 시 기존 사용자 데이터 보존)
- [x] 100dvh 모바일 뷰포트 대응
- [x] 바탕화면·탐색기 통합 (FileExplorer mode='desktop'|'explorer' — explorer.exe 구조)
- [x] 바탕화면 그리드 시스템 (N×M 셀, ResizeObserver, localStorage 위치 저장)
- [x] 아이콘 드래그 이동 (고스트 + 드롭 타겟 하이라이트 + 자리 교환)
- [x] 선택 박스/러버밴드 (범위 선택 + Ctrl+클릭 토글)
- [x] 정렬 옵션 (이름순/유형순/날짜순 + 그리드에 맞춤)
- [x] 아이콘 선택 시각 개선 — hover/선택 시 파랑 오버레이 통일
- [x] Ctrl+선택 박스 XOR 토글 (기존 선택 유지 + 범위 내 선택/해제 전환)
- [x] 다중선택 드래그 이동 (선택 그룹 전체 고스트 + 함께 이동)
- [x] Settings 앱 (아이콘 위치 초기화, 그리드 토글, 전체 데이터 초기화 — 제어판)
- [x] 디버그 그리드 라인 토글 (Settings 연동, fetree-show-grid localStorage)
- [x] 리팩터링 — Browser 분리, 휴지통 렌더링 통합(TRASH_NODE), tidyGrid 중복 제거
- [x] 아이콘 위치 persist 버그 수정 — gridSize 초기값{1,1}에서 autoPlace가 저장값 파괴하는 문제
- [x] 휴지통 드래그 드롭 삭제 (셀 중심 판정 + 초록 하이라이트)
- [x] 폴더 드래그 드롭 이동 (셀 중심 → 폴더 안으로)
- [x] 자동 정렬 토글 (컨텍스트 메뉴, localStorage 저장, 끼워넣기 지원)
- [x] 드롭 시각 분기 — 자동정렬 ON: 가로 삽입 막대 / OFF: 셀 하이라이트 / 폴더·휴지통: 초록 박스
- [x] 드래그 중 아이콘 호버 효과 억제
- [x] TRASH_NODE id 통일 ('trash') — 휴지통 내용 표시 버그 수정

## 다음 마일스톤 — 폴더 시스템 본격화

### 설계

- MAX_DEPTH = 4 (desktop 아래 4단계). 안정성+실용성 기준, 향후 조정 가능
- getPath(nodeId) — parentId 체인 순회로 경로 계산 (depth 제한으로 상수 비용)
- moveNodes(ids, targetParentId) — 모든 이동을 통합 (바탕화면↔폴더↔휴지통 = parentId 변경)
  - 앱 보호, 재귀 이동(trash), depth 초과 차단 포함
  - 반환값으로 moved/blocked 분리 → UI 피드백

### 작업

- [x] getPath + getDepth + MAX_DEPTH 도입 (fileSystem.ts)
- [x] moveNodes 통합 이동 함수 — moveToTrash/updateNode/restoreFromTrash 호출부 교체
- [x] createFolder depth 체크 (MAX_DEPTH 초과 시 생성 차단)
- [x] 탐색기 주소 표시줄 breadcrumb 경로 표시 (getPath 연동, 세그먼트 클릭 이동)
- [x] Files → File Explorer 명칭 변경 + FS 버전 3 (앱 노드 이름/아이콘 자동 동기화)
- [x] 휴지통 탐색기 — 복원/완전삭제 UI (우클릭 메뉴 분기, 배경 메뉴 비우기)
- [x] 정렬 상태 저장 (desktopSort localStorage 저장, 새로고침 후 유지)
- [x] 컨텍스트 메뉴 서브메뉴 (새로 만들기 ▶, 정렬 기준 ▶ — 호버 펼침)
- [x] 바탕화면 ↔ 탐색기 크로스 드래그 드롭 (pointerEvents 투과 + rect 판정 + 고스트 아이콘)
- [x] 멀티 고스트 아이콘 (다중선택 드래그 시 ghosts 배열로 렌더링)
- [x] 탐색기 셀렉트 박스 (러버밴드 선택 + DOM rect 기반 히트 판정)
- [x] 드롭 후 대상 창 자동 포커스 (Windows 동작 통일)
- [x] 탐색기 → 휴지통 아이콘 드롭 (cross-drag 시 초록 하이라이트)
- [x] 폴더 자기 자신/하위 이동 순환 방지 (moveNodes 순환 체크)
- [x] 러버밴드 히트 판정 rect 겹침으로 통일 (바탕화면+탐색기)
- [x] 더블클릭 실행 시 선택 해제
- [x] 리팩터링 — useDesktopDrag/useExplorerDrag 훅 분리, ContextMenu 독립 컴포넌트, constants.ts 공유 상수
- [x] 리팩터링 — 공유 타입 통합 (IconDragInfo, IconDragState 등), SORT_COMPARATORS 모듈 스코프화, placeOnGrid 헬퍼
- [x] 성능 — P1: loadFS() 인메모리 캐시 (14곳 호출 전부 캐시 히트, JSON.parse 1회로 축소)
- [x] 성능 — P2(a): AppWindow 컴포넌트 React.memo 분리 (드래그 중 비관련 창 리렌더 차단)
- [x] 하단 스냅 해제 시 상단 점프 버그 수정 (y: 0 하드코딩 → 커서 Y 기준 배치)
- [x] 리사이즈 핸들 히트 영역 확대 — 가장자리 10px(±5), 코너 16px, 창 바깥 돌출. overflow:hidden을 내부 wrapper로 이동
- [x] 리사이즈 중 커서 유지 — 루트 div에 drag.edge 기반 cursor 설정으로 핸들 벗어나도 커서 유지
- [x] 리팩터링 — page.tsx 분리 (805→342줄). windowTypes.ts, AppWindow.tsx, Dialog.tsx, Taskbar.tsx, useWindowDrag.ts 추출
- [ ] 향후: 브라우저 등 앱 간 드래그 드롭 확장

### 크로스 드래그 드롭 — 설계 메모

바탕화면 → 탐색기 방향 동작 완료. 구현 구조:
- `data-drop-folder={currentFolder}` 속성으로 각 FileExplorer 콘텐츠 영역 식별
- `onIconDragChange` → page.tsx에 드래그 중인 ids/sourceFolder 전달
- 드래그 중 윈도우에 `pointerEvents: 'none'` → 바탕화면 pointer 이벤트 관통
- page.tsx `handlePointerUp`에서 `querySelectorAll('[data-drop-folder]')` + rect 판정 + zIndex 최상위 선택
- `refreshKey={fsRevision}`으로 탐색기 창도 즉시 갱신
- 양방향 완성 (바탕화면↔탐색기, 탐색기↔탐색기)
- page.tsx handlePointerMove에서 고스트 좌표 갱신, 고스트 렌더링도 page.tsx에서 통합

## 앱 로드맵

### FeTreeOS의 역할 — 체류를 만드는 브릿지

FeTreeOS 자체는 콘텐츠를 만들지 않는다. iframe으로 독립 웹앱을 띄우고, 파일 시스템으로 정리하고, 윈도우 매니저로 배치하고, "내 방 컴퓨터" 메타포로 경험을 감싼다.
단순 링크 모음("여기 가봐" → 클릭하면 떠남)과 달리, 사용자가 OS를 **떠나지 않고** 콘텐츠를 소비/정리/꾸미는 구조. 브릿지이되 체류를 만드는 브릿지.

### 앱 3층 구조

| 층 | 역할 | 예시 |
|---|---|---|
| **OS 기반** | 쉘, 파일 시스템, 윈도우 매니저 | 탐색기, 설정 |
| **내장 앱** | OS 켜면 바로 쓸 수 있는 것. OS 상태와 실시간 연동 | 그림판, 메모장, 데스크탑 펫, 테마 에디터 |
| **iframe 앱** | 독립 웹앱을 OS 안에서 띄움 | 플래시 사이트, 티비플, 미니홈피 |

**내장 vs iframe 판정 기준**: "이 앱이 동작하는 동안 OS와 계속 대화해야 하는가?"
- 실시간 연동 필요 (→배경화면, →CSS 변수, →바탕화면 렌더링, →OS 효과음) → **내장**
- 완료 시 파일 내보내기만 (녹음기, 스프라이트 에디터) → **분리 가능**

Windows 지뢰찾기/핀볼처럼, OS와 통신이 필요해서가 아니라 "OS를 켰을 때 바로 할 수 있는 게 있어야" 내장하는 것도 있다. 체류감의 도구.

### 콘텐츠 호스팅

**모든 콘텐츠 앱은 독립 웹앱으로 개발, FeTreeOS에서는 iframe으로 탑재.**
FeTreeOS 쪽 작업은 `apps.ts`에 AppDef 한 줄 추가 수준. 실제 개발은 각 독립 프로젝트에서 수행.

**호스팅 옵션**:
- **Vercel** — 서버 사이드 로직, DB 연동이 필요한 앱 (미니홈피, 티비플 등)
- **GitHub Pages** — 정적 HTML/JS/CSS만으로 구성된 콘텐츠. 무료, push만으로 자동 배포, `X-Frame-Options` 미설정이므로 iframe 임베드 자유. 실증: `fetreegame.github.io/birthday/` 상시 접근 확인 済
- FeTreeOS 입장에서는 URL만 다를 뿐 동일하게 동작
- **의의**: Vercel/Supabase 모르는 외부 제작자도 HTML 파일 하나로 "앱" 등록 가능 → Phase 3 커뮤니티 콘텐츠의 현실적 진입 경로

### 기본 탑재 콘텐츠 앱 (3종)

#### 1. 미니홈피 (싸이월드 오마주) — Interactive Plains 확장

**현재 상태**: Interactive Plains가 이미 미니홈피 + 드로잉(벡터) 콘텐츠의 원형. Supabase 연동 済.
별도 앱을 새로 만드는 게 아니라 **Interactive Plains를 키워가는 방향**.

**핵심 과제**: 계정 시스템 확장 (키 기반 인증 — 개인정보 비수집, OS 라이선스 키 메타포)

**최소 기능**:
- 프로필 (이름, 한 줄 소개, 프로필 이미지)
- 방명록 (글 남기기/읽기)
- 벡터 드로잉 (기존 기능)

**장기 비전 — 벡터 드로잉 기반 공유 세계**:

r/place + Drawn to Life + 동물의 숲이 결합된 형태. 유저가 벡터로 직접 그린 에셋이 공유 세계에 영구 축적.
텍스트가 아니라 **그린 결과물로 존재를 표현**하는 커뮤니티.

기존 유사 서비스(r/place, Manyland 등)와의 차별점:
- 에셋 자체가 유저 산물 (기성 아이템 선택이 아닌 직접 드로잉)
- 벡터 기반 (해상도 무관, 용량 극소, 확대해도 깨끗)
- 축적이 영구적 (이벤트 리셋 없음, 세계가 계속 성장)
- 계층 구조가 깊음 (체류를 만드는 구조)

```
세계 (늪지대, 초원, 화산섬, 바다, 숲...)
  └─ 지역 콘텐츠 (크리쳐 도감, 생태 소개)
       └─ 마을/타운 (유저 공동 공간)
            ├─ 공용 시설 (다리, 가로등, 타일, 목장, 낚시터 — 유저가 그려서 기여)
            └─ 개인 공간
                 └─ 집 (외형 직접 드로잉)
                      └─ 내부 (가구 배치 — 가구도 직접 드로잉)
```

성장 전략: 유저를 먼저 모으지 않고, 본인이 세계를 먼저 채움 → 유튜브 채널에서 제작 과정 공유 → "이미 살아있는 세계에 합류하는" 경험 → 자연 유입.
INTERACTIVE_PLAINS_SPEC.md Phase 3~5의 구체화.

#### 2. 플래시 게임 사이트 — iframe 2단 중첩

**구조**: FeTreeOS → 플래시 사이트(iframe) → 개별 게임(iframe)

```
FeTreeOS
  └─ iframe: 플래시 게임 사이트 (독립 웹앱)
       ├─ 게임 목록 UI (썸네일, 카테고리, 검색)
       ├─ iframe: Experience Space
       ├─ iframe: 개별 게임 A
       └─ iframe: 개별 게임 B
```

**iframe 2단 중첩 기술 참고**:
- 본인 도메인 간 iframe 중첩은 제약 없음
- 2단 중첩은 성능상 무난 (각 iframe이 별도 브라우저 컨텍스트)
- 키보드/포커스가 가장 안쪽 iframe에 갇힘 — 게임 실행 중에는 오히려 원하는 동작
- `postMessage`로 계층 간 통신 가능 (2단 이상은 중계 필요)

**관심사 분리**:
- **FeTreeOS**: OS 쉘 역할만. "플래시 게임 사이트" 앱을 띄움
- **플래시 게임 사이트**: 게임 포털 역할. 목록 관리, 카테고리, 검색, 게임 실행
- **개별 게임**: 각자 독립 배포. 플래시 사이트가 iframe으로 불러옴

**특성**:
- 플래시 사이트가 FeTreeOS 없이도 독립 동작 (직접 URL 접근 가능)
- 게임 추가는 플래시 사이트 쪽 작업 → FeTreeOS 무관
- 현재 Browser 앱의 게임 목록 기능이 플래시 사이트로 이관 → Browser는 순수 웹 브라우저로 환원

**최소 기능**:
- 게임 목록 (썸네일 + 제목)
- 클릭하면 iframe으로 게임 실행

**카테고리별 콘텐츠 허브로 확장**:

```
플래시 게임 사이트
  ├─ 플래시 게임 (웹 게임)
  │    ├─ 본인 제작 (Experience Space, Cookie_ECS, mini_live...)
  │    └─ 유저 제작 (ECS_FW로 만든 게임, 독립 웹 게임)
  │
  ├─ 레트로 플레이어 (에뮬레이터)
  │    ├─ DS 모드 (듀얼 스크린 오마주)
  │    ├─ 아케이드 모드 (오락실 오마주)
  │    ├─ 홈브류 기본 탑재
  │    └─ 유저 ROM 로드
  │
  └─ 향후 확장
       ├─ 보드게임
       └─ 리듬 게임 (sample_piano 연계)
```

**에뮬레이터 법적 안전선**:
- 에뮬레이터 소프트웨어 자체는 합법 (Sony v. Connectix, 2000 판례로 확립)
- ROM 배포만 위법 — 에뮬레이터 앱 제공 + 유저가 본인 ROM 직접 로드 방식으로 회피
- 홈브류/퍼블릭 도메인 게임은 기본 탑재 가능
- UI를 DS/아케이드 풍으로 만드는 것은 OK (룩앤필은 저작권 대상 아님), 닌텐도 로고/상표 사용은 NG

#### 3. 티비플 (구름 자막) — YouTube embed + CSS 오버레이

**구조**: YouTube embed 위에 투명 구름 자막 레이어를 얹는 방식.
구름 자막 레이어는 iframe 위의 별도 div이므로 YouTube 플레이어 수정이 아님.

```
┌─────────────────────────┐
│  티비플 앱 (독립 웹앱)     │
│  ├─ YouTube iframe       │  ← z-index 낮음
│  ├─ 구름 자막 레이어       │  ← z-index 높음, pointer-events: none
│  └─ 댓글 입력 UI          │
└─────────────────────────┘
```

**YouTube TOS 안전 가이드라인**:
- 오버레이 `pointer-events: none` 필수 — 플레이어 컨트롤 조작 방해 금지
- 자막 영역을 영상 상단 ~70%로 제한 — 하단 컨트롤바 + YouTube 로고 보호
- 사용자 구름 자막 ON/OFF 토글 제공
- 풀스크린 시 자막 비표시 (YouTube 네이티브가 제어, 오버레이 불가)
- 플레이어 외관 수정/브랜딩 제거 금지
- 니코동/Bilibili 웹 플레이어도 같은 오버레이 방식 — 확립된 패턴

**타이밍 동기화 — 본편 타임라인 추종 방식**:

광고/버퍼링/시크를 개별 감지하지 않고, `getCurrentTime()` 폴링으로 **본편 시간의 진행 여부만 추적**:

```
영상 재생 시작
  └→ setInterval로 getCurrentTime() 폴링 (~250ms)
       ├─ 시간이 진행 중 → 구름 자막 정상 흐름
       ├─ 시간이 멈춤 (광고/버퍼링/일시정지) → 구름 자막 일시정지
       └─ 시간이 점프 (광고 스킵/시크) → 구름 자막 해당 시점으로 리셋
```

광고 재생 중에는 `getCurrentTime()`이 본편 시간을 진행시키지 않으므로, 광고 종료/스킵 시 자동으로 동기화 복귀. 모든 케이스(광고, 버퍼링, 일시정지, 시크)가 하나의 로직으로 수렴.

**자막 데이터**: Supabase 저장 (타임스탬프 + 사용자 키 + 텍스트)

**최소 기능**:
- YouTube embed 플레이어
- 구름 자막 오버레이 (right→left 흐르는 텍스트, 타임라인 동기화)
- 댓글 입력창

### URL 바로가기 / 콘텐츠 브릿지

**Phase 1 — MVP 런칭 전:**
- [ ] URL 바로가기 만들기 — 사용자가 URL 입력 → 바탕화면에 .url 파일 생성 → 브라우저 앱에서 열기. 기존 FSNode url 필드 + EXT_APP_MAP '.url' → 'browser' 매핑 활용

**Phase 2 — 본인 콘텐츠 확장:**
- [ ] 미니홈피 — Interactive Plains 확장 (계정 시스템 + 프로필 + 방명록)
- [ ] 플래시 게임 사이트 — 독립 웹앱 (게임 포털 + iframe 2단 중첩)
- [ ] 티비플 — 독립 웹앱 (YouTube embed + 구름 자막)
- [ ] 기존 프로젝트 추가 연동 (craft_3d 등)

**Phase 3 — 커뮤니티 콘텐츠:**
- [ ] 외부 제작자 콘텐츠 연결 — 제작자가 iframe 허용 + URL 제공 → FeTreeOS에 "앱"으로 등록
- [ ] 앱 카탈로그 / 스토어 UI — 사용자가 "설치"하면 바탕화면에 추가

**iframe 정책 참고:** 대부분의 외부 사이트(Google, YouTube 등)는 X-Frame-Options로 iframe 임베드를 차단함.
이건 클릭재킹 방지 보안 정책이며 우회 대상이 아님. FeTreeOS에서 열 수 있는 콘텐츠는 본인 소유 또는 제작자가 명시적으로 허용한 것에 한정.
임베드 불가 시 사용자에게 안내 메시지 필요.
단, YouTube embed(`youtube.com/embed/...`)는 공식 허용 — iframe으로 재생 가능.

**API 연동 (iframe과 별개):** 데이터만 가져와서 자체 UI로 구성하는 방식. iframe 정책 무관.

| 서비스 | 가능한 활용 | 무료 티어 |
|--------|-----------|----------|
| YouTube Data API v3 | 영상 검색, 재생목록, 채널 정보 | 일 10,000 쿼터 |
| Spotify Web API | 플레이리스트, 트랙 정보, 30초 미리듣기 | 무료 |
| GitHub REST/GraphQL | 레포 정보, 커밋, 이슈 | 시간당 5,000회 |
| OpenWeather | 날씨 앱 | 월 1,000회 |
| Unsplash Image API | 바탕화면 배경 | 시간당 50회 |
| Google Calendar API | 캘린더 연동 (Clock 앱 확장) | 무료 |
| Discord Widget/API | 서버 상태, 온라인 멤버 | 위젯 무료 |

주의: API 키 노출 방지 → Next.js API Route 또는 Supabase Edge Function으로 프록시 필요. 무료 티어 한도 초과 시 과금 가능. 각 서비스 약관 확인 필요.

### 창작 도구 (소비자의 창작자화)

커스터마이징을 넘어 OS 안에서 직접 에셋을 만드는 앱들.
만든 에셋은 Supabase Storage 저장 → 공유 → 마켓 구조로 확장 가능.
"어딘가 모자란" 것이 핵심 — 제약이 양식이 되는 구조. 8비트/플래시 시대가 재밌었던 이유와 동일.

- [ ] 페인팅/드로잉 앱 — 배경화면 직접 제작 (Canvas API, SVG)
- [ ] 사운드 레코더 — 효과음/알림음 녹음 (MediaRecorder API). HTTPS + 사용자 허가 필수. iframe 앱이면 `allow="microphone"` 속성 필요, 내장 앱이면 제약 없음. 공유 시 "본인 창작물만 업로드" 약관으로 커버
- [ ] 테마 에디터 — 색상/레이아웃 조합 (CSS 변수 실시간 전환)
- [ ] 스프라이트 에디터 — 데스크탑 펫, 아이콘 등 조립/그리기
- [ ] 모자란 애니메이트 — 프레임 단위 그리기(Canvas), 레이어 2~3장, 양파 껍질(onion skin), GIF/스프라이트시트 내보내기. 플래시 시대 감성
- [ ] 모자란 무비 메이커 — 이미지/GIF 타임라인 배치, 텍스트 자막 오버레이, BGM 1트랙, 웹캠/녹화 클립(MediaRecorder API), WebM 내보내기
- [ ] 에셋 공유/마켓 — 다른 사용자의 테마/배경/펫을 "설치"

### 에셋 최적화 철학

닌텐도식 사고 — 사소해 보여도 용량과 효율에 대한 고집은 프로젝트 전체의 일관된 미학.
"직접 만든 에셋"이라는 원칙과도 맞닿아 있다. 기성 리소스를 갖다 쓰지 않는 것처럼, 포맷 선택에서도 최적의 형태를 추구한다.

**favicon 사례 (2026-04-28 결정)**:

FeTree 로고는 원과 선으로 구성된 단순한 디자인 — 본래 SVG(벡터)가 최적.
그러나 구형 브라우저 호환성을 고려하여 현재는 ICO(32x32, ~2.7KB)를 사용.

향후 계획:
- [ ] SVG favicon 도입 — 모던 브라우저 대상, 수백 바이트 수준
- [ ] ICO 폴백 자동 생성 — SVG 원본에서 빌드 시점에 Pillow 등으로 변환. 원본은 벡터 하나, ICO는 빌드 산출물(.gitignore)
- [ ] `app/icon.svg` + prebuild 스크립트 구조로 전환

이 패턴은 favicon에 국한되지 않는다. 앱 아이콘, UI 에셋, 사운드 등 모든 자체 제작 리소스에 "원본은 가장 가벼운 형태, 필요 시 빌드/런타임 변환"이라는 원칙을 적용한다.

### 에셋-메타데이터 통일 포맷

모든 창작 도구의 결과물을 동일한 구조로 저장/유통:

```
asset (에셋 — Storage에 바이너리)
  ├─ 실제 데이터 (벡터, 오디오, 스프라이트시트, GLB, WebM...)

asset_meta (메타데이터 — DB에 저장)
  ├─ format: "vector_frames" | "opus_audio" | "spritesheet" | "glb" | ...
  ├─ duration / frame_count / dimensions (포맷별 속성)
  ├─ tags, creator, created_at
  └─ thumbnail (인라인 base64 — 목록 렌더링 시 Storage 왕복 없음)
```

카탈로그/마켓 브라우징은 메타데이터만 읽음 (수 바이트). 실제 바이너리는 "설치"/"재생" 시에만 로드.
DAW, 무비 메이커, 애니메이트, 그림판, 스프라이트 에디터 — 어떤 도구에서 만든 것이든 같은 파이프라인으로 업로드/검색/소비.

### OS 사운드 테마

기본 사운드 테마 3종. 사용자가 테마 에디터에서 자기 사운드를 만들 때 "이런 걸 만들면 되는구나" 하는 레퍼런스 역할.

**테마**:
- **입 브금 테마** — 직접 입으로 만든 효과음 (채널 정체성 직결, "장비 없이도 된다"는 메시지)
- **기타 테마** — 기타 연주 기반 효과음
- **칩튠 테마** — 8비트/레트로 감성

**할당 이벤트**: 부팅/시작, 종료, 경고/에러, 클릭, 새 창 열기, 알림

Windows 사운드 스키마와 같은 구조. 단, 기본 테마 자체가 이미 개성 있는 콘텐츠라는 점이 차별점.

### Supabase 통합

단일 Supabase 프로젝트로 모든 앱 통합. 인증 1회로 전체 앱에서 동일 유저.

**현황 조사 (2026-04-28):**

Interactive Plains(FeTreeGame/interactive-plains)에 이미 Supabase 인프라가 가동 중:
- 개발/프로덕션 DB 분리 済 (별도 Supabase 프로젝트)
- 기존 테이블: `artworks` (id, strokes jsonb, bounds jsonb, placed_at jsonb, created_at)
- Realtime: presence(접속자 수) + postgres_changes(작품 동기화) 활성
- RLS 설정 済, API Routes(GET/POST/PATCH /api/plains) 가동 중
- 백업: `node scripts/backup.mjs` → JSON

**환경별 Supabase 프로젝트:**

| 환경 | Supabase 프로젝트 ID | 용도 | env 파일 |
|------|---------------------|------|---------|
| 개발 | `vadcnfhflpjqrglplkyo` | 로컬 개발, 테스트 | `.env.local` (fetreegame), `.env.dev` (interactive-plains) |
| 프로덕션 | `jpunsvpmueguisvcvhia` | 실서비스 | Vercel 환경변수, `.env.prod` (interactive-plains) |

**환경변수 (양쪽 프로젝트 공통):**

| 변수 | 범위 | 설명 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 클라이언트 | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트 | anon key (RLS 적용) |
| `SUPABASE_URL` | 서버 전용 | 서버사이드 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 | service role key (RLS 우회) |

FeTreeOS(fetreegame)는 현재 클라이언트 키 2개만 사용 (읽기 전용). 서버 키는 API Route 추가 시 도입 예정.
프로덕션 배포 시 Vercel 환경변수를 프로덕션 Supabase로 설정해야 함.

FeTreeOS는 **같은 Supabase 프로젝트에 연결**하여 기존 artworks 데이터를 활용하고, 향후 테이블(profiles, guestbooks, danmaku 등)을 추가하는 방향.

**첫 단계 — artworks 갤러리 앱:**
FeTreeOS 내장 앱으로 Interactive Plains의 artworks를 갤러리 형태로 조회. Supabase 연결의 실증이자, 두 프로젝트 간 데이터 공유의 첫 사례.

```
Supabase 프로젝트 (단일)
  ├─ Auth — 키 기반 인증 (전체 공유)
  ├─ Database
  │    ├─ artworks (Interactive Plains — 벡터 드로잉, 가동 중)
  │    ├─ profiles (미니홈피 — 예정)
  │    ├─ guestbooks (방명록 — 예정)
  │    ├─ danmaku (구름 자막 — 예정)
  │    ├─ user_settings (OS 설정 — 예정)
  │    ├─ assets (에셋 라이브러리 — 예정)
  │    ├─ user_assets (유저별 참조점 — 예정)
  │    └─ drawings (세계 벡터 데이터 — 예정)
  └─ Storage
       ├─ avatars/
       ├─ wallpapers/
       ├─ recordings/
       └─ sprites/
```

**에셋 참조 구조 — 클론이 아닌 참조점 추가**:

유저가 라이브러리에서 펫/테마 등을 선택하면 원본을 복제하지 않고 참조 ID만 저장.
유저 1만 명이 같은 펫을 써도 원본 1벌 + 참조 행 1만 개(수 KB).

```
assets (원본)
  ├─ id: "pet_001"
  ├─ type: "pet"
  └─ data: { strokes, frames, sounds... }

user_assets (참조 + 커스텀)
  ├─ user_id: "key_abc"
  ├─ asset_id: "pet_001"  ← 원본 참조
  ├─ slot: "desktop_pet"
  └─ custom: { color: "#ff0", name: "..." }  ← 개인 설정만
```

로딩 흐름: 로그인 → user_assets에서 참조 목록 조회 → 해당 asset_id만 선택적 로드 → custom 적용.
쿼리 2회로 완결. 라이브러리에 에셋 10만 개 있어도 유저가 쓰는 것만 로드.

원본 수정 시 모든 참조자에게 자동 반영 (펫 애니메이션 개선 등).
다른 유저가 만든 에셋도 같은 구조 — "설치" = 참조점 추가.

**선택적 로딩 — 뷰포트 기반 청크 로딩**:

세계 탐색 시 뷰포트 영역의 오브젝트만 범위 쿼리로 로드.
PostgreSQL 인덱스 + 범위 쿼리로 응답 ~10-30ms.
이미 로드한 영역은 메모리 캐시, 벗어난 영역은 해제 (게임 청크 로딩과 동일 원리).
Supabase Realtime도 뷰포트 범위 필터 가능 — 시야 안 변경만 수신.

무료 티어(DB 500MB, Storage 1GB, Auth 무제한)로 초~중기 충분.
바이너리 최적화 적용 시 유저 1,000명 적극 사용해도 Storage 100MB 미만 예상.
용량 제한 → 극도의 압축 설계 → 트래커 사운드, 저해상도 스프라이트 → 레트로 감성. 제약이 곧 양식.

### 기타 앱
- [ ] Supabase + Google OAuth 통합 인증 (OS 쉘 → iframe 앱 세션 전파)

## 성능 과제

### P1: loadFS() 반복 파싱 (fileSystem.ts) — ✅ 해결 (인메모리 캐시)

모든 FS 함수(getChildren, getNode, getPath, getDepth 등)가 호출마다 `localStorage.getItem + JSON.parse(전체 FS)`를 수행.

**호출 빈도 분석:**

- fileSystem.ts 내부에서 loadFS() 호출 14곳
- 함수 간 연쇄 호출: moveNodes → getDepth → loadFS 추가 1회
- FileExplorer 렌더 1회에 최소 getChildren(1) + getPath(1) = loadFS() 2회
- 바탕화면 + 탐색기 창 2개 열린 상태에서 렌더 1회 = loadFS() 6회
- 파일 이동 1회: moveNodes 내부 loadFS(1) + getDepth 내부 loadFS(1) + refresh 후 getChildren loadFS(1) = 3회

**스케일 시나리오:**

- 현재 FS 노드 ~20개: JSON.parse 비용 무시 가능 (~0.1ms)
- 100개: ~0.5ms × 3회 = 1.5ms/액션
- 500개 (Supabase 전환 후 현실적): JSON 파싱 자체는 빠르지만, 매 렌더마다 500개 객체 배열 생성 + filter/find 순회가 GC 압박

**해결 — 인메모리 캐시:**

```typescript
let cache: FSNode[] | null = null;

function loadFS(): FSNode[] {
  if (cache) return cache;
  cache = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  return cache;
}

function saveFS(nodes: FSNode[]): void {
  cache = nodes;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
}
```

14곳 전부 캐시 히트. 파싱은 페이지 로드 시 1회만. 기존 API 시그니처 변경 없음.

**주의점**: 현재 moveNodes 등이 loadFS() 결과를 직접 mutate하고 있음 (`node.parentId = targetParentId`).
캐시 도입 시 읽기 측에서 shallow copy가 필요하거나, write 함수 내부에서만 mutate를 허용하는 규칙이 필요.

**착수 조건**: 기능 추가 없이 fileSystem.ts 내부만 수정. 외부 API 변경 없음. 지금 바로 가능.

### P2: 창 드래그/리사이즈 시 전체 리렌더 (page.tsx) — (a) 완료

`handlePointerMove`에서 `setWindows(prev => prev.map(...))` — pointermove 60fps마다 windows 배열 전체 복사.
Home 컴포넌트가 리렌더되면 모든 창 + 바탕화면(FileExplorer desktop)도 VDOM diff 대상.

**리렌더 전파 경로 (창 드래그 1프레임):**

```
pointermove
  → setWindows([...]) — 배열 새 참조
  → Home 리렌더
    → windows.map — 모든 창 JSX 재생성
      → 각 창 style 객체 새로 생성 (인라인 = 매번 새 참조)
      → FileExplorer(desktop) — props에 인라인 콜백 → 매번 리렌더
        → 아이콘 N개 전부 VDOM diff
      → 다른 창들 — props 불변이어도 인라인 style 새 참조 → 리렌더
```

창 1개의 x,y만 바뀌는데 전체 페이지가 리렌더됨.
TODO '드래그 반응성 개선 — React state→DOM 1프레임 지연'의 근본 원인이 이것.

**해결 방향 3단계 (비용↔효과 순):**

**(a) React.memo + Window 컴포넌트 분리 — ✅ 완료**

page.tsx의 `windows.map` 내부 JSX를 `React.memo(Window)` 컴포넌트로 추출.
props가 안 바뀐 창은 리렌더 스킵. 인라인 콜백(`() => focusWindow(win.id)` 등)을
`useCallback`으로 안정화해야 memo가 효과를 발휘함.

- 작업량: page.tsx에서 창 렌더링 부분을 컴포넌트로 추출 + 콜백 안정화
- 효과: 드래그 중 다른 창과 바탕화면 리렌더 차단. 체감 개선 기대
- 한계: 드래그 대상 창 자체는 여전히 setState → 1프레임 지연

**(b) ref + rAF 직접 DOM 갱신 — 드래그 반응성이 실제 문제될 때**

드래그 중에는 React state를 건드리지 않고 `useRef`로 좌표 추적,
`requestAnimationFrame`으로 해당 DOM 요소의 `style.left/top`만 직접 갱신.
드래그 끝나면 최종 좌표를 setState로 확정. daedalOS가 이 패턴 사용.

- 작업량: 드래그 로직 전면 재구성. 스냅 프리뷰도 rAF 연동 필요
- 효과: 드래그 중 React 리렌더 0회. 사실상 네이티브 수준 반응성
- 한계: 코드 복잡도 증가. React 상태와 DOM 상태 동기화 관리 필요

**(c) CSS transform + will-change — (b)와 조합 시**

`left/top` % 대신 `transform: translate(x, y)`로 이동하면 브라우저가
해당 요소를 별도 합성(compositor) 레이어로 승격. 리페인트 없이 GPU에서 이동.
(b)와 조합하면 최적. 단독으로는 의미 제한적 (setState 비용이 주병목이므로).

**'지금 바로 가능'의 의미:**

P1과 P2(a)는 외부 동작 변경 없이 내부 구현만 수정하는 작업.
P1은 fileSystem.ts 내부에 캐시 변수 추가 + saveFS에서 갱신, 외부 함수 시그니처 불변.
P2(a)는 page.tsx의 창 렌더링 JSX를 별도 컴포넌트로 추출 + memo 감싸기.
둘 다 기능 추가/변경 없이 성능만 개선. 새 기능 작업 전에 끼워넣기 좋은 타이밍.
P2(b) 완료 — ref + DOM 직접 갱신 전환 済. 드래그 중 React 리렌더 0회.
P2(c) CSS transform + will-change — 추가 최적화 여지. 현재 체감 충분하므로 후순위.

### P3~P4 (낮은 우선순위)

- P3: 아이콘 드래그 중 setState 3개 동시 갱신 (iconDrag, dropTarget, selectedIds) — React 18 배칭으로 1회 합산되지만 구조적 비용
- P4: 그리드 디버그 오버레이 cols×rows div 매 렌더 생성 — 디버그 전용이므로 낮음

## ✅ 완료 — ref + rAF 전환 (P2(b))

드래그/리사이즈/스냅 전체를 setState 기반에서 ref + DOM 직접 갱신으로 일괄 전환. 상세: `docs/RAF_MIGRATION_PLAN.md`

- [x] 드래그 중 useRef로 좌표 추적, DOM style 직접 갱신 → 끝나면 setState 확정
- [x] 리사이즈 중 style.left/top/width/height를 ref로 직접 변경 → 끝나면 setState 확정
- [x] 스냅 프리뷰도 ref 전환 (항상 마운트, display 토글)
- [ ] CSS transform + will-change 조합으로 compositor 레이어 승격 — 추가 최적화 여지, 현재 체감 충분

## 인지된 과제

- [x] 메모장 새 파일 생성 시 3중 생성 버그 — initialized ref 가드 + onFSChange 호출로 해결
- [x] 바탕화면 새 파일/폴더 생성 위치 — 명시적 새로고침 모델 도입으로 해결
- [x] 탐색기 폴더 진입 시 '빈 폴더입니다' 플리커 — hydration useEffect에서 items 동기 로드 + hydrated 플래그로 빈 폴더 메시지 지연 표시
- [x] Hydration mismatch — useState(() => localStorage...) 패턴 전면 제거. SSR 기본값 + useEffect 지연 초기화로 통일 (FileExplorer 3곳, Settings 1곳)
- [x] 창 드래그 중 iframe에 마우스 진입 시 드래그 끊김 — setPointerCapture로 루트 요소가 모든 포인터 이벤트 독점, iframe 캡처 원천 차단
- [x] 메모장 최초 실행 시 파일 2중 생성 — StrictMode 이중 useEffect 방어(initialized ref) + onFSChange 누락 수정
- [x] 바탕화면 새 파일/폴더 생성 위치 — useEffect에서 sort 분리, 명시적 새로고침 모델 도입. 새 파일은 항상 끝에 배치
- [x] 리팩터링 — 배치 로직 헬퍼 추출(allDesktopItems, applyLayout, compactLayout), sortLayout 통합, useDesktopDrag placeOnGrid 재사용
- [x] 포커스 승계 — 창 닫기/최소화 시 z-order 최상위 창으로 포커스 자동 이동
- [x] singleInstance 플래그 — 앱별 다중 창 허용 여부 제어 (Settings, MyComputer: 앱 레벨, 휴지통: fileId 레벨)
- [x] 파일/폴더 다중 창 열기 — fileId 중복 체크 제거 (클래식 Windows 동작)
- [x] 메모장 다중 창 저장 시 동명 파일 버그 — createFile 후 title을 실제 생성된 node.name으로 동기화

## ✅ 완료 — 고유파일 규칙 + 이동 충돌 다이얼로그

- [x] 파일명 유니크 규칙 — `uniqueName(parentId, name)` 헬퍼. 생성 시 자동 넘버링 (`새 메모.txt` → `새 메모 (2).txt`). createFile/createFolder에 적용
- [x] 크로스 드래그 유니크 처리 — moveNodes의 rename 모드에서 동일 로직 적용
- [x] 이동 충돌 다이얼로그 — `checkMoveConflicts()` + 3버튼 다이얼로그 (건너뛰기/덮어쓰기/다른 이름). moveNodes에 `MoveConflictMode` 파라미터 추가

## 미착수

### 잔여 확인 패턴

- [ ] 인라인 이름 변경(rename) 시 중복 체크 — updateNode에서 같은 폴더 내 동명 파일 거부
- [ ] 메모장 지연 생성 — Save 전까지 FS에 파일 미생성 (currentFileId: null 상태에서 메모리에만 content 보유). 닫기 시 "저장하시겠습니까?" 확인

### 탐색기 트리뷰 (네비게이션 패널)

- [ ] TreeView 사이드바 — 탐색기 좌측에 폴더 계층 트리 표시 (▶/▼ 펼침/접힘, 들여쓰기)
- [ ] 트리 클릭 시 우측 파일 그리드 네비게이션 연동 (navigateTo)
- [ ] 현재 폴더 하이라이트 + 부모 자동 펼침
- [ ] 고정 항목 — 바탕 화면, 내 문서, 음악, 사진, 동영상 등 XP 스타일 퀵 액세스 (admin 사용자 폴더 구조)
- [ ] 내 컴퓨터 노드 — 드라이브/시스템 정보 진입점

선행 조건: 핵심 콘텐츠 앱 + 심각한 버그 처리 후 착수. 고정 항목은 FS에 특수 폴더(Downloads, 음악, 사진, 동영상) 추가와 연동.

### 기타

- [ ] 캘린더 확장 — 월 이동, 날짜별 공지 메모 (유튜브 채널 랜딩 → OS 진입 맥락)
- [ ] 기존 프로젝트 추가 연동 (craft_3d 등)
- [ ] games/[slug] 라우트 정리 (orphaned)
- [ ] CLAUDE.md 작성
- [ ] 모바일 대응 — 5레이아웃 (PC, iPhone 세로/가로, Android 세로/가로)
- [ ] 동영상 플랫폼 논의 — 무료 서버에서 가능한 새로운 포맷 제시 (티비플과 별개 방향 탐색)
