# Architecture

## 개요

웹 기반 가상 OS 데스크톱 환경. Next.js 16 위에서 단일 페이지(`app/page.tsx`)로 동작.
기존 프로젝트들을 "앱"으로 통합하는 쉘 역할.

## 레이어 구조

```
┌─────────────────────────────────┐
│  Root Layout (layout.tsx)       │  HTML/body, 폰트, globals.css
├─────────────────────────────────┤
│  Home (page.tsx)                │  전체 OS 쉘 (윈도우 매니저 + 크로스 드래그)
│  ├─ Desktop                     │  flex-1, 바탕화면 영역
│  │  ├─ FileExplorer(desktop)    │  inset-0, mode='desktop' — 아이콘+휴지통
│  │  ├─ Snap Preview             │  드래그 중 스냅 힌트 (% 기반)
│  │  ├─ Windows[]                │  자유 배치(비율) 또는 스냅(% CSS)
│  │  └─ Cross-drag Ghosts        │  탐색기→바탕화면 드래그 시 고스트 렌더링
│  ├─ Taskbar                     │  h-10 고정, Start + 창 버튼 + 시계
│  └─ Start Menu                  │  absolute, z-9999
└─────────────────────────────────┘
```

## 파일 구조

```
app/
├── page.tsx              (557행)  윈도우 매니저 + 크로스 드래그 조정
├── FileExplorer.tsx      (578행)  바탕화면/탐색기 통합 컴포넌트
├── useDesktopDrag.ts     (220행)  바탕화면 드래그 드롭 로직 (훅)
├── useExplorerDrag.ts     (87행)  탐색기 드래그 드롭 로직 (훅)
├── ContextMenu.tsx       (131행)  우클릭 메뉴 (바탕화면/탐색기/휴지통 분기, 서브메뉴)
├── constants.ts           (75행)  공유 상수 + 타입 + 정렬 comparator + 배치 헬퍼
├── fileSystem.ts         (312행)  가상 FS (localStorage, moveNodes, 순환 방지)
├── apps.ts                (25행)  앱 정의 (AppDef + APPS 배열)
├── Browser.tsx            (81행)  브라우저 앱
├── Clock.tsx              (85행)  시계 + 캘린더 팝업
├── Notepad.tsx           (147행)  메모장 앱 (FSNode 연동)
├── Settings.tsx          (112행)  제어판 앱
├── noteStore.ts           (33행)  메모장 상태 스토어
├── sampleNotes.ts         (40행)  샘플 메모 데이터
└── layout.tsx             (34행)  루트 레이아웃
                         ───────
                         2,517행 합계
```

## 좌표계

- **자유 배치 창**: x, y, w, h 모두 0~1 비율. 렌더링 시 `${v * 100}%`로 변환.
- **스냅 창**: `snapZone` 필드에 존 이름 저장, `SNAP_RECTS`의 CSS % 값 직접 적용.
- **바탕화면 아이콘**: N×M 그리드 (셀 90×90px), `ResizeObserver`로 동적 계산. 아이콘 좌표는 `fetree-icon-positions` localStorage 키에 별도 저장 (FS 데이터와 분리). 자유 배치 드래그 + 정렬 옵션 지원.
- **최소 크기**: `minWidth`/`minHeight` px 하한으로 과소 방어.

## 파일 시스템

가상 파일 시스템 (`app/fileSystem.ts`). localStorage 기반, Supabase 교체 지점 분리.

```typescript
interface FSNode {
  id: string;
  name: string;
  type: 'file' | 'folder' | 'app';
  parentId: string;   // 'desktop', 'trash', 폴더 id
  extension?: string;
  content?: string;
  appId?: string;     // app 노드 → AppDef.id 매핑
  icon?: string;
}
```

- **바탕화면 = FileExplorer desktop 모드** — `getChildren('desktop')` + 휴지통 가상 노드
- **앱 바로가기**: `type: 'app'` 노드, `initDefaultFS`에서 APPS 기반 자동 생성, 삭제 보호
- **휴지통**: `parentId: 'trash'`로 이동, 완전 삭제는 `emptyTrash`만
- **확장자→앱 매핑**: `.txt` → notepad, `.url` → browser
- **FS 버전 관리**: `fetree-fs-version`으로 앱 추가 시 기존 데이터 보존
- **MAX_DEPTH = 4**: desktop 아래 4단계. `getPath`/`getDepth`로 경로 계산, `createFolder`에서 초과 차단
- **moveNodes**: 모든 이동 통합 (바탕화면↔폴더↔휴지통 = parentId 변경). 앱 보호, 순환 방지(`isDescendant`), depth 초과 차단 포함

## 앱 시스템

앱 정의는 `app/apps.ts`에 분리. 기본 앱(explorer, browser, notepad)과 콘텐츠 앱(iframe 외부 프로젝트)을 구분.

```typescript
interface AppDef {
  id: string;
  title: string;
  icon: string;
  type: 'browser' | 'notepad' | 'iframe' | 'explorer' | 'settings' | 'empty';
  defaultW?: number;
  defaultH?: number;
  url?: string;
}
```

- `explorer`: 파일 탐색기 — 폴더 탐색, breadcrumb, 우클릭 메뉴, 파일/폴더 CRUD
- `browser`: 주소창 + 게임 목록/상세 + iframe 임베드
- `notepad`: 파일 기반 편집기 — FSNode 연동, File > New/Open/Save
- `iframe`: 외부 배포 프로젝트를 전체 크기 iframe으로 임베드 (비활성 시 pointerEvents 차단)
- `settings`: 제어판 — 아이콘 위치 초기화, 그리드 토글, 전체 데이터 초기화
- `empty`: 플레이스홀더 (미구현 앱)

## 컴포넌트 구조

### page.tsx — 윈도우 매니저 + 크로스 드래그 조정

윈도우 생명주기(open/close/minimize/maximize/snap)와 크로스 드래그 드롭 중재.
파일 관련 로직은 FileExplorer로 위임.

### FileExplorer.tsx — 바탕화면/탐색기 통합

Windows explorer.exe 구조. 단일 컴포넌트가 두 가지 모드로 동작:

- `mode='desktop'`: 툴바/상태바 숨김, 배경 투명, 90x90 그리드, 휴지통 가상 노드 포함
- `mode='explorer'`: 툴바(뒤로/앞으로/위로/breadcrumb 주소), 상태바, 폴더 탐색
- `refreshKey` prop으로 외부 FS 변경 감지 (Notepad 등에서 파일 생성 시 바탕화면 갱신)

드래그 로직은 두 커스텀 훅으로 분리:

- **useDesktopDrag** — 바탕화면 전용: 그리드 기반 드롭 타겟, 자동 정렬 끼워넣기, 폴더/휴지통 드롭, 크로스 드래그 시작
- **useExplorerDrag** — 탐색기 전용: DOM rect 기반 러버밴드, 크로스 드래그 시작

### constants.ts — 공유 자원

모듈 스코프 상수와 타입. 렌더 비용 0:

- `CELL_W`, `CELL_H`, `TRASH_NODE`, `TYPE_ORDER`
- 공유 타입: `IconPositions`, `IconDragInfo`, `IconDragState`, `SelBoxState`, `DropTargetState`, `SortKey`
- `SORT_COMPARATORS` — 이름순/유형순/날짜순 비교 함수 (바탕화면 정렬, 탐색기 정렬, 자동 정렬에서 공유)
- `placeOnGrid()` — 정렬된 아이템을 col->row 순으로 그리드 배치

### ContextMenu.tsx — 우클릭 메뉴

상황별 메뉴 분기: 휴지통 배경, 휴지통 아이템, 일반 파일/폴더/앱, 바탕화면 배경(서브메뉴: 새로 만들기, 정렬 기준), 탐색기 배경.

### 기타

- `Clock.tsx` — 시계 + 캘린더 팝업
- `Notepad.tsx` — 파일 기반 텍스트 편집기
- `Settings.tsx` — 제어판 (그리드 토글 -> FileExplorer 연동, initDefaultFS 재초기화)
- `Browser.tsx` — 주소창 + 게임 목록 + iframe

## 드래그 드롭 아키텍처

### 바탕화면 내부 드래그

`useDesktopDrag` 훅이 처리. 그리드 좌표 기반 드롭 타겟 계산:

- 셀 중심 20~80% -> 폴더/휴지통 드롭 (초록 하이라이트)
- 자동 정렬 ON -> 가로 삽입 막대
- 자동 정렬 OFF -> 셀 하이라이트 + 위치 교환
- 다중선택 시 전체 그룹 이동 (getDragIds로 선택 그룹 결정)

### 크로스 드래그 (바탕화면 <-> 탐색기 <-> 탐색기)

3계층 협력 구조:

```
FileExplorer (발신측)
  | onIconDragChange(IconDragInfo)
page.tsx (중재자)
  | crossDragging / crossDropTarget props
FileExplorer (수신측)
```

1. 드래그 시작 -> `onIconDragChange`로 `{ ids, sourceFolder, ghosts, curX, curY }` 전달
2. page.tsx가 `iconDragInfo` 상태 보유, 모든 윈도우에 `pointerEvents: 'none'` 적용
3. page.tsx `handlePointerMove`에서 고스트 좌표 갱신 + 휴지통 호버 판정(`crossDropTarget`)
4. page.tsx `handlePointerUp`에서 `querySelectorAll('[data-drop-folder]')` + rect/zIndex로 최상위 드롭 대상 결정
5. 드롭 후 `setTimeout(() => focusWindow(winId), 0)`으로 대상 창 포커스 (state 배칭 우회)

**고스트 렌더링 분할**: 바탕화면 출발 드래그는 FileExplorer가 자체 고스트 렌더링.
탐색기 출발 드래그는 page.tsx가 고스트 렌더링. `crossDragging` prop으로 중복 방지.

### 순환 이동 방지

`moveNodes`에서 `isDescendant(ancestorId, nodeId)` — parentId 체인 순회.
셀렉션 그룹 내에서 문제 아이템만 필터링, 나머지는 정상 이동.

## 윈도우 관리

- **z-index**: 전역 카운터(`zCounter++`)로 스택 순서 관리
- **포커스**: `focusedId` 상태로 활성 창 추적. 바탕화면 클릭 시 null -> 모든 타이틀바 비활성
- **드래그**: 타이틀바 pointerdown -> pointermove(비율 연산) -> pointerup
- **리사이즈**: 8방향 엣지/코너 핸들, 비율 연산, 최소 크기 clamp
- **스냅**: Elara 패턴 — 커서 위치를 % 변환 -> SNAP_ZONES 매칭 -> 프리뷰 -> 확정
- **최대화**: snapZone='fullscreen'과 동일 처리
- **스냅 해제**: 스냅/최대화 상태에서 타이틀바 드래그 -> 이전 크기(preSnapW/H) 복원 + 커서 중심 배치
- **드롭 포커스**: 크로스 드래그 드롭 시 대상 창 자동 포커스 (Windows 동작 일치)

## 선택과 러버밴드

- **클릭 선택**: 단일 클릭으로 선택, Ctrl+클릭으로 토글
- **러버밴드**: 배경 드래그로 범위 선택. rect 겹침 판정 (바탕화면: 그리드 좌표, 탐색기: DOM rect)
- **Ctrl+러버밴드**: 기존 선택 유지 + 범위 내 XOR 토글
- **더블클릭**: 앱 실행 시 선택 해제

## 레퍼런스

- `_ref/ProzillaOS/` — 윈도우 매니저 패턴, 바운딩, z-index 그룹
- `_ref/daedalOS/` — 캐스케이드 배치, 화면 밖 clamp, 트랜지션
- `_ref/elara/` — 스냅 도킹 존/영역, 프리뷰 오버레이
