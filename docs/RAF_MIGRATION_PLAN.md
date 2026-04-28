# ref + rAF 전환 계획서

드래그/리사이즈 반응성 개선을 위해 React setState 기반에서 ref + requestAnimationFrame 직접 DOM 갱신으로 전환.

## 현재 구조 (setState 기반)

### 데이터 흐름

```
pointermove
  → setWindows(prev => prev.map(...))   // 매 프레임 전체 windows 배열 복사
  → Home 리렌더
  → AppWindow memo diff
  → 대상 창 style 갱신 (React DOM reconciliation)
  → 브라우저 paint
```

### 관련 상태

```typescript
// page.tsx
const [windows, setWindows] = useState<WindowState[]>([]);
const [drag, setDrag] = useState<DragMode | null>(null);
const [snapPreview, setSnapPreview] = useState<SnapZone>(null);
```

### 코드 위치 (page.tsx 기준)

| 함수 | 줄 | 역할 | setState 호출 |
|------|-----|------|--------------|
| `handleTitlePointerDown` | ~353 | 이동 시작 | `setDrag()` |
| `handleResizePointerDown` | ~397 | 리사이즈 시작 | `setDrag()` |
| `handlePointerMove` | ~409 | 매 프레임 위치/크기 갱신 | `setWindows()`, `setSnapPreview()` |
| `handlePointerUp` | ~471 | 드래그 종료 + 스냅 적용 | `setWindows()`, `setDrag(null)`, `setSnapPreview(null)` |
| `handleSnapRestore` | ~376 | 스냅 해제 시 원래 크기로 복원 | `setWindows()`, `setDrag()` |

### 병목

- `handlePointerMove`가 pointermove 매 이벤트(~60fps)마다 `setWindows()` 호출
- Home 리렌더 → 모든 창 VDOM diff (AppWindow memo로 비관련 창은 스킵되지만, 대상 창 + windows 배열 자체는 매번 재생성)
- setState → 리렌더 → DOM 갱신까지 최소 1프레임 지연

## 전환 후 구조 (ref + rAF)

### 데이터 흐름

```
pointermove
  → dragRef.current에 좌표 저장 (동기, 할당만)
  → rAF 콜백에서 DOM element.style 직접 변경 (리렌더 없음)
  → 브라우저 paint

pointerup
  → rAF 중단
  → 최종 좌표를 setWindows()로 확정 (React 상태 동기화)
```

### 핵심 원칙

1. **드래그/리사이즈 중에는 React state를 건드리지 않는다**
2. **DOM 요소의 style을 ref로 직접 변경한다**
3. **드래그 종료 시에만 setState로 최종 상태를 확정한다**
4. **기존 동작(스냅, 더블클릭, 포커스 등)을 100% 보존한다**

## 상세 변경 명세

### 1단계: dragRef 도입

현재 `drag` state를 `dragRef`로 전환. 드래그 중 상태는 ref에만 존재.

```typescript
// 현재
const [drag, setDrag] = useState<DragMode | null>(null);

// 전환 후
const dragRef = useRef<DragMode | null>(null);
const rafId = useRef<number>(0);

// drag state는 '드래그 중 여부'만 표현하는 boolean 또는 최소 정보로 축소
// → 루트 div cursor, pointerEvents 제어용
const [dragging, setDragging] = useState<{ kind: 'move' | 'resize'; id: string; edge?: string } | null>(null);
```

**이유**: `drag` state가 바뀌면 `handlePointerMove`의 useCallback deps가 바뀌고, 이것이 루트 div의 onPointerMove prop을 바꿔서 리렌더를 유발. ref는 변경해도 리렌더 없음.

### 2단계: handlePointerMove 재작성

```typescript
const handlePointerMove = useCallback((e: React.PointerEvent) => {
  // --- 아이콘 드래그 (기존 유지) ---
  if (iconDragInfo) { /* 기존 코드 그대로 */ }

  const d = dragRef.current;
  if (!d) return;
  const desktop = desktopRef.current;
  if (!desktop) return;
  const dr = desktop.getBoundingClientRect();

  if (d.kind === 'move') {
    // 3px 스레숄드 + 스냅 해제 로직 (기존과 동일)
    if (d.startX != null && d.startY != null) {
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (dx * dx + dy * dy < 9) return;
      // 스냅 해제는 setState 필요 (창 상태 변경) — 이 한 번만 허용
      const win = windows.find(w => w.id === d.id);
      if (win && (win.snapZone || win.maximized)) {
        handleSnapRestore(d.id, e, win.preSnapW, win.preSnapH);
        return;
      }
      dragRef.current = { ...d, startX: undefined, startY: undefined };
    }

    // 좌표 계산 (기존과 동일한 수식)
    let x = (e.clientX - dr.left - d.offsetX) / dr.width;
    let y = (e.clientY - dr.top - d.offsetY) / dr.height;
    x = Math.max(-0.2, Math.min(x, 1 - 80 / dr.width));
    y = Math.max(0, Math.min(y, 1 - 40 / dr.height));

    // ref에 저장 (setState 아님)
    dragRef.current = { ...d, currentX: x, currentY: y };

    // DOM 직접 갱신
    const el = document.getElementById(`win-${d.id}`);
    if (el) {
      el.style.left = `${x * 100}%`;
      el.style.top = `${y * 100}%`;
    }

    // 스냅 프리뷰도 DOM 직접 갱신
    const snap = detectSnap(e.clientX, e.clientY, dr);
    updateSnapPreviewDOM(snap); // 별도 헬퍼 (아래 명세)

  } else {
    // 리사이즈
    const dx = (e.clientX - d.startX) / dr.width;
    const dy = (e.clientY - d.startY) / dr.height;
    const minW = MIN_W_PX / dr.width;
    const minH = MIN_H_PX / dr.height;

    let newX = d.startWX, newY = d.startWY;
    let newW = d.startW, newH = d.startH;

    if (d.edge.includes('e')) newW = Math.max(minW, d.startW + dx);
    if (d.edge.includes('s')) newH = Math.max(minH, d.startH + dy);
    if (d.edge.includes('w')) {
      newW = Math.max(minW, d.startW - dx);
      newX = d.startWX + (d.startW - newW);
    }
    if (d.edge.includes('n')) {
      newH = Math.max(minH, d.startH - dy);
      newY = d.startWY + (d.startH - newH);
    }

    // ref에 저장
    dragRef.current = { ...d, currentX: newX, currentY: newY, currentW: newW, currentH: newH };

    // DOM 직접 갱신
    const el = document.getElementById(`win-${d.id}`);
    if (el) {
      el.style.left = `${newX * 100}%`;
      el.style.top = `${newY * 100}%`;
      el.style.width = `${newW * 100}%`;
      el.style.height = `${newH * 100}%`;
    }
  }
}, [iconDragInfo, windows, handleSnapRestore]);
// Note: windows 의존성은 스냅 해제 시에만 필요 (find). 이후 최적화 가능.
```

### 3단계: handlePointerUp 수정

```typescript
const handlePointerUp = useCallback((e: React.PointerEvent) => {
  // 아이콘 드래그 처리 (기존 유지)
  if (iconDragInfo) { /* 기존 코드 그대로 */ }

  const d = dragRef.current;
  if (d) {
    if (d.kind === 'move') {
      const snap = detectSnap(e.clientX, e.clientY, desktopRef.current!.getBoundingClientRect());
      if (snap) {
        // 스냅 적용 — setState
        setWindows(prev => prev.map(w => w.id === d.id ? {
          ...w,
          snapZone: snap,
          maximized: snap === 'fullscreen',
          preSnapX: w.snapZone ? w.preSnapX : (d.originX ?? w.x),
          preSnapY: w.snapZone ? w.preSnapY : (d.originY ?? w.y),
          preSnapW: w.snapZone ? w.preSnapW : (d.originW ?? w.w),
          preSnapH: w.snapZone ? w.preSnapH : (d.originH ?? w.h),
        } : w));
      } else {
        // 스냅 없이 이동 확정 — ref의 최종 좌표를 state에 반영
        const x = d.currentX ?? d.originX;
        const y = d.currentY ?? d.originY;
        if (x !== undefined && y !== undefined) {
          setWindows(prev => prev.map(w => w.id === d.id ? {
            ...w, x, y, maximized: false, snapZone: null,
          } : w));
        }
      }
    } else {
      // 리사이즈 확정
      const { currentX, currentY, currentW, currentH } = d;
      if (currentW !== undefined) {
        setWindows(prev => prev.map(w => w.id === d.id ? {
          ...w,
          x: currentX ?? w.x,
          y: currentY ?? w.y,
          w: currentW ?? w.w,
          h: currentH ?? w.h,
        } : w));
      }
    }

    // 포인터 캡처 해제
    if (rootRef.current && e.pointerId !== undefined && rootRef.current.hasPointerCapture(e.pointerId)) {
      rootRef.current.releasePointerCapture(e.pointerId);
    }

    dragRef.current = null;
    setDragging(null);
    clearSnapPreviewDOM();
  }
}, [iconDragInfo, refreshDesktop, focusWindow]);
```

### 4단계: 스냅 프리뷰 DOM 직접 제어

현재 `snapPreview` state → JSX 조건부 렌더링. 전환 후 고정 div + display 토글.

```typescript
const snapPreviewRef = useRef<HTMLDivElement>(null);

function updateSnapPreviewDOM(zone: SnapZone) {
  const el = snapPreviewRef.current;
  if (!el) return;
  if (!zone) {
    el.style.display = 'none';
    return;
  }
  const rect = SNAP_RECTS[zone];
  el.style.display = 'block';
  el.style.left = rect.left;
  el.style.top = rect.top;
  el.style.width = rect.width;
  el.style.height = rect.height;
}

function clearSnapPreviewDOM() {
  if (snapPreviewRef.current) snapPreviewRef.current.style.display = 'none';
}
```

JSX:
```tsx
{/* 항상 렌더. display로 토글 */}
<div
  ref={snapPreviewRef}
  className="absolute rounded-lg pointer-events-none transition-all duration-150"
  style={{
    display: 'none',
    background: 'rgba(100, 140, 255, 0.15)',
    border: '2px solid rgba(100, 140, 255, 0.4)',
    zIndex: 9998,
  }}
/>
```

### 5단계: DragMode 타입 확장

```typescript
type DragMode =
  | {
      kind: 'move';
      id: string;
      offsetX: number;
      offsetY: number;
      startX?: number;   // 3px 스레숄드용 (undefined면 스레숄드 통과)
      startY?: number;
      originX?: number;  // 드래그 시작 시 원래 위치 (preSnap 저장용)
      originY?: number;
      originW?: number;
      originH?: number;
      currentX?: number; // rAF 루프에서 갱신되는 현재 좌표
      currentY?: number;
    }
  | {
      kind: 'resize';
      id: string;
      edge: string;
      startX: number;    // 마우스 시작 좌표 (px)
      startY: number;
      startW: number;    // 시작 시 창 크기 (ratio)
      startH: number;
      startWX: number;   // 시작 시 창 위치 (ratio)
      startWY: number;
      currentX?: number; // rAF에서 갱신
      currentY?: number;
      currentW?: number;
      currentH?: number;
    };
```

### 6단계: dragging state (최소 정보)

```typescript
// 리렌더를 유발하는 state — 시작/끝에만 변경
const [dragging, setDragging] = useState<{
  kind: 'move' | 'resize';
  id: string;
  edge?: string;
} | null>(null);
```

용도:
- 루트 div `cursor` 속성 (리사이즈 중 커서 유지)
- AppWindow `pointerEvents: 'none'` (드래그 중 iframe 방어)
- AppWindow `dragId` prop

### 7단계: handleTitlePointerDown / handleResizePointerDown 수정

```typescript
const handleTitlePointerDown = useCallback((id: string, e: React.PointerEvent) => {
  focusWindow(id);
  // 더블클릭 감지 (기존 로직 그대로)
  const now = Date.now();
  const last = lastTitleClick.current;
  if (last.id === id && now - last.time < 350) {
    lastTitleClick.current = { id: '', time: 0 };
    suppressDesktopBlur.current = true;
    setTimeout(() => { suppressDesktopBlur.current = false; }, 100);
    toggleMaximize(id);
    return;
  }
  lastTitleClick.current = { id, time: now };

  const winEl = document.getElementById(`win-${id}`);
  if (!winEl) return;
  const rect = winEl.getBoundingClientRect();
  rootRef.current?.setPointerCapture(e.pointerId);

  // windows state에서 원래 위치 읽기 (시작 시 1회만)
  const w = windows.find(win => win.id === id);
  dragRef.current = {
    kind: 'move', id,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
    startX: e.clientX,
    startY: e.clientY,
    originX: w?.x, originY: w?.y,
    originW: w?.w, originH: w?.h,
  };
  setDragging({ kind: 'move', id });
}, [focusWindow, toggleMaximize, windows]);

const handleResizePointerDown = useCallback((id: string, edge: string, e: React.PointerEvent) => {
  e.stopPropagation();
  focusWindow(id);
  rootRef.current?.setPointerCapture(e.pointerId);

  const w = windows.find(win => win.id === id);
  if (!w) return;
  dragRef.current = {
    kind: 'resize', id, edge,
    startX: e.clientX, startY: e.clientY,
    startW: w.w, startH: w.h,
    startWX: w.x, startWY: w.y,
  };
  setDragging({ kind: 'resize', id, edge });
}, [focusWindow, windows]);
```

## 변경 대상 파일

| 파일 | 변경 내용 |
|------|----------|
| `app/page.tsx` | 드래그/리사이즈 로직 전체, 스냅 프리뷰, DragMode 타입 |

다른 파일(FileExplorer, Notepad 등)은 변경 없음. AppWindow props 인터페이스도 `dragging` boolean은 유지되므로 호환.

## 보존해야 할 동작 (회귀 테스트 체크리스트)

- [ ] 창 드래그 이동 (자유 위치)
- [ ] 3px 스레숄드 (미세 클릭 시 이동 안 함)
- [ ] 스냅 도킹 (좌/우/4코너/전체화면)
- [ ] 스냅 프리뷰 오버레이
- [ ] 스냅 해제 (드래그로 원래 크기 복원)
- [ ] 타이틀바 더블클릭 → 전체화면/복원
- [ ] 비전체화면 스냅 더블클릭 → preSnap 위치 복원
- [ ] preSnapX/Y 보존 (드래그 시작 원래 위치)
- [ ] 8방향 리사이즈
- [ ] 리사이즈 최소 크기 (320x200)
- [ ] 리사이즈 중 커서 유지 (루트 div cursor)
- [ ] 드래그 중 iframe pointerEvents: none
- [ ] 드래그 중 다른 창 클릭 불가 (pointerCapture)
- [ ] 포커스 관리 (드래그 대상 zIndex 최상위)
- [ ] suppressDesktopBlur (최대화 토글 후 포커스 유지)
- [ ] 아이콘 크로스 드래그 (기존 유지, 이번 전환 범위 밖)

## 작업 순서

- [x] 1. DragMode 타입 확장 (currentX/Y/W/H 추가)
- [x] 2. dragRef + dragging state 도입
- [x] 3. handleTitlePointerDown / handleResizePointerDown 수정
- [x] 4. handlePointerMove 재작성 (DOM 직접 갱신)
- [x] 5. 스냅 프리뷰 ref 전환
- [x] 6. handlePointerUp 수정 (ref → state 확정)
- [x] 7. snapPreview state 제거, drag state를 dragging으로 교체
- [x] 8. AppWindow props에서 dragId를 dragging 기반으로 전환
- [x] 9. 루트 div cursor를 dragging 기반으로 전환
- [x] 10. 회귀 테스트 (사용자 확인 완료)

## 리스크

- **스냅 해제(handleSnapRestore)**: 드래그 중 유일하게 setState가 필요한 지점. 스냅 해제 시 창의 snapZone/maximized/w/h가 바뀌어야 하므로 state 갱신이 불가피. 이 1회 setState는 허용.
- **windows.find()**: handleTitlePointerDown에서 시작 시 원래 위치를 읽기 위해 windows를 참조. useCallback deps에 windows가 남지만, 이 함수는 드래그 시작 시 1회만 호출되므로 성능 영향 없음.
- **DOM 직접 조작과 React state 불일치**: 드래그 중 DOM의 style과 React state의 x/y/w/h가 다름. pointerUp에서 확정하기 전까지 다른 코드가 windows state를 읽으면 이전 값을 봄. 드래그 중에 windows state를 읽는 코드가 없는지 확인 필요.
  - 확인 결과: 드래그 중 windows를 읽는 곳은 handlePointerMove의 스냅 해제 부분(`windows.find`)뿐. 이 시점에서는 아직 DOM이 갱신되기 전이므로 문제 없음.
- **transition 충돌**: 스냅 프리뷰에 `transition-all duration-150`이 있음. DOM 직접 조작 시에도 CSS transition이 적용되어 부드럽게 움직임. 문제 없음.

## 예상 효과

| 지표 | 전환 전 | 전환 후 |
|------|---------|---------|
| 드래그 중 React 리렌더 | 매 pointermove (~60/s) | 0회 (pointerup 시 1회) |
| windows 배열 복사 | 매 pointermove | pointerup 시 1회 |
| VDOM diff | 매 pointermove | pointerup 시 1회 |
| DOM 갱신 지연 | 1~2프레임 | 0프레임 (동기) |
| 체감 | 빠르게 움직이면 창이 커서를 뒤쫓음 | 커서와 창이 동시 이동 |
