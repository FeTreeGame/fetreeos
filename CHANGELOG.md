# Changelog

All notable changes to this project will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/), versioned per [SemVer](https://semver.org/).

## [Unreleased]

### Added
- 드래그→휴지통 삭제 차단 — 열린 파일을 드래그로 휴지통에 드롭 시 Alert 차단
- 복원 충돌 다이얼로그 — 원본 위치에 동명 파일 존재 시 건너뛰기/덮어쓰기/다른 이름 선택
- 모달 다이얼로그 — Dialog에 modal prop 추가, 충돌 다이얼로그 외부 클릭 차단
- 휴지통 빈 메시지 — '빈 폴더입니다' 대신 '휴지통이 비어 있습니다' 표시
- 휴지통 속성 다이얼로그 — 더블클릭 시 종류/원본/삭제날짜/만든날짜 표시 + 복원 버튼
- 삭제 메타데이터 — FSNode에 deletedFrom/deletedAt 필드, moveNodes에서 trash 이동 시 기록
- 삭제 시 상위 폴더 복귀 — 삭제된 폴더를 보던 탐색기가 deletedFrom 체인으로 첫 alive 조상 이동
- 복원 시 원래 위치 — 컨텍스트 메뉴/속성 다이얼로그 복원이 deletedFrom 원본 위치 사용
- 열린 파일 삭제 차단 — fileHandler 앱에서 열린 파일 삭제 시 Alert 다이얼로그 표시
- fileHandler 플래그 — AppDef에 파일 편집 앱 명시 (notepad, browser), isFileOpenInApp 판별 기반
- 탐색기 내 자식 폴더 드롭 — 같은 폴더 내 폴더 아이콘 위 드롭 시 이동 + 초록 하이라이트
- 폴더별 정렬 기준 세션 내 유지 — page.tsx에 Map<folderId, SortKey> ref, 폴더 이동 시 복원
- 컨텍스트 메뉴 전역 단일화 — 우클릭 시 다른 인스턴스의 메뉴 자동 닫기, 좌클릭으로도 닫기
- 탐색기 트리뷰 TODO 추가 — 네비게이션 패널, 고정 폴더(음악/사진/동영상), 내 컴퓨터 노드
- Desktop shell (window manager, drag, snap, resize)
- File system (create, delete, move, trash)
- File Explorer (folder navigation, sorting, cross-drag)
- Notepad, Browser, Settings apps
- Context menu (new file/folder, sort, refresh)
- iframe apps (Experience Space, Interactive Plains)
- Coming Soon placeholder for unreleased apps (Craft 3D, GLB Viewer, Music)
- Supabase integration — Interactive Plains DB 연결
- Gallery app — artworks 벡터 렌더링 갤러리 (그리드 + 상세 뷰 + 좌우 네비게이션)
- My Computer app — OS 정보, localStorage 용량 모니터링, 브라우저 정보
- system 노드 타입 — Settings, 휴지통을 시스템 아이콘으로 분류 (정렬 최상위)
- APP_VERSION 환경변수 — package.json version을 빌드 시 주입
- Notepad 테마 전환 — Theme 탭으로 Dark/Light 선택 (기본 Light)
- Alert 다이얼로그 — 연결 앱이 없는 파일 열기 시 경고 표시
- 고유파일 규칙 — uniqueName() 헬퍼, 생성/이동 시 자동 넘버링 (새 메모.txt → 새 메모 (2).txt)
- 이동 충돌 다이얼로그 — 같은 이름 파일 존재 시 건너뛰기/덮어쓰기/다른 이름 선택
- singleInstance 플래그 — 앱별 다중 창 허용 여부 제어 (Settings, MyComputer, 휴지통: 싱글)
- 포커스 승계 — 창 닫기/최소화 시 z-order 최상위 창으로 포커스 자동 이동
- 파일/폴더 다중 창 열기 — 같은 파일/폴더를 여러 창으로 열 수 있도록 변경 (클래식 Windows 동작)

### Changed
- 탐색기 정렬 초기값 — explorerSort 기본 'type'(유형순), 토글 해제 제거 (항상 어떤 기준으로든 정렬)

### Fixed
- 컨텍스트 메뉴 좌클릭 닫기 — data-context-menu 속성으로 메뉴 영역 보호, 네이티브 pointerdown 리스너 적용
- 바탕화면 폴더 드롭 이중 실행 — useDesktopDrag과 page.tsx findDropTarget 경로 충돌. sourceFolder=desktop일 때 findDropTarget 비활성화
- 탐색기 크로스 드래그 고스트 잔류 — 같은 폴더에 드롭 시 소스 탐색기의 iconDrag 미리셋. refreshDesktop()을 항상 호출하여 fsRevision 증가 → 탐색기 내부 상태 리셋
- 탐색기 드래그 후 포커스 해제 — 바탕화면 click 전파로 focusedId 초기화되던 문제. suppressDesktopBlur로 1프레임 억제


- page.tsx 분리 — 805줄 → 342줄. windowTypes.ts, AppWindow.tsx, Dialog.tsx, Taskbar.tsx, useWindowDrag.ts 5개 파일 추출
- 드래그/리사이즈 엔진 — setState 기반에서 ref + DOM 직접 갱신으로 전환 (드래그 중 React 리렌더 0회)
- Notepad 파일 생성 지연 — 열기 시 메모리만 사용, Save 시에만 파일 생성
- Branding: FeTreeGame → FeTreeOS (package.json, layout, meta tags, welcome file)
- OG meta tags added for link sharing
- 정렬 우선순위: system(0) → app(1) → folder(2) → file(3)
- 자동정렬 기본값 ON, 초기 배치에 정렬 기준(유형순) 적용
- 스냅 해제를 드래그 델타 기반으로 변경 (3px threshold, Windows 동작 일치)
- 타이틀바 더블클릭: 비전체화면 스냅 → 스냅 전 위치/크기로 복원
- 스냅/전체화면 복원 시 드래그 전 원래 위치로 복귀 (preSnapX/Y 저장)
- 리사이즈 핸들 히트 영역 확대 — 가장자리 10px(±5 오프셋), 코너 16px, 창 바깥으로 돌출
- 리사이즈 중 커서 고정 — 루트 div에 drag.edge 기반 resize cursor 설정
- 창 overflow 구조 변경 — overflow:hidden을 내부 wrapper div로 이동 (핸들 클리핑 방지)

### Fixed
- hydration 레이스 컨디션 — autoArrange가 localStorage 복원 전에 레이아웃 실행되는 문제
- 자동정렬 초기값 — localStorage 미존재 시 OFF로 설정되던 문제
- 전체 초기화 — autoArrange, desktopSort, notes 키 누락 + state 리로드 추가
- 타이틀바 더블클릭 전체화면/복원 미작동 — setPointerCapture가 dblclick 이벤트 차단
- 전체화면 복원 시 포커스 해제 — 창 축소 후 바탕화면 click 전파로 focusedId 초기화
- 휴지통이 Notepad로 열리는 문제 — trash를 explorer로 열도록 수정
- 미연결 파일 fallback이 Notepad이던 문제 — Alert 다이얼로그로 변경
- 전체 초기화 시 fsCache 미초기화 — 이전 데이터 위에 덮어쓰기되던 문제
- 자동정렬 시 새 파일이 정렬 순서 중간에 삽입되던 문제 — 기존 위치 유지 + 새 아이템 말미 배치 복원 (fb0c122 후퇴 수정), 최초 접속 시에는 정렬 기준 배치
- Gallery DetailView z-index가 리사이즈 핸들을 가리던 문제 — z-10 제거
- 최초 진입 시 아이콘이 정렬 기준을 무시하고 FS 순서로 배치되던 문제 — items 빈 배열 상태에서 TRASH_NODE만으로 layout effect가 선행 실행되어 PRESERVE 분기 진입. items.length === 0 가드 추가
- 메모장 다중 창 저장 시 동명 파일 생성 — createFile 후 uniqueName 적용된 실제 이름으로 title 미동기화. setTitle(node.name) 추가
