# page.tsx 분리 계획서 — ✅ 완료

대상: `app/page.tsx` (805줄 → 342줄)
결과: 5개 파일 추출, 58% 감소

## 현재 구조 분석

| # | 영역 | 라인 | 줄 수 | 역할 |
|---|------|------|-------|------|
| A | 타입/상수 | 14~67 | 54 | WindowState, DragMode, SnapZone, SNAP_RECTS 등 |
| B | AppWindow memo | 74~212 | 139 | 창 컴포넌트 (타이틀바, 콘텐츠, 리사이즈 핸들) |
| C | Home state/init | 214~301 | 88 | 상태 선언, openApp, openNode, initDefaultFS |
| D | 창 조작 callbacks | 303~351 | 49 | close, minimize, toggleMaximize, navigateBrowser |
| E | 드래그 핸들러 | 353~406 | 54 | titlePointerDown, snapRestore, resizePointerDown |
| F | handlePointerMove | 408~497 | 90 | 창 이동/리사이즈 DOM 직접 갱신 |
| G | handlePointerUp | 499~589 | 91 | 크로스 드래그 드롭 + 상태 확정 |
| H | JSX: Desktop+Windows | 592~664 | 73 | 바탕화면, 스냅 프리뷰, 창 렌더링 루프 |
| I | JSX: 다이얼로그 | 666~739 | 74 | alertMsg + moveConflict |
| J | JSX: 태스크바+시작메뉴 | 742~801 | 60 | 하단 바 + 앱 목록 팝업 |

## 분리 대상 (5개 파일)

### Step 1. `app/Dialog.tsx` (~74줄 절감)

**추출 대상**: 영역 I (alertMsg + moveConflict 다이얼로그)

**설계**:
```typescript
interface DialogButton {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'primary';
}

interface DialogProps {
  title: string;
  children: React.ReactNode;
  buttons: DialogButton[];
  onClose: () => void;
}
```

**variant → className 매핑**:
- `default` → `bg-zinc-700 hover:bg-zinc-600`
- `danger` → `bg-red-800/80 hover:bg-red-700/80`
- `primary` → `bg-blue-700/80 hover:bg-blue-600/80`

**page.tsx 변경**:
- alertMsg → `<Dialog title="FeTreeOS" buttons={[{label:'OK', onClick: () => setAlertMsg(null)}]} onClose={() => setAlertMsg(null)}><p>...</p></Dialog>`
- moveConflict → `<Dialog title="파일 충돌" buttons={[건너뛰기, 덮어쓰기, 다른이름]} ...>` + 충돌 파일 목록 children
- 다이얼로그 JSX 70줄 → import + 호출 ~15줄

**위험도**: 낮음 — 순수 표현 컴포넌트, 로직 변경 없음

---

### Step 2. `app/AppWindow.tsx` (~139줄 절감)

**추출 대상**: 영역 A(일부) + B

**이동 항목**:
- `AppWindowProps` interface
- `AppWindow` memo 컴포넌트 전체
- 상수: `MIN_W_PX`, `MIN_H_PX` (AppWindow 내부에서 사용)
- `SNAP_RECTS` (AppWindow의 snap 스타일 계산에 필요)

**page.tsx에 잔류**:
- `WindowState` interface (Home 상태에서 사용)
- `SnapZone` type (Home과 AppWindow 양쪽 사용 → `windowTypes.ts`로 이동 또는 AppWindow.tsx에서 export)
- `SNAP_ZONES`, `detectSnap` (handlePointerMove에서 사용)

**의존성**:
- AppWindow → apps.ts (AppDef), Notepad, FileExplorer, Browser, Settings, Gallery, MyComputer
- page.tsx → AppWindow (import)

**위험도**: 낮음 — 이미 memo로 격리됨, props 인터페이스 확정

---

### Step 3. `app/Taskbar.tsx` (~60줄 절감)

**추출 대상**: 영역 J (태스크바 + 시작메뉴)

**설계**:
```typescript
interface TaskbarProps {
  windows: WindowState[];
  focusedId: string | null;
  startMenuOpen: boolean;
  onStartToggle: () => void;
  onWindowClick: (id: string) => void;
  onMinimize: (id: string) => void;
  onFocus: (id: string) => void;
  onOpenApp: (app: AppDef) => void;
}
```

**포함 요소**:
- 태스크바 바 (Start 버튼 + 창 목록 + Clock)
- 시작메뉴 팝업 (APPS 목록)

**의존성**:
- Taskbar → Clock, APPS (apps.ts), WindowState type
- page.tsx → Taskbar (import)

**위험도**: 낮음 — 표현 + 이벤트 전달 전용

---

### Step 4. `app/useWindowDrag.ts` (~181줄 절감)

**추출 대상**: 영역 E + F + G의 창 드래그/리사이즈 부분

**설계**:
```typescript
interface UseWindowDragOptions {
  windows: WindowState[];
  setWindows: React.Dispatch<SetStateAction<WindowState[]>>;
  rootRef: RefObject<HTMLDivElement>;
  desktopRef: RefObject<HTMLDivElement>;
  focusWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
}

interface UseWindowDragReturn {
  dragging: { kind: 'move' | 'resize'; id: string; edge?: string } | null;
  snapPreviewRef: RefObject<HTMLDivElement>;
  handleTitlePointerDown: (id: string, e: React.PointerEvent) => void;
  handleResizePointerDown: (id: string, edge: string, e: React.PointerEvent) => void;
  handlePointerMove: (e: React.PointerEvent) => void;
  handlePointerUp: (e: React.PointerEvent) => void;
}
```

**내부 관리 항목** (page.tsx에서 이동):
- `dragRef` (useRef<DragMode>)
- `dragging` state
- `snapPreviewRef`
- `lastTitleClick` ref
- `suppressDesktopBlur` ref
- `handleSnapRestore` callback
- `detectSnap` function
- 상수: `SNAP_ZONES`, `SNAP_EDGE_PX`

**아이콘 크로스 드래그 처리**:
handlePointerMove/Up의 아이콘 관련 로직(iconDragInfo)은 page.tsx에 잔류.
hook은 `iconDragInfo`를 옵션으로 받아 아이콘 드래그 중 창 이벤트를 스킵하는 구조.

**위험도**: 중간 — 가장 복잡한 분리. iconDragInfo와 창 드래그가 같은 handlePointerMove 안에서 분기됨. 분리 시 이벤트 핸들러를 합성하는 구조 필요.

**대안**: handlePointerMove를 page.tsx에 유지하되, 창 드래그 로직만 hook의 `processMove(e)` / `processUp(e)` 메서드로 위임. 이벤트 핸들러 자체는 page.tsx가 소유.

---

### Step 5. `app/windowTypes.ts` (~30줄 절감)

**추출 대상**: 영역 A의 공유 타입/상수

**이동 항목**:
- `WindowState` interface
- `SnapZone` type
- `DragMode` type
- `SNAP_RECTS` constant
- `MIN_W_PX`, `MIN_H_PX` constants

**사용처**:
- page.tsx (Home 상태)
- AppWindow.tsx (렌더링)
- useWindowDrag.ts (드래그 로직)
- Taskbar.tsx (WindowState 참조)

**위험도**: 낮음 — 순수 타입/상수, 동작 변경 없음

---

## 실행 순서

| 순서 | 파일 | 절감 | 누적 잔여 | 의존 |
|------|------|------|----------|------|
| 1 | `windowTypes.ts` | ~30 | ~775 | 없음 (타입만) |
| 2 | `Dialog.tsx` | ~74 | ~701 | 없음 |
| 3 | `AppWindow.tsx` | ~139 | ~562 | windowTypes.ts |
| 4 | `Taskbar.tsx` | ~60 | ~502 | windowTypes.ts |
| 5 | `useWindowDrag.ts` | ~181 | ~321 | windowTypes.ts |

전 Step 완료. 빌드 통과 + 브라우저 검증 済.

## 분리 후 page.tsx 실제 구조 (342줄)

```
import 선언 (~15줄)
Home() {
  // 상태 선언 (~20줄)
  // openApp, openNode, refreshDesktop (~40줄)
  // close, minimize, toggleMaximize, navigateBrowser (~50줄)
  // 합성 이벤트 핸들러 (~20줄) — useWindowDrag + iconDrag 분기
  // JSX return (~150줄)
  //   Desktop div (snapPreview, FileExplorer desktop, AppWindow 루프, ghost 아이콘)
  //   Dialog (alertMsg, moveConflict)
  //   Taskbar
}
```

## 주의사항

- 각 Step 완료 후 `npm run build` + 브라우저 검증 필수
- 기능 변경 없음 — 리팩터링만. 동작 차이 0이 기준
- Step별 개별 커밋 (롤백 단위 확보)
- CLAUDE.md Architecture 테이블 갱신 필요 (새 파일 추가 시)

## CLAUDE.md 갱신 예정

```markdown
| File | Role |
|------|------|
| `app/page.tsx` | OS shell — 상태 관리, 레이아웃, 이벤트 합성 |
| `app/windowTypes.ts` | 창 관련 타입/상수 (WindowState, SnapZone, DragMode) |
| `app/AppWindow.tsx` | 창 컴포넌트 (타이틀바, 콘텐츠, 리사이즈 핸들) |
| `app/Dialog.tsx` | 범용 다이얼로그 컴포넌트 |
| `app/Taskbar.tsx` | 태스크바 + 시작메뉴 |
| `app/useWindowDrag.ts` | 창 드래그/리사이즈 커스텀 hook |
```
