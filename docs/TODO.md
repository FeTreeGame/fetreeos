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

- [ ] 미니홈피 (개인 공간 — Supabase 인증 연동)
- [ ] 플래시 게임 사이트 (browser 앱 확장)
- [ ] 구름글귀평원 (YouTube iframe + CSS 오버레이 구름 자막)
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
P2(b)(c)는 드래그 체감이 실제로 문제될 때 — 스냅/리사이즈 전체를 rAF로 전환해야 하므로 단독 작업 단위.

### P3~P4 (낮은 우선순위)

- P3: 아이콘 드래그 중 setState 3개 동시 갱신 (iconDrag, dropTarget, selectedIds) — React 18 배칭으로 1회 합산되지만 구조적 비용
- P4: 그리드 디버그 오버레이 cols×rows div 매 렌더 생성 — 디버그 전용이므로 낮음

## 인지된 과제

- [ ] 드래그 반응성 개선 — React state→DOM 1프레임 지연이 원인 (정합성은 확인 완료). 드래그 중 래스터화 레이어 전환 등 compositor 수준 접근 필요. daedalOS 참조
- [x] 메모장 새 파일 생성 시 3중 생성 버그 — initialized ref 가드 + onFSChange 호출로 해결
- [x] 바탕화면 새 파일/폴더 생성 위치 — 명시적 새로고침 모델 도입으로 해결
- [x] 탐색기 폴더 진입 시 '빈 폴더입니다' 플리커 — hydration useEffect에서 items 동기 로드 + hydrated 플래그로 빈 폴더 메시지 지연 표시
- [x] Hydration mismatch — useState(() => localStorage...) 패턴 전면 제거. SSR 기본값 + useEffect 지연 초기화로 통일 (FileExplorer 3곳, Settings 1곳)
- [x] 창 드래그 중 iframe에 마우스 진입 시 드래그 끊김 — setPointerCapture로 루트 요소가 모든 포인터 이벤트 독점, iframe 캡처 원천 차단
- [x] 메모장 최초 실행 시 파일 2중 생성 — StrictMode 이중 useEffect 방어(initialized ref) + onFSChange 누락 수정
- [x] 바탕화면 새 파일/폴더 생성 위치 — useEffect에서 sort 분리, 명시적 새로고침 모델 도입. 새 파일은 항상 끝에 배치
- [x] 리팩터링 — 배치 로직 헬퍼 추출(allDesktopItems, applyLayout, compactLayout), sortLayout 통합, useDesktopDrag placeOnGrid 재사용

## 미착수

### 고유파일 규칙 + 확인 패턴

- [ ] 파일명 유니크 규칙 — 같은 폴더 내 동일 이름+확장자 중복 불허. 생성 시 자동 넘버링 (`새 메모.txt` → `새 메모 (2).txt`). 파일과 폴더 모두 적용
- [ ] 이동/복사 충돌 시 확인 다이얼로그 — 덮어쓰기 / 건너뛰기 / 이름 변경 선택. Windows 패턴 준용
- [ ] 메모장 지연 생성 — Save 전까지 FS에 파일 미생성 (currentFileId: null 상태에서 메모리에만 content 보유). 닫기 시 "저장하시겠습니까?" 확인

### 기타

- [ ] 캘린더 확장 — 월 이동, 날짜별 공지 메모 (유튜브 채널 랜딩 → OS 진입 맥락)
- [ ] 기존 프로젝트 추가 연동 (craft_3d 등)
- [ ] games/[slug] 라우트 정리 (orphaned)
- [ ] CLAUDE.md 작성
- [ ] 모바일 대응 — 5레이아웃 (PC, iPhone 세로/가로, Android 세로/가로)
