# Architecture

## 개요

웹 기반 가상 OS 데스크톱 환경. Next.js 16 위에서 단일 페이지(`app/page.tsx`)로 동작.
기존 프로젝트들을 "앱"으로 통합하는 쉘 역할.

## 레이어 구조

```
┌─────────────────────────────────┐
│  Root Layout (layout.tsx)       │  HTML/body, 폰트, globals.css
├─────────────────────────────────┤
│  Home (page.tsx)                │  전체 OS 쉘 (윈도우 매니저)
│  ├─ Desktop                     │  flex-1, 바탕화면 영역
│  │  ├─ FileExplorer(desktop)    │  inset-0, mode='desktop' — 아이콘+휴지통
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

## 앱 시스템

앱 정의는 `app/apps.ts`에 분리. 기본 앱(explorer, browser, notepad)과 콘텐츠 앱(iframe 외부 프로젝트)을 구분.

```typescript
interface AppDef {
  id: string;
  title: string;
  icon: string;
  type: 'browser' | 'notepad' | 'iframe' | 'explorer' | 'empty';
  defaultW?: number;
  defaultH?: number;
  url?: string;
}
```

- `explorer`: 파일 탐색기 — 폴더 탐색, 우클릭 메뉴, 파일/폴더 CRUD
- `browser`: 주소창 + 게임 목록/상세 + iframe 임베드
- `notepad`: 파일 기반 편집기 — FSNode 연동, File > New/Open/Save
- `iframe`: 외부 배포 프로젝트를 전체 크기 iframe으로 임베드 (비활성 시 pointerEvents 차단)
- `empty`: 플레이스홀더 (미구현 앱)

## 컴포넌트 구조

- `FileExplorer.tsx` — **바탕화면 + 파일 탐색기 통합** (Windows explorer.exe 구조)
  - `mode='desktop'`: 툴바/상태바 숨김, 배경 투명, 큰 아이콘, 휴지통 가상 노드 포함
  - `mode='explorer'`: 툴바(뒤로/앞으로/위로/주소), 상태바, 폴더 내부 탐색
  - `refreshKey` prop으로 외부 FS 변경 감지 (Notepad 등에서 파일 생성 시 바탕화면 갱신)
- `Clock.tsx` — 시계 + 캘린더 팝업
- `Notepad.tsx` — ���일 기반 텍스트 편집기
- `ContextMenu.tsx` — 범용 우클릭 메뉴 (화면 경계 바운딩)

`page.tsx`는 윈도우 매니저(드래그/리사이즈/스냅/태스크바)에 집중, 파일 관련 로직은 FileExplorer로 위임.

## 윈도우 관리

- **z-index**: 전역 카운터(`zCounter++`)로 스택 순서 관리
- **포커스**: `focusedId` 상태로 활성 창 추적. 바탕화면 클릭 시 null → 모든 타이틀바 비활성
- **드래그**: 타이틀바 pointerdown → pointermove(비율 연산) → pointerup
- **리사이즈**: 8방향 엣지/코너 핸들, 비율 연산, 최소 크기 clamp
- **스냅**: Elara 패턴 — 커서 위치를 % 변환 → SNAP_ZONES 매칭 → 프리뷰 → 확정
- **최대화**: snapZone='fullscreen'과 동일 처리
- **스냅 해제**: 스냅/최대화 상태에서 타이틀바 드래그 → 이전 크기(preSnapW/H) 복원 + 커서 중심 배치

## 레퍼런스

- `_ref/ProzillaOS/` — 윈도우 매니저 패턴, 바운딩, z-index 그룹
- `_ref/daedalOS/` — 캐스케이드 배치, 화면 밖 clamp, 트랜지션
- `_ref/elara/` — 스냅 도킹 존/영역, 프리뷰 오버레이
