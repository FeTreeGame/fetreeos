# Decisions

## 비율 기반 좌표계 (2026-04-24)

**결정**: 창의 x/y/w/h를 px 대신 0~1 비율로 저장.

**이유**: px 기반에서는 뷰포트 리사이즈 시 창이 화면 밖으로 벗어남.
"창이 컨테이너를 벗어나는 것 자체가 비정상"이라는 원칙에 따라,
처음부터 비율로 정의하면 문제가 원천적으로 없어짐.
스냅 프리뷰가 이미 % 기반으로 반응형이었고, 같은 원리를 전체 창에 확장.

**트레이드오프**: 뷰포트를 많이 줄이면 창 내용물이 같이 줄어듦.
`minWidth`/`minHeight` px 하한으로 방어.

## 스냅 도킹 패턴 — Elara 차용 (2026-04-24)

**결정**: Elara의 WINDOW_DOCK_ZONES + WINDOW_SNAP_AREAS 패턴을 이식.

**이유**: ProzillaOS, daedalOS 모두 스냅/분할 기능 미구현.
Elara가 순수 JS + 프레임워크 무관 + 도킹 내장으로 가장 적합.
존(감지 영역)과 영역(결과 위치/크기)을 분리한 구조가 깔끔.

## 단일 파일 구조 유지 (2026-04-24)

**결정**: 전체 OS 쉘을 `app/page.tsx` 단일 파일로 유지.

**이유**: 현재 규모(~540행)에서 분리하면 오히려 파악이 어려움.
컴포넌트 수가 늘거나 상태 관리가 복잡해지는 시점에 분리 예정.

## 앱 기본 크기 통일 (2026-04-24)

**결정**: 모든 앱을 640x420 기본값으로 통일, AppDef에 defaultW/defaultH로 커스텀 가능.

**이유**: 앱 2종류(notepad vs 나머지)로만 분기하던 것을 일관성 있게 정리.
추후 앱별 커스텀이 필요하면 AppDef에 값만 추가하면 됨.

## 데스크톱 컨테이너 = 반응형 바운드 (2026-04-24)

**결정**: desktopRef를 모든 반응형 요소의 바운딩 컨테이너로 사용.

**이유**: 별도 컨테이너를 만들 필요 없이 기존 구조를 격상.
`overflow-hidden`으로 태스크바 침범 방지, 아이콘은 `inset-0 flex-wrap`으로 바운딩.
원칙: "고정 위치 요소는 %, 사용자 배치 요소는 비율 + clamp".

## 앱 정의 분리 + iframe 타입 (2026-04-24)

**결정**: AppDef와 APPS 배열을 `app/apps.ts`로 분리. `iframe` 타입을 추가하여 배포된 외부 프로젝트를 임베드.

**이유**: 콘텐츠 앱(Experience Space, Interactive Plains 등)은 OS 기본 요소가 아니라 콘텐츠.
기본 앱과 콘텐츠 앱의 관심사를 분리하고, 앱 추가 시 apps.ts만 수정하면 되도록 구조화.
iframe은 배포된 앱을 별도 프로세스처럼 격리 실행하는 가장 단순한 방법.

**트레이드오프**: iframe 대상 앱이 X-Frame-Options로 임베딩을 거부할 수 있음.
본인 프로젝트는 해당 헤더를 제거하여 해결. 추후 인증 도입 시 CSP frame-ancestors로 제한 예정.

## 크로스 드래그 고스트 렌더링 분할 (2026-04-25)

**결정**: 바탕화면 출발 드래그는 FileExplorer가 자체 고스트 렌더링, 탐색기 출발 드래그는 page.tsx가 렌더링.

**이유**: 바탕화면 드래그는 그리드 좌표 기반 오프셋으로 고스트를 계산하므로 FileExplorer 내부에서 처리하는 게 자연스러움.
탐색기→바탕화면 크로스 드래그는 발신 윈도우에 `pointerEvents: 'none'`이 걸리므로 page.tsx가 중재해야 함.
`crossDragging` prop(`sourceFolder !== 'desktop'`)으로 이중 렌더링 방지.

## 드래그 훅 분리 (2026-04-26)

**결정**: FileExplorer의 드래그 로직을 `useDesktopDrag`(바탕화면)과 `useExplorerDrag`(탐색기) 두 훅으로 분리.

**이유**: FileExplorer.tsx가 950행까지 성장하면서 바탕화면/탐색기 드래그 코드가 모드 분기로 뒤섞임.
두 모드의 드래그는 좌표계부터 다름 (그리드 vs DOM rect). 훅으로 분리하면 각 모드의 드래그 로직을 독립적으로 수정 가능.
`clearDragState`와 `getDragIds`는 useDesktopDrag에서 생성, useExplorerDrag에 주입하여 공유.

## 공유 타입/comparator 통합 (2026-04-26)

**결정**: `IconDragInfo`, `IconDragState`, `SelBoxState` 등 공유 타입과 `SORT_COMPARATORS`를 `constants.ts`로 통합.

**이유**: 동일 타입이 FileExplorer, useDesktopDrag, useExplorerDrag에 각각 정의되어 있었음.
`SORT_COMPARATORS`는 바탕화면 autoArrange, 수동 정렬, 탐색기 정렬 3곳에서 동일 로직이 반복.
모듈 스코프로 올리면 렌더마다 객체 재생성도 제거됨.

## 명시적 새로고침 모델 — useEffect에서 sort 분리 (2026-04-26)

**결정**: useEffect(items 변경)에서 sort를 완전히 제거. 정렬은 5가지 명시적 트리거에서만 수행.

**이유**: 이전에는 autoArrange ON + items 변경 시 useEffect가 매번 full re-sort를 실행했음.
파일 생성 → refresh → items 변경 → useEffect → re-sort → 새 파일이 정렬 순서 중간에 끼워짐.
반면 드래그 재배치는 items가 안 바뀌어 useEffect가 안 돌아서 우연히 살아남았음.
"새 파일은 항상 끝에, 정렬은 사용자가 명시적으로 요청할 때만" — Windows 동작과 일치.

**트레이드오프**: autoArrange ON이지만 정렬이 깨진 상태가 존재할 수 있음 (파일 생성/삭제 후).
사용자가 "새로고침"이나 정렬 메뉴로 명시적으로 재정렬해야 함. 이것이 Windows의 실제 동작.

## 순환 이동 방지 — 선택적 필터링 (2026-04-25)

**결정**: 폴더를 자기 자신이나 하위로 이동하려 할 때, 해당 아이템만 차단하고 나머지 선택 그룹은 정상 이동.

**이유**: 다중선택 드래그에서 문제 아이템 하나 때문에 전체 이동이 실패하면 UX가 불합리함.
Windows도 동일 동작 — 이동 불가 아이템만 제외, 나머지는 진행.
