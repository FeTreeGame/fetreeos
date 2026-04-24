export interface AppDef {
  id: string;
  title: string;
  icon: string;
  type: 'browser' | 'notepad' | 'iframe' | 'empty';
  defaultW?: number;
  defaultH?: number;
  url?: string;
  text?: string;
}

const SPEC_TEXT = `# 인터렉티브 평원 — 통합 설계서

> 작성일: 2026-02-23
> 기반: Project Nemo (2025-09) + 인터렉티브 평원 구상 + 나만의 집 꾸미기

## 1. 비전

유저가 그리고, 세계가 살아나고, 채널이 성장하는 참여형 인터렉티브 플랫폼.

시청자가 곧 참여자, 참여자가 곧 콘텐츠 제작자.
개별 작품이 모여 생태계가 되고, 생태계가 세계관이 되며,
세계관이 영상과 게임의 원천이 되는 자급자족 순환 구조.

### 핵심 원칙
- 접근성 최우선 — 설치 없이 웹, 익명, 규칙 최소화
- 단순하게 시작, 점진적 확장 — Nemo의 교훈: 과설계 금지
- 클라이언트/서버 분리 — 비동기 서버, 언제든 교체 가능
- 우열 없는 구조 — 익명성 + 랜덤 부여로 실력 비교 제거
- 유저 기여가 곧 콘텐츠 — 작품, 이펙트, 사운드 모두 유저 생산

## 2. 단계별 로드맵

Phase 1 — 허허벌판 (v1, MVP)
  들어가서 그리고 놓으면 끝.

Phase 2 — 색이 찾아오다 (v2)
  평원에 색이 찾아왔습니다.

Phase 3 — 생태계 (v3)
  랜덤 주제 부여, 개별 작품이 생태계의 일부가 됨.

Phase 4 — 나만의 공간 (v4)
  나만의 집 꾸미기 통합. 평원 위에 개인 공간이 생김.

Phase 5 — 살아있는 세계 (v5)
  평원이 세계관으로 확장. 지역이 열리고, 공동 목표가 생김.

Phase 6 — 수익화 (v6)
  유저가 만든 세계에서 플레이하는 게임.
`;

export const APPS: AppDef[] = [
  // --- 기본 앱 ---
  { id: 'browser', title: 'Internet', icon: '🌐', type: 'browser' },
  { id: 'notepad', title: 'Notes', icon: '📝', type: 'notepad', text: SPEC_TEXT },
  { id: 'settings', title: 'Settings', icon: '⚙', type: 'empty' },

  // --- 콘텐츠 앱 ---
  { id: 'experience-space', title: 'Experience Space', icon: '🌌', type: 'iframe', url: 'https://experience-space.vercel.app' },
  { id: 'interactive-plains', title: 'Interactive Plains', icon: '🏜️', type: 'iframe', url: 'https://interactive-plains.vercel.app' },
  { id: 'craft', title: 'Craft 3D', icon: '🔧', type: 'empty' },
  { id: 'viewer', title: 'GLB Viewer', icon: '📦', type: 'empty' },
  { id: 'music', title: 'Music', icon: '🎵', type: 'empty' },
];
