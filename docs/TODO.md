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
- [x] 아이콘 선택 시각 개선 — hover/선택 시 파랑 오버레이��� 통일
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

- [ ] 폴더 내부 정렬 기능 (바탕화면과 동일한 정렬 옵션)
- [ ] 경로(path) 개념 도입 — 주소 표시줄 경로 탐색, 폴더 계층 표현
- [ ] 탐색기 ↔ 바탕화면 간 드래그 드롭 파일 이동
- [ ] 휴지통 탐색기 — 복원/완전삭제 UI
- [ ] 향후: 브라우저 등 앱 간 드래그 드롭 확장

## 앱 로드맵

- [ ] 미니홈피 (개인 공간 — Supabase 인증 연동)
- [ ] 플래시 게임 사이트 (browser 앱 확장)
- [ ] 구름글귀평원 (YouTube iframe + CSS 오버레이 구름 자막)
- [ ] Supabase + Google OAuth 통합 인증 (OS 쉘 → iframe 앱 세션 전파)

## 인지된 과제

- [ ] 드래그 반응성 개선 — React state→DOM 1프레임 지연이 원인 (정합성은 확인 완료). 드래그 중 래스터화 레이어 전환 등 compositor 수준 접근 필요. daedalOS 참조

## 미착수

- [ ] 캘린더 확장 — 월 이동, 날짜별 공지 메모 (유튜브 채널 랜딩 → OS 진입 맥락)
- [ ] 기존 프로젝트 추가 연동 (craft_3d 등)
- [ ] games/[slug] 라우트 정리 (orphaned)
- [ ] CLAUDE.md 작성
- [ ] 모바일 대응 — 5레이아웃 (PC, iPhone 세로/가로, Android 세로/가로)
