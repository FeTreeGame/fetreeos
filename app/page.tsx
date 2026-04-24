'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface AppDef {
  id: string;
  title: string;
  icon: string;
  type: 'browser' | 'notepad' | 'empty';
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

const GAMES_DATA: Record<string, { title: string; embedUrl: string }> = {
  'dog-ninja': { title: 'Dog Ninja', embedUrl: 'https://www.youtube.com/embed/iofYDsA2yqg' },
  'demo-platformer': { title: 'Demo Platformer', embedUrl: 'https://www.youtube.com/embed/yQxwbZsL14Y' },
  'puzzle-box': { title: 'Puzzle Box', embedUrl: 'https://www.youtube.com/embed/VoiaFMeS4Ok' },
  'arcade-rush': { title: 'Arcade Rush', embedUrl: 'https://www.youtube.com/embed/wTXJ2SgIymo' },
  'tiny-rpg': { title: 'Tiny RPG', embedUrl: 'https://www.youtube.com/embed/t0Rxxk3fpOo' },
  'grid-tactics': { title: 'Grid Tactics', embedUrl: 'https://www.youtube.com/embed/_vUD2SZVX0A' },
};

const APPS: AppDef[] = [
  { id: 'browser', title: 'Internet', icon: '🌐', type: 'browser' },
  { id: 'notepad', title: 'Notes', icon: '📝', type: 'notepad', text: SPEC_TEXT },
  { id: 'craft', title: 'Craft 3D', icon: '🔧', type: 'empty' },
  { id: 'viewer', title: 'GLB Viewer', icon: '📦', type: 'empty' },
  { id: 'music', title: 'Music', icon: '🎵', type: 'empty' },
  { id: 'settings', title: 'Settings', icon: '⚙', type: 'empty' },
];

interface WindowState {
  id: string;
  app: AppDef;
  x: number;
  y: number;
  w: number;
  h: number;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
  browserUrl?: string;
}

const MIN_W = 320;
const MIN_H = 200;
const TASKBAR_H = 40;
const SNAP_EDGE_PX = 16;

type SnapZone = 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'fullscreen' | null;

const SNAP_ZONES: { test: (px: number, py: number) => boolean; zone: NonNullable<SnapZone> }[] = [
  { zone: 'top-left',     test: (px, py) => px <= SNAP_EDGE_PX && py <= SNAP_EDGE_PX },
  { zone: 'top-right',    test: (px, py) => px >= 100 - SNAP_EDGE_PX && py <= SNAP_EDGE_PX },
  { zone: 'bottom-left',  test: (px, py) => px <= SNAP_EDGE_PX && py >= 100 - SNAP_EDGE_PX },
  { zone: 'bottom-right', test: (px, py) => px >= 100 - SNAP_EDGE_PX && py >= 100 - SNAP_EDGE_PX },
  { zone: 'fullscreen',   test: (_px, py) => py <= 5 },
  { zone: 'left',         test: (px) => px <= 3 },
  { zone: 'right',        test: (px) => px >= 97 },
];

const SNAP_RECTS: Record<NonNullable<SnapZone>, { left: string; top: string; width: string; height: string }> = {
  'fullscreen':   { left: '0',   top: '0',   width: '100%', height: '100%' },
  'left':         { left: '0',   top: '0',   width: '50%',  height: '100%' },
  'right':        { left: '50%', top: '0',   width: '50%',  height: '100%' },
  'top-left':     { left: '0',   top: '0',   width: '50%',  height: '50%' },
  'top-right':    { left: '50%', top: '0',   width: '50%',  height: '50%' },
  'bottom-left':  { left: '0',   top: '50%', width: '50%',  height: '50%' },
  'bottom-right': { left: '50%', top: '50%', width: '50%',  height: '50%' },
};

function detectSnap(cursorX: number, cursorY: number, container: DOMRect): SnapZone {
  const px = ((cursorX - container.left) / container.width) * 100;
  const py = ((cursorY - container.top) / container.height) * 100;
  for (const { test, zone } of SNAP_ZONES) {
    if (test(px, py)) return zone;
  }
  return null;
}

let zCounter = 1;

function BrowserContent({ win, onNavigate }: { win: WindowState; onNavigate: (id: string, url: string) => void }) {
  const [addressBar, setAddressBar] = useState(win.browserUrl || '');
  const currentSlug = win.browserUrl?.replace('/games/', '') || '';
  const game = GAMES_DATA[currentSlug];

  const navigate = (url: string) => {
    setAddressBar(url);
    onNavigate(win.id, url);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 bg-zinc-800 border-b border-zinc-700">
        <button
          onClick={() => navigate('')}
          className="w-6 h-6 rounded text-xs text-zinc-400 hover:bg-zinc-700 flex items-center justify-center"
        >⌂</button>
        <div className="flex-1 flex">
          <input
            value={addressBar}
            onChange={(e) => setAddressBar(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate(addressBar); }}
            className="flex-1 h-6 px-2 text-xs bg-zinc-900 border border-zinc-600 rounded-l text-white outline-none"
            placeholder="Enter address..."
          />
          <button
            onClick={() => navigate(addressBar)}
            className="h-6 px-2 bg-zinc-700 border border-l-0 border-zinc-600 rounded-r text-xs text-zinc-300 hover:bg-zinc-600"
          >Go</button>
        </div>
      </div>
      {/* Page */}
      <div className="flex-1 overflow-auto">
        {game ? (
          <div className="p-4">
            <h1 className="text-lg font-bold mb-3">{game.title}</h1>
            <div className="aspect-video bg-black rounded overflow-hidden mb-3">
              <iframe src={game.embedUrl} className="w-full h-full" allowFullScreen />
            </div>
            <button onClick={() => navigate('')} className="text-xs text-blue-400 hover:underline">← Back to list</button>
          </div>
        ) : (
          <div className="p-4">
            <h2 className="text-sm font-bold text-zinc-300 mb-3">Games</h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(GAMES_DATA).map(([slug, g]) => (
                <button
                  key={slug}
                  onClick={() => navigate(`/games/${slug}`)}
                  className="flex items-center gap-2 p-2 rounded hover:bg-zinc-800 text-left transition-colors"
                >
                  <span className="text-lg">🎮</span>
                  <span className="text-xs text-zinc-300">{g.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NotepadContent({ text }: { text: string }) {
  const [content, setContent] = useState(text);
  return (
    <div className="flex flex-col h-full">
      {/* Menu bar */}
      <div className="flex items-center gap-3 px-3 py-1 bg-zinc-800 border-b border-zinc-700 text-xs text-zinc-400">
        <span className="hover:text-white cursor-default">File</span>
        <span className="hover:text-white cursor-default">Edit</span>
        <span className="hover:text-white cursor-default">Format</span>
        <span className="hover:text-white cursor-default">Help</span>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 bg-zinc-950 text-zinc-300 text-xs p-3 outline-none resize-none font-mono leading-relaxed"
        spellCheck={false}
      />
    </div>
  );
}

type DragMode =
  | { kind: 'move'; id: string; offsetX: number; offsetY: number }
  | { kind: 'resize'; id: string; edge: string; startX: number; startY: number; startW: number; startH: number; startWX: number; startWY: number };

export default function Home() {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [drag, setDrag] = useState<DragMode | null>(null);
  const [snapPreview, setSnapPreview] = useState<SnapZone>(null);
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const desktopRef = useRef<HTMLDivElement>(null);

  const topZIndex = useCallback(() => {
    return ++zCounter;
  }, []);

  const openApp = useCallback((app: AppDef) => {
    setStartMenuOpen(false);
    setWindows(prev => {
      const existing = prev.find(w => w.app.id === app.id);
      if (existing) {
        return prev.map(w => w.id === existing.id ? { ...w, minimized: false, zIndex: topZIndex() } : w);
      }
      return [...prev, {
        id: `${app.id}-${Date.now()}`,
        app,
        x: 80 + prev.length * 30,
        y: 60 + prev.length * 30,
        w: app.type === 'notepad' ? 520 : 640,
        h: app.type === 'notepad' ? 480 : 420,
        minimized: false,
        maximized: false,
        zIndex: topZIndex(),
        browserUrl: '',
      }];
    });
  }, [topZIndex]);

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, minimized: true } : w));
  }, []);

  const focusWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: topZIndex(), minimized: false } : w));
  }, [topZIndex]);

  const toggleMaximize = useCallback((id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, maximized: !w.maximized, zIndex: topZIndex() } : w));
  }, [topZIndex]);

  const navigateBrowser = useCallback((id: string, url: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, browserUrl: url } : w));
  }, []);

  const handleTitlePointerDown = useCallback((id: string, e: React.PointerEvent) => {
    focusWindow(id);
    const win = document.getElementById(`win-${id}`);
    if (!win) return;
    const rect = win.getBoundingClientRect();
    setDrag({ kind: 'move', id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top });
  }, [focusWindow]);

  const handleResizePointerDown = useCallback((id: string, edge: string, e: React.PointerEvent) => {
    e.stopPropagation();
    focusWindow(id);
    setWindows(prev => {
      const w = prev.find(win => win.id === id);
      if (!w) return prev;
      setDrag({ kind: 'resize', id, edge, startX: e.clientX, startY: e.clientY, startW: w.w, startH: w.h, startWX: w.x, startWY: w.y });
      return prev;
    });
  }, [focusWindow]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag) return;
    const desktop = desktopRef.current;
    if (!desktop) return;
    const dr = desktop.getBoundingClientRect();

    if (drag.kind === 'move') {
      let x = e.clientX - dr.left - drag.offsetX;
      let y = e.clientY - dr.top - drag.offsetY;
      x = Math.max(-200, Math.min(x, dr.width - 80));
      y = Math.max(0, Math.min(y, dr.height - 40));
      setWindows(prev => prev.map(w => w.id === drag.id ? { ...w, x, y, maximized: false } : w));
      setSnapPreview(detectSnap(e.clientX, e.clientY, dr));
    } else {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      setWindows(prev => prev.map(w => {
        if (w.id !== drag.id) return w;
        const next = { ...w };
        if (drag.edge.includes('e')) next.w = Math.max(MIN_W, drag.startW + dx);
        if (drag.edge.includes('s')) next.h = Math.max(MIN_H, drag.startH + dy);
        if (drag.edge.includes('w')) {
          const newW = Math.max(MIN_W, drag.startW - dx);
          next.x = drag.startWX + (drag.startW - newW);
          next.w = newW;
        }
        if (drag.edge.includes('n')) {
          const newH = Math.max(MIN_H, drag.startH - dy);
          next.y = drag.startWY + (drag.startH - newH);
          next.h = newH;
        }
        return next;
      }));
    }
  }, [drag]);

  const handlePointerUp = useCallback(() => {
    if (drag?.kind === 'move' && snapPreview) {
      const desktop = desktopRef.current;
      if (desktop) {
        const dr = desktop.getBoundingClientRect();
        const rect = SNAP_RECTS[snapPreview];
        const toNum = (v: string, total: number) => v.endsWith('%') ? total * parseFloat(v) / 100 : parseFloat(v);
        setWindows(prev => prev.map(w => w.id === drag.id ? {
          ...w,
          x: toNum(rect.left, dr.width),
          y: toNum(rect.top, dr.height),
          w: toNum(rect.width, dr.width),
          h: toNum(rect.height, dr.height),
          maximized: snapPreview === 'fullscreen',
        } : w));
      }
    }
    setDrag(null);
    setSnapPreview(null);
  }, [drag, snapPreview]);

  const [timeStr, setTimeStr] = useState('');
  useEffect(() => {
    const update = () => setTimeStr(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }));
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Desktop */}
      <div
        ref={desktopRef}
        className="flex-1 relative"
        style={{ background: 'linear-gradient(135deg, #1a3a4a 0%, #0d1f2d 50%, #1a2a3a 100%)' }}
        onClick={() => setStartMenuOpen(false)}
      >
        {/* Snap Preview */}
        {snapPreview && drag?.kind === 'move' && (
          <div
            className="absolute rounded-lg pointer-events-none transition-all duration-150"
            style={{
              ...SNAP_RECTS[snapPreview],
              background: 'rgba(100, 140, 255, 0.15)',
              border: '2px solid rgba(100, 140, 255, 0.4)',
              zIndex: 9998,
            }}
          />
        )}

        {/* Desktop Icons */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {APPS.map(app => (
            <button
              key={app.id}
              onDoubleClick={() => openApp(app)}
              className="flex flex-col items-center w-20 p-2 rounded hover:bg-white/10 transition-colors"
            >
              <span className="text-3xl">{app.icon}</span>
              <span className="text-[11px] text-white mt-1 text-center leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {app.title}
              </span>
            </button>
          ))}
        </div>

        {/* Windows */}
        {windows.map(win => {
          if (win.minimized) return null;
          const isTop = win.zIndex === zCounter;
          const isMax = win.maximized;
          return (
            <div
              key={win.id}
              id={`win-${win.id}`}
              className="absolute flex flex-col shadow-2xl"
              style={{
                left: isMax ? 0 : win.x,
                top: isMax ? 0 : win.y,
                width: isMax ? '100%' : win.w,
                height: isMax ? '100%' : win.h,
                zIndex: win.zIndex,
                border: isMax ? 'none' : '1px solid rgba(255,255,255,0.15)',
                borderRadius: isMax ? 0 : 8,
                overflow: 'hidden',
              }}
              onPointerDown={() => focusWindow(win.id)}
            >
              {/* Title Bar */}
              <div
                className="h-8 flex items-center px-3 gap-2 shrink-0"
                style={{
                  background: isTop
                    ? 'linear-gradient(180deg, #4a4a65 0%, #35354a 100%)'
                    : 'linear-gradient(180deg, #2e2e3a 0%, #22222e 100%)',
                  cursor: isMax ? 'default' : 'move',
                }}
                onPointerDown={(e) => { if (!isMax) handleTitlePointerDown(win.id, e); }}
                onDoubleClick={() => toggleMaximize(win.id)}
              >
                <span className="text-sm">{win.app.icon}</span>
                <span className={`text-xs flex-1 ${isTop ? 'text-white/90' : 'text-white/40'}`}>{win.app.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); minimizeWindow(win.id); }}
                  className="w-5 h-5 flex items-center justify-center rounded text-white/60 hover:bg-white/20 text-xs"
                >─</button>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleMaximize(win.id); }}
                  className="w-5 h-5 flex items-center justify-center rounded text-white/60 hover:bg-white/20 text-xs"
                >{isMax ? '❐' : '□'}</button>
                <button
                  onClick={(e) => { e.stopPropagation(); closeWindow(win.id); }}
                  className="w-5 h-5 flex items-center justify-center rounded text-white/60 hover:bg-red-500/80 hover:text-white text-xs"
                >✕</button>
              </div>
              {/* Content */}
              <div className="flex-1 overflow-hidden">
                {win.app.type === 'browser' && (
                  <BrowserContent win={win} onNavigate={navigateBrowser} />
                )}
                {win.app.type === 'notepad' && (
                  <NotepadContent text={win.app.text || ''} />
                )}
                {win.app.type === 'empty' && (
                  <div className="h-full bg-zinc-900 flex items-center justify-center">
                    <span className="text-zinc-500 text-sm">{win.app.title}</span>
                  </div>
                )}
              </div>
              {/* Resize handles */}
              {!isMax && <>
                <div className="absolute top-0 left-0 right-0 h-1 cursor-n-resize" onPointerDown={(e) => handleResizePointerDown(win.id, 'n', e)} />
                <div className="absolute bottom-0 left-0 right-0 h-1 cursor-s-resize" onPointerDown={(e) => handleResizePointerDown(win.id, 's', e)} />
                <div className="absolute top-0 left-0 bottom-0 w-1 cursor-w-resize" onPointerDown={(e) => handleResizePointerDown(win.id, 'w', e)} />
                <div className="absolute top-0 right-0 bottom-0 w-1 cursor-e-resize" onPointerDown={(e) => handleResizePointerDown(win.id, 'e', e)} />
                <div className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize" onPointerDown={(e) => handleResizePointerDown(win.id, 'nw', e)} />
                <div className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize" onPointerDown={(e) => handleResizePointerDown(win.id, 'ne', e)} />
                <div className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize" onPointerDown={(e) => handleResizePointerDown(win.id, 'sw', e)} />
                <div className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize" onPointerDown={(e) => handleResizePointerDown(win.id, 'se', e)} />
              </>}
            </div>
          );
        })}
      </div>

      {/* Taskbar */}
      <div
        className="h-10 flex items-center px-2 gap-1 shrink-0"
        style={{ background: 'linear-gradient(180deg, #2a2a3a 0%, #1a1a2a 100%)', borderTop: '1px solid rgba(255,255,255,0.1)' }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setStartMenuOpen(v => !v); }}
          className="h-7 px-3 rounded flex items-center gap-1.5 text-xs text-white/90 hover:bg-white/10 transition-colors"
          style={{ background: startMenuOpen ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)' }}
        >
          <span className="text-sm">◆</span>
          <span className="font-bold">Start</span>
        </button>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <div className="flex-1 flex gap-1 overflow-hidden">
          {windows.map(win => {
            const isTop = win.zIndex === zCounter;
            return (
              <button
                key={win.id}
                onClick={() => !win.minimized && isTop ? minimizeWindow(win.id) : focusWindow(win.id)}
                className={`h-7 px-3 rounded flex items-center gap-1.5 text-xs transition-colors max-w-[160px] ${isTop && !win.minimized ? 'text-white/90' : 'text-white/50'}`}
                style={{
                  background: isTop && !win.minimized ? 'rgba(255,255,255,0.15)' : win.minimized ? 'transparent' : 'rgba(255,255,255,0.06)',
                  borderBottom: isTop && !win.minimized ? '2px solid rgba(120,140,255,0.6)' : '2px solid transparent',
                }}
              >
                <span className="text-sm">{win.app.icon}</span>
                <span className="truncate">{win.app.title}</span>
              </button>
            );
          })}
        </div>
        <div className="text-xs text-white/50 px-2">{timeStr}</div>
      </div>

      {/* Start Menu */}
      {startMenuOpen && (
        <div
          className="absolute bottom-10 left-2 w-56 rounded-lg overflow-hidden shadow-2xl"
          style={{ background: 'linear-gradient(180deg, #2e2e40 0%, #1e1e30 100%)', border: '1px solid rgba(255,255,255,0.12)', zIndex: 9999 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-2 border-b border-white/10">
            <span className="text-xs text-white/40 px-2">Applications</span>
          </div>
          <div className="p-1">
            {APPS.map(app => (
              <button
                key={app.id}
                onClick={() => openApp(app)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-white/10 transition-colors"
              >
                <span className="text-lg">{app.icon}</span>
                <span className="text-sm text-white/80">{app.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
