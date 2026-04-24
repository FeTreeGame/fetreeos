# Architecture

## 개요

웹 기반 가상 OS 데스크톱 환경. Next.js 16 위에서 단일 페이지(`app/page.tsx`)로 동작.
기존 프로젝트들을 "앱"으로 통합하는 쉘 역할.

## 레이어 구조

```
┌─────────────────────────────────┐
│  Root Layout (layout.tsx)       │  HTML/body, 폰트, globals.css
├─────────────────────────────────┤
│  Home (page.tsx)                │  전체 OS 쉘
│  ├─ Desktop                     │  flex-1, 바탕화면 영역
│  │  ├─ Desktop Icons            │  inset-0 flex-wrap, 퍼센트 패딩
│  │  ├─ Snap Preview             │  드래그 중 스냅 힌트 (% 기반)
│  │  └─ Windows[]                │  자유 배치(비율) 또는 스냅(% CSS)
│  ├─ Taskbar                     │  h-10 고정, Start + 창 버튼 + 시계
│  └─ Start Menu                  │  absolute, z-9999
└─────────────────────────────────┘
```

## 좌표계

- **자유 배치 창**: x, y, w, h 모두 0~1 비율. 렌더링 시 `${v * 100}%`로 변환.
- **스냅 창**: `snapZone` 필드에 존 이름 저장, `SNAP_RECTS`의 CSS % 값 직접 적용.
- **아이콘**: 컨테이너가 `inset-0`으로 바탕화면 전체 차지, `flex-wrap`으로 넘침 시 다음 열.
- **최소 크기**: `minWidth`/`minHeight` px 하한으로 과소 방어.

## 앱 시스템

```typescript
interface AppDef {
  id: string;
  title: string;
  icon: string;
  type: 'browser' | 'notepad' | 'empty';
  defaultW?: number;   // px 기본 크기 (열릴 때 비율로 변환)
  defaultH?: number;
}
```

- `browser`: 주소창 + 게임 목록/상세 + iframe 임베드
- `notepad`: 메뉴바 + 편집 가능 textarea
- `empty`: 플레이스홀더 (미구현 앱)

## 윈도우 관리

- **z-index**: 전역 카운터(`zCounter++`)로 스택 순서 관리
- **포커스**: `focusedId` 상태로 활성 창 추적. 바탕화면 클릭 시 null → 모든 타이틀바 비활성
- **드래그**: 타이틀바 pointerdown → pointermove(비율 연산) → pointerup
- **리사이즈**: 8방향 엣지/코너 핸들, 비율 연산, 최소 크기 clamp
- **스냅**: Elara 패턴 — 커서 위치를 % 변환 → SNAP_ZONES 매칭 → 프리뷰 → 확정
- **최대화**: snapZone='fullscreen'과 동일 처리

## 레퍼런스

- `_ref/ProzillaOS/` — 윈도우 매니저 패턴, 바운딩, z-index 그룹
- `_ref/daedalOS/` — 캐스케이드 배치, 화면 밖 clamp, 트랜지션
- `_ref/elara/` — 스냅 도킹 존/영역, 프리뷰 오버레이
