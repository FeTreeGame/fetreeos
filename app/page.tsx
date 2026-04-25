'use client';

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { APPS, type AppDef } from './apps';
import Clock from './Clock';
import Notepad from './Notepad';
import FileExplorer from './FileExplorer';
import type { IconDragInfo } from './constants';
import Settings from './Settings';
import Browser from './Browser';
import { initDefaultFS, getAppForExtension, moveNodes, type FSNode } from './fileSystem';

interface WindowState {
  id: string;
  app: AppDef;
  x: number;
  y: number;
  w: number;
  h: number;
  minimized: boolean;
  maximized: boolean;
  snapZone: SnapZone;
  preSnapW?: number;
  preSnapH?: number;
  zIndex: number;
  browserUrl?: string;
  fileId?: string;
}

const MIN_W_PX = 320;
const MIN_H_PX = 200;
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

type DragMode =
  | { kind: 'move'; id: string; offsetX: number; offsetY: number }
  | { kind: 'resize'; id: string; edge: string; startX: number; startY: number; startW: number; startH: number; startWX: number; startWY: number };

interface AppWindowProps {
  win: WindowState;
  isTop: boolean;
  dragging: boolean;
  fsRevision: number;
  onFocus: (id: string) => void;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onToggleMaximize: (id: string) => void;
  onTitlePointerDown: (id: string, e: React.PointerEvent) => void;
  onResizePointerDown: (id: string, edge: string, e: React.PointerEvent) => void;
  onSnapRestore: (id: string, e: React.PointerEvent, preSnapW?: number, preSnapH?: number) => void;
  onOpenNode: (node: FSNode) => void;
  onFSChange: () => void;
  onNavigateBrowser: (id: string, url: string) => void;
  onIconDragChange: (info: IconDragInfo | null) => void;
}

const AppWindow = memo(function AppWindow({
  win, isTop, dragging, fsRevision,
  onFocus, onClose, onMinimize, onToggleMaximize,
  onTitlePointerDown, onResizePointerDown, onSnapRestore,
  onOpenNode, onFSChange, onNavigateBrowser, onIconDragChange,
}: AppWindowProps) {
  if (win.minimized) return null;
  const isMax = win.maximized;
  const snap = win.snapZone ? SNAP_RECTS[win.snapZone] : null;
  const isSnapped = !!snap;
  return (
    <div
      id={`win-${win.id}`}
      className="absolute flex flex-col shadow-2xl"
      style={isSnapped ? {
        left: snap.left,
        top: snap.top,
        width: snap.width,
        height: snap.height,
        zIndex: win.zIndex,
        border: isMax ? 'none' : '1px solid rgba(255,255,255,0.15)',
        borderRadius: isMax ? 0 : 4,
        overflow: 'hidden',
        pointerEvents: dragging ? 'none' as const : undefined,
      } : {
        left: `${win.x * 100}%`,
        top: `${win.y * 100}%`,
        width: `${win.w * 100}%`,
        height: `${win.h * 100}%`,
        zIndex: win.zIndex,
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 8,
        overflow: 'hidden',
        minWidth: MIN_W_PX,
        minHeight: MIN_H_PX,
        pointerEvents: dragging ? 'none' as const : undefined,
      }}
      onPointerDown={() => onFocus(win.id)}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Title Bar */}
      <div
        className="h-8 flex items-center px-3 gap-2 shrink-0"
        style={{
          background: isTop
            ? 'linear-gradient(180deg, #4a4a65 0%, #35354a 100%)'
            : 'linear-gradient(180deg, #2e2e3a 0%, #22222e 100%)',
          cursor: 'move',
        }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          onFocus(win.id);
          if (isSnapped || isMax) {
            onSnapRestore(win.id, e, win.preSnapW, win.preSnapH);
            return;
          }
          onTitlePointerDown(win.id, e);
        }}
        onDoubleClick={() => onToggleMaximize(win.id)}
      >
        <span className="text-sm">{win.app.icon}</span>
        <span className={`text-xs flex-1 ${isTop ? 'text-white/90' : 'text-white/40'}`}>{win.app.title}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onMinimize(win.id); }}
          className="w-5 h-5 flex items-center justify-center rounded text-white/60 hover:bg-white/20 text-xs"
        >─</button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleMaximize(win.id); }}
          className="w-5 h-5 flex items-center justify-center rounded text-white/60 hover:bg-white/20 text-xs"
        >{isMax ? '❐' : '□'}</button>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(win.id); }}
          className="w-5 h-5 flex items-center justify-center rounded text-white/60 hover:bg-red-500/80 hover:text-white text-xs"
        >✕</button>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-hidden" onPointerDown={() => onFocus(win.id)}>
        {win.app.type === 'browser' && (
          <Browser winId={win.id} browserUrl={win.browserUrl ?? ''} onNavigate={onNavigateBrowser} active={isTop} />
        )}
        {win.app.type === 'notepad' && (
          <Notepad fileId={win.fileId} onFSChange={onFSChange} />
        )}
        {win.app.type === 'explorer' && (
          <FileExplorer initialFolderId={win.fileId ?? 'desktop'} refreshKey={fsRevision} onOpenFile={onOpenNode} onFSChange={onFSChange} onIconDragChange={onIconDragChange} />
        )}
        {win.app.type === 'settings' && (
          <Settings onFSChange={onFSChange} />
        )}
        {win.app.type === 'iframe' && win.app.url && (
          <iframe
            src={win.app.url}
            className="w-full h-full border-0"
            allowFullScreen
            style={{ pointerEvents: isTop ? 'auto' : 'none' }}
          />
        )}
        {win.app.type === 'empty' && (
          <div className="h-full bg-zinc-900 flex items-center justify-center">
            <span className="text-zinc-500 text-sm">{win.app.title}</span>
          </div>
        )}
      </div>
      {/* Resize handles */}
      {!isMax && !isSnapped && <>
        <div className="absolute top-0 left-0 right-0 h-1 cursor-n-resize" onPointerDown={(e) => onResizePointerDown(win.id, 'n', e)} />
        <div className="absolute bottom-0 left-0 right-0 h-1 cursor-s-resize" onPointerDown={(e) => onResizePointerDown(win.id, 's', e)} />
        <div className="absolute top-0 left-0 bottom-0 w-1 cursor-w-resize" onPointerDown={(e) => onResizePointerDown(win.id, 'w', e)} />
        <div className="absolute top-0 right-0 bottom-0 w-1 cursor-e-resize" onPointerDown={(e) => onResizePointerDown(win.id, 'e', e)} />
        <div className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize" onPointerDown={(e) => onResizePointerDown(win.id, 'nw', e)} />
        <div className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize" onPointerDown={(e) => onResizePointerDown(win.id, 'ne', e)} />
        <div className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize" onPointerDown={(e) => onResizePointerDown(win.id, 'sw', e)} />
        <div className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize" onPointerDown={(e) => onResizePointerDown(win.id, 'se', e)} />
      </>}
    </div>
  );
});

export default function Home() {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [drag, setDrag] = useState<DragMode | null>(null);
  const [snapPreview, setSnapPreview] = useState<SnapZone>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const desktopRef = useRef<HTMLDivElement>(null);
  const [iconDragInfo, setIconDragInfo] = useState<IconDragInfo | null>(null);
  const [crossDropTarget, setCrossDropTarget] = useState<string | null>(null);

  const topZIndex = useCallback(() => {
    return ++zCounter;
  }, []);

  const openApp = useCallback((app: AppDef, fileId?: string) => {
    setStartMenuOpen(false);
    const desktop = desktopRef.current;
    const dw = desktop?.clientWidth ?? 800;
    const dh = desktop?.clientHeight ?? 600;
    setWindows(prev => {
      if (!fileId) {
        const existing = prev.find(w => w.app.id === app.id && !w.fileId);
        if (existing) {
          setFocusedId(existing.id);
          return prev.map(w => w.id === existing.id ? { ...w, minimized: false, zIndex: topZIndex() } : w);
        }
      } else {
        const existing = prev.find(w => w.fileId === fileId);
        if (existing) {
          setFocusedId(existing.id);
          return prev.map(w => w.id === existing.id ? { ...w, minimized: false, zIndex: topZIndex() } : w);
        }
      }
      const newId = `${app.id}-${Date.now()}`;
      const baseW = app.defaultW ?? 640;
      const baseH = app.defaultH ?? 420;
      const w = Math.min(baseW, dw - 40) / dw;
      const h = Math.min(baseH, dh - 40) / dh;
      const x = Math.min(80 + prev.length * 30, dw - baseW - 20) / dw;
      const y = Math.min(60 + prev.length * 30, dh - baseH - 20) / dh;
      setFocusedId(newId);
      return [...prev, {
        id: newId,
        app,
        x: Math.max(0, x),
        y: Math.max(0, y),
        w,
        h,
        minimized: false,
        maximized: false,
        snapZone: null,
        zIndex: topZIndex(),
        browserUrl: '',
        fileId,
      }];
    });
  }, [topZIndex]);

  const openNode = useCallback((node: FSNode) => {
    if (node.type === 'app' && node.appId) {
      const app = APPS.find(a => a.id === node.appId);
      if (app) { openApp(app); return; }
    }
    if (node.type === 'folder') {
      const explorer = APPS.find(a => a.type === 'explorer');
      if (explorer) { openApp(explorer, node.id); return; }
    }
    const appType = getAppForExtension(node.extension);
    if (appType) {
      const app = APPS.find(a => a.type === appType);
      if (app) { openApp(app, node.id); return; }
    }
    const notepad = APPS.find(a => a.type === 'notepad');
    if (notepad) openApp(notepad, node.id);
  }, [openApp]);

  const [fsRevision, setFsRevision] = useState(0);
  const refreshDesktop = useCallback(() => {
    setFsRevision(r => r + 1);
  }, []);

  useEffect(() => {
    initDefaultFS();
    refreshDesktop();
  }, [refreshDesktop]);

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
    setFocusedId(prev => prev === id ? null : prev);
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, minimized: true } : w));
  }, []);

  const focusWindow = useCallback((id: string) => {
    setFocusedId(id);
    setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: topZIndex(), minimized: false } : w));
  }, [topZIndex]);

  const toggleMaximize = useCallback((id: string) => {
    setWindows(prev => prev.map(w => {
      if (w.id !== id) return w;
      const goingMax = !w.maximized;
      return {
        ...w,
        maximized: goingMax,
        snapZone: goingMax ? 'fullscreen' : null,
        preSnapW: goingMax && !w.snapZone ? w.w : w.preSnapW,
        preSnapH: goingMax && !w.snapZone ? w.h : w.preSnapH,
        zIndex: topZIndex(),
      };
    }));
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

  const handleSnapRestore = useCallback((id: string, e: React.PointerEvent, preSnapW?: number, preSnapH?: number) => {
    const desktop = desktopRef.current;
    if (!desktop) return;
    const dr = desktop.getBoundingClientRect();
    const restoreW = preSnapW ?? 0.4;
    const restoreH = preSnapH ?? 0.35;
    const cx = (e.clientX - dr.left) / dr.width;
    const cy = (e.clientY - dr.top) / dr.height;
    const newX = Math.max(0, Math.min(cx - restoreW / 2, 1 - restoreW));
    const newY = Math.max(0, Math.min(cy - 16 / dr.height, 1 - restoreH));
    const offsetX = (cx - newX) * dr.width;
    const offsetY = e.clientY - dr.top - newY * dr.height;
    setWindows(prev => prev.map(w => w.id === id ? {
      ...w, snapZone: null, maximized: false,
      x: newX, y: newY,
      w: restoreW, h: restoreH,
    } : w));
    setDrag({ kind: 'move', id, offsetX, offsetY });
  }, []);

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
    if (iconDragInfo) {
      setIconDragInfo(prev => prev ? { ...prev, curX: e.clientX, curY: e.clientY } : null);
      if (iconDragInfo.sourceFolder !== 'desktop') {
        const trashEl = document.querySelector<HTMLElement>('[data-node-id="trash"]');
        if (trashEl) {
          const tr = trashEl.getBoundingClientRect();
          const over = e.clientX >= tr.left && e.clientX <= tr.right && e.clientY >= tr.top && e.clientY <= tr.bottom;
          setCrossDropTarget(over ? 'trash' : null);
        }
      } else {
        setCrossDropTarget(null);
      }
    }
    if (!drag) return;
    const desktop = desktopRef.current;
    if (!desktop) return;
    const dr = desktop.getBoundingClientRect();

    if (drag.kind === 'move') {
      let x = (e.clientX - dr.left - drag.offsetX) / dr.width;
      let y = (e.clientY - dr.top - drag.offsetY) / dr.height;
      x = Math.max(-0.2, Math.min(x, 1 - 80 / dr.width));
      y = Math.max(0, Math.min(y, 1 - 40 / dr.height));
      setWindows(prev => prev.map(w => w.id === drag.id ? { ...w, x, y, maximized: false, snapZone: null } : w));
      setSnapPreview(detectSnap(e.clientX, e.clientY, dr));
    } else {
      const dx = (e.clientX - drag.startX) / dr.width;
      const dy = (e.clientY - drag.startY) / dr.height;
      const minW = MIN_W_PX / dr.width;
      const minH = MIN_H_PX / dr.height;
      setWindows(prev => prev.map(w => {
        if (w.id !== drag.id) return w;
        const next = { ...w };
        if (drag.edge.includes('e')) next.w = Math.max(minW, drag.startW + dx);
        if (drag.edge.includes('s')) next.h = Math.max(minH, drag.startH + dy);
        if (drag.edge.includes('w')) {
          const newW = Math.max(minW, drag.startW - dx);
          next.x = drag.startWX + (drag.startW - newW);
          next.w = newW;
        }
        if (drag.edge.includes('n')) {
          const newH = Math.max(minH, drag.startH - dy);
          next.y = drag.startWY + (drag.startH - newH);
          next.h = newH;
        }
        return next;
      }));
    }
  }, [drag, iconDragInfo]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (iconDragInfo) {
      const allDropTargets = document.querySelectorAll<HTMLElement>('[data-drop-folder]');
      let targetFolder: string | null = null;
      let topZ = -1;
      let topWinEl: Element | null = null;
      for (const el of allDropTargets) {
        const rect = el.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          const winEl = el.closest('[id^="win-"]');
          const z = winEl ? parseInt(getComputedStyle(winEl).zIndex || '0', 10) : 0;
          if (z >= topZ) {
            topZ = z;
            targetFolder = el.getAttribute('data-drop-folder');
            topWinEl = winEl;
          }
        }
      }
      const trashEl = document.querySelector<HTMLElement>('[data-node-id="trash"]');
      if (trashEl && iconDragInfo.sourceFolder !== 'desktop') {
        const tr = trashEl.getBoundingClientRect();
        if (e.clientX >= tr.left && e.clientX <= tr.right && e.clientY >= tr.top && e.clientY <= tr.bottom) {
          targetFolder = 'trash';
          topWinEl = null;
        }
      }
      if (targetFolder && targetFolder !== iconDragInfo.sourceFolder) {
        moveNodes(iconDragInfo.ids, targetFolder);
        refreshDesktop();
        if (topWinEl) {
          const winId = topWinEl.id.replace(/^win-/, '');
          setTimeout(() => focusWindow(winId), 0);
        }
      }
      setIconDragInfo(null);
      setCrossDropTarget(null);
    }
    if (drag?.kind === 'move' && snapPreview) {
      setWindows(prev => prev.map(w => w.id === drag.id ? {
        ...w,
        snapZone: snapPreview,
        maximized: snapPreview === 'fullscreen',
        preSnapW: w.snapZone ? w.preSnapW : w.w,
        preSnapH: w.snapZone ? w.preSnapH : w.h,
      } : w));
    }
    setDrag(null);
    setSnapPreview(null);
  }, [drag, snapPreview, iconDragInfo, refreshDesktop, focusWindow]);


  return (
    <div
      className="w-screen flex flex-col overflow-hidden select-none" style={{ height: '100dvh' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Desktop */}
      <div
        ref={desktopRef}
        className="flex-1 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a3a4a 0%, #0d1f2d 50%, #1a2a3a 100%)' }}
        onClick={() => { setStartMenuOpen(false); setFocusedId(null); }}
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

        {/* Desktop Icons — FileExplorer desktop mode */}
        <div className="absolute inset-0">
          <FileExplorer mode="desktop" refreshKey={fsRevision} onOpenFile={openNode} onFSChange={refreshDesktop} onIconDragChange={setIconDragInfo} crossDragging={!!iconDragInfo && iconDragInfo.sourceFolder !== 'desktop'} crossDropTarget={crossDropTarget} />
        </div>

        {/* Windows */}
        {windows.map(win => (
          <AppWindow
            key={win.id}
            win={win}
            isTop={win.id === focusedId}
            dragging={!!iconDragInfo}
            fsRevision={fsRevision}
            onFocus={focusWindow}
            onClose={closeWindow}
            onMinimize={minimizeWindow}
            onToggleMaximize={toggleMaximize}
            onTitlePointerDown={handleTitlePointerDown}
            onResizePointerDown={handleResizePointerDown}
            onSnapRestore={handleSnapRestore}
            onOpenNode={openNode}
            onFSChange={refreshDesktop}
            onNavigateBrowser={navigateBrowser}
            onIconDragChange={setIconDragInfo}
          />
        ))}

        {/* Cross-drag ghost (only for non-desktop sources — desktop renders its own) */}
        {iconDragInfo && iconDragInfo.sourceFolder !== 'desktop' && iconDragInfo.ghosts.map((g, i) => (
          <div
            key={i}
            className="fixed flex flex-col items-center justify-center pointer-events-none"
            style={{
              left: iconDragInfo.curX - 45 + i * 8,
              top: iconDragInfo.curY - 45 + i * 8,
              width: 90,
              height: 90,
              opacity: 0.7 - i * 0.1,
              zIndex: 10001 - i,
            }}
          >
            <span className="text-3xl">{g.icon}</span>
            <span className="text-[11px] text-white mt-1 text-center leading-tight truncate w-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {g.name}
            </span>
          </div>
        ))}
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
            const isTop = win.id === focusedId;
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
        <Clock />
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
