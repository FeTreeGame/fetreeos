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

### Changed
- Branding: FeTreeGame → FeTreeOS (package.json, layout, meta tags, welcome file)
- OG meta tags added for link sharing
- 정렬 우선순위: system(0) → app(1) → folder(2) → file(3)
- 자동정렬 기본값 ON, 초기 배치에 정렬 기준(유형순) 적용

### Fixed
- hydration 레이스 컨디션 — autoArrange가 localStorage 복원 전에 레이아웃 실행되는 문제
- 자동정렬 초기값 — localStorage 미존재 시 OFF로 설정되던 문제
- 전체 초기화 — autoArrange, desktopSort, notes 키 누락 + state 리로드 추가
