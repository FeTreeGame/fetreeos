# Changelog

All notable changes to this project will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/), versioned per [SemVer](https://semver.org/).

## [Unreleased]

### Added
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

### Changed
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
