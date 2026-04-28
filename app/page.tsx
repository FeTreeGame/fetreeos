'use client';

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { APPS, type AppDef } from './apps';
import Clock from './Clock';
import Notepad from './Notepad';
import FileExplorer from './FileExplorer';
import type { IconDragInfo } from './constants';
import Settings from './Settings';
import Browser from './Browser';
import Gallery from './Gallery';
import MyComputer from './MyComputer';
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
  preSnapX?: number;
  preSnapY?: number;
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
  | { kind: 'move'; id: string; offsetX: number; offsetY: number; startX?: number; startY?: number; originX?: number; originY?: number; originW?: number; originH?: number; currentX?: number; currentY?: number }
  | { kind: 'resize'; id: string; edge: string; startX: number; startY: number; startW: number; startH: number; startWX: number; startWY: number; currentX?: number; currentY?: number; currentW?: number; currentH?: number };

interface AppWindowProps {
  win: WindowState;
  isTop: boolean;
  dragging: boolean;
  dragId: string | null;
  fsRevision: number;
  onFocus: (id: string) => void;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onToggleMaximize: (id: string) => void;
  onTitlePointerDown: (id: string, e: React.PointerEvent) => void;
  onResizePointerDown: (id: string, edge: string, e: React.PointerEvent) => void;
  onOpenNode: (node: FSNode) => void;
  onFSChange: () => void;
  onNavigateBrowser: (id: string, url: string) => void;
  onIconDragChange: (info: IconDragInfo | null) => void;
}

const AppWindow = memo(function AppWindow({
  win, isTop, dragging, dragId, fsRevision,
  onFocus, onClose, onMinimize, onToggleMaximize,
  onTitlePointerDown, onResizePointerDown,
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
        pointerEvents: dragging ? 'none' as const : undefined,
      } : {
        left: `${win.x * 100}%`,
        top: `${win.y * 100}%`,
        width: `${win.w * 100}%`,
        height: `${win.h * 100}%`,
        zIndex: win.zIndex,
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 8,
        minWidth: MIN_W_PX,
        minHeight: MIN_H_PX,
        pointerEvents: dragging ? 'none' as const : undefined,
      }}
      onPointerDown={() => onFocus(win.id)}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ borderRadius: 'inherit' }}>
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
          onTitlePointerDown(win.id, e);
        }}
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
      <div className="flex-1 overflow-hidden" style={{ pointerEvents: dragId === win.id ? 'none' : undefined }} onPointerDown={() => onFocus(win.id)}>
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
        {win.app.type === 'mycomputer' && (
          <MyComputer />
        )}
        {win.app.type === 'gallery' && (
          <Gallery />
        )}
        {win.app.type === 'empty' && (
          <div className="h-full bg-zinc-900 flex flex-col items-center justify-center gap-2">
            <span className="text-zinc-400 text-lg">{win.app.icon}</span>
            <span className="text-zinc-400 font-medium">{win.app.title}</span>
            <span className="text-zinc-600 text-sm">Coming Soon</span>
          </div>
        )}
      </div>
      </div>
      {/* Resize handles */}
      {!isMax && !isSnapped && <>
        <div className="absolute left-0 right-0 cursor-n-resize" style={{ top: -5, height: 10, zIndex: 1 }} onPointerDown={(e) => onResizePointerDown(win.id, 'n', e)} />
        <div className="absolute left-0 right-0 cursor-s-resize" style={{ bottom: -5, height: 10, zIndex: 1 }} onPointerDown={(e) => onResizePointerDown(win.id, 's', e)} />
        <div className="absolute top-0 bottom-0 cursor-w-resize" style={{ left: -5, width: 10, zIndex: 1 }} onPointerDown={(e) => onResizePointerDown(win.id, 'w', e)} />
        <div className="absolute top-0 bottom-0 cursor-e-resize" style={{ right: -5, width: 10, zIndex: 1 }} onPointerDown={(e) => onResizePointerDown(win.id, 'e', e)} />
        <div className="absolute cursor-nw-resize" style={{ top: -5, left: -5, width: 16, height: 16, zIndex: 2 }} onPointerDown={(e) => onResizePointerDown(win.id, 'nw', e)} />
        <div className="absolute cursor-ne-resize" style={{ top: -5, right: -5, width: 16, height: 16, zIndex: 2 }} onPointerDown={(e) => onResizePointerDown(win.id, 'ne', e)} />
        <div className="absolute cursor-sw-resize" style={{ bottom: -5, left: -5, width: 16, height: 16, zIndex: 2 }} onPointerDown={(e) => onResizePointerDown(win.id, 'sw', e)} />
        <div className="absolute cursor-se-resize" style={{ bottom: -5, right: -5, width: 16, height: 16, zIndex: 2 }} onPointerDown={(e) => onResizePointerDown(win.id, 'se', e)} />
      </>}
    </div>
  );
});

export default function Home() {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const dragRef = useRef<DragMode | null>(null);
  const [dragging, setDragging] = useState<{ kind: 'move' | 'resize'; id: string; edge?: string } | null>(null);
  const snapPreviewRef = useRef<HTMLDivElement>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const desktopRef = useRef<HTMLDivElement>(null);
  const [iconDragInfo, setIconDragInfo] = useState<IconDragInfo | null>(null);
  const [crossDropTarget, setCrossDropTarget] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

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
    if ((node.type === 'app' || node.type === 'system') && node.appId) {
      const app = APPS.find(a => a.id === node.appId);
      if (app) { openApp(app); return; }
    }
    if (node.type === 'folder' || node.id === 'trash') {
      const explorer = APPS.find(a => a.type === 'explorer');
      if (explorer) { openApp(explorer, node.id); return; }
    }
    const appType = getAppForExtension(node.extension);
    if (appType) {
      const app = APPS.find(a => a.type === appType);
      if (app) { openApp(app, node.id); return; }
    }
    setAlertMsg(`"${node.name}"을(를) 열 수 있는 앱이 없습니다.`);
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
      if (w.snapZone && w.snapZone !== 'fullscreen') {
        const rw = w.preSnapW ?? 0.4;
        const rh = w.preSnapH ?? 0.35;
        return {
          ...w,
          snapZone: null,
          x: w.preSnapX ?? Math.max(0, Math.min(w.x, 1 - rw)),
          y: w.preSnapY ?? Math.max(0, Math.min(w.y, 1 - rh)),
          w: rw,
          h: rh,
          zIndex: topZIndex(),
        };
      }
      const goingMax = !w.maximized;
      return {
        ...w,
        maximized: goingMax,
        snapZone: goingMax ? 'fullscreen' : null,
        x: goingMax ? w.x : (w.preSnapX ?? w.x),
        y: goingMax ? w.y : (w.preSnapY ?? w.y),
        preSnapX: goingMax && !w.snapZone ? w.x : w.preSnapX,
        preSnapY: goingMax && !w.snapZone ? w.y : w.preSnapY,
        preSnapW: goingMax && !w.snapZone ? w.w : w.preSnapW,
        preSnapH: goingMax && !w.snapZone ? w.h : w.preSnapH,
        zIndex: topZIndex(),
      };
    }));
  }, [topZIndex]);

  const navigateBrowser = useCallback((id: string, url: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, browserUrl: url } : w));
  }, []);

  const lastTitleClick = useRef<{ id: string; time: number }>({ id: '', time: 0 });
  const suppressDesktopBlur = useRef(false);
  const handleTitlePointerDown = useCallback((id: string, e: React.PointerEvent) => {
    focusWindow(id);
    const now = Date.now();
    const last = lastTitleClick.current;
    if (last.id === id && now - last.time < 350) {
      lastTitleClick.current = { id: '', time: 0 };
      suppressDesktopBlur.current = true;
      setTimeout(() => { suppressDesktopBlur.current = false; }, 100);
      toggleMaximize(id);
      return;
    }
    lastTitleClick.current = { id, time: now };
    const winEl = document.getElementById(`win-${id}`);
    if (!winEl) return;
    const rect = winEl.getBoundingClientRect();
    rootRef.current?.setPointerCapture(e.pointerId);
    const w = windows.find(win => win.id === id);
    dragRef.current = { kind: 'move', id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top, startX: e.clientX, startY: e.clientY, originX: w?.x, originY: w?.y, originW: w?.w, originH: w?.h };
    setDragging({ kind: 'move', id });
  }, [focusWindow, toggleMaximize, windows]);

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
    rootRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { kind: 'move', id, offsetX, offsetY };
    setDragging({ kind: 'move', id });
  }, []);

  const handleResizePointerDown = useCallback((id: string, edge: string, e: React.PointerEvent) => {
    e.stopPropagation();
    focusWindow(id);
    rootRef.current?.setPointerCapture(e.pointerId);
    const w = windows.find(win => win.id === id);
    if (!w) return;
    dragRef.current = { kind: 'resize', id, edge, startX: e.clientX, startY: e.clientY, startW: w.w, startH: w.h, startWX: w.x, startWY: w.y };
    setDragging({ kind: 'resize', id, edge });
  }, [focusWindow, windows]);

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
    const d = dragRef.current;
    if (!d) return;
    const desktop = desktopRef.current;
    if (!desktop) return;
    const dr = desktop.getBoundingClientRect();

    if (d.kind === 'move') {
      if (d.startX != null && d.startY != null) {
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        if (dx * dx + dy * dy < 9) return;
        const win = windows.find(w => w.id === d.id);
        if (win && (win.snapZone || win.maximized)) {
          handleSnapRestore(d.id, e, win.preSnapW, win.preSnapH);
          return;
        }
        dragRef.current = { ...d, startX: undefined, startY: undefined };
      }
      let x = (e.clientX - dr.left - d.offsetX) / dr.width;
      let y = (e.clientY - dr.top - d.offsetY) / dr.height;
      x = Math.max(-0.2, Math.min(x, 1 - 80 / dr.width));
      y = Math.max(0, Math.min(y, 1 - 40 / dr.height));

      dragRef.current = { ...dragRef.current!, currentX: x, currentY: y };

      const el = document.getElementById(`win-${d.id}`);
      if (el) {
        el.style.left = `${x * 100}%`;
        el.style.top = `${y * 100}%`;
      }

      const snap = detectSnap(e.clientX, e.clientY, dr);
      const spEl = snapPreviewRef.current;
      if (spEl) {
        if (snap) {
          const rect = SNAP_RECTS[snap];
          spEl.style.display = 'block';
          spEl.style.left = rect.left;
          spEl.style.top = rect.top;
          spEl.style.width = rect.width;
          spEl.style.height = rect.height;
        } else {
          spEl.style.display = 'none';
        }
      }
    } else {
      const dx = (e.clientX - d.startX) / dr.width;
      const dy = (e.clientY - d.startY) / dr.height;
      const minW = MIN_W_PX / dr.width;
      const minH = MIN_H_PX / dr.height;

      let newX = d.startWX, newY = d.startWY;
      let newW = d.startW, newH = d.startH;

      if (d.edge.includes('e')) newW = Math.max(minW, d.startW + dx);
      if (d.edge.includes('s')) newH = Math.max(minH, d.startH + dy);
      if (d.edge.includes('w')) {
        newW = Math.max(minW, d.startW - dx);
        newX = d.startWX + (d.startW - newW);
      }
      if (d.edge.includes('n')) {
        newH = Math.max(minH, d.startH - dy);
        newY = d.startWY + (d.startH - newH);
      }

      dragRef.current = { ...d, currentX: newX, currentY: newY, currentW: newW, currentH: newH };

      const el = document.getElementById(`win-${d.id}`);
      if (el) {
        el.style.left = `${newX * 100}%`;
        el.style.top = `${newY * 100}%`;
        el.style.width = `${newW * 100}%`;
        el.style.height = `${newH * 100}%`;
      }
    }
  }, [iconDragInfo, windows, handleSnapRestore]);

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
    const d = dragRef.current;
    if (d) {
      const desktop = desktopRef.current;
      if (d.kind === 'move') {
        const snap = desktop ? detectSnap(e.clientX, e.clientY, desktop.getBoundingClientRect()) : null;
        if (snap) {
          setWindows(prev => prev.map(w => w.id === d.id ? {
            ...w,
            snapZone: snap,
            maximized: snap === 'fullscreen',
            preSnapX: w.snapZone ? w.preSnapX : (d.originX ?? w.x),
            preSnapY: w.snapZone ? w.preSnapY : (d.originY ?? w.y),
            preSnapW: w.snapZone ? w.preSnapW : (d.originW ?? w.w),
            preSnapH: w.snapZone ? w.preSnapH : (d.originH ?? w.h),
          } : w));
        } else if (d.currentX !== undefined && d.currentY !== undefined) {
          setWindows(prev => prev.map(w => w.id === d.id ? {
            ...w, x: d.currentX!, y: d.currentY!, maximized: false, snapZone: null,
          } : w));
        }
      } else {
        if (d.currentW !== undefined) {
          setWindows(prev => prev.map(w => w.id === d.id ? {
            ...w,
            x: d.currentX ?? w.x,
            y: d.currentY ?? w.y,
            w: d.currentW ?? w.w,
            h: d.currentH ?? w.h,
          } : w));
        }
      }
      if (rootRef.current && e.pointerId !== undefined && rootRef.current.hasPointerCapture(e.pointerId)) {
        rootRef.current.releasePointerCapture(e.pointerId);
      }
      dragRef.current = null;
      setDragging(null);
      if (snapPreviewRef.current) snapPreviewRef.current.style.display = 'none';
    }
  }, [iconDragInfo, refreshDesktop, focusWindow]);


  return (
    <div
      ref={rootRef}
      className="w-screen flex flex-col overflow-hidden select-none" style={{ height: '100dvh', cursor: dragging?.kind === 'resize' ? `${dragging.edge}-resize` : undefined }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Desktop */}
      <div
        ref={desktopRef}
        className="flex-1 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a3a4a 0%, #0d1f2d 50%, #1a2a3a 100%)' }}
        onClick={() => { setStartMenuOpen(false); if (!suppressDesktopBlur.current) setFocusedId(null); }}
      >
        {/* Snap Preview — always mounted, display toggled via ref */}
        <div
          ref={snapPreviewRef}
          className="absolute rounded-lg pointer-events-none transition-all duration-150"
          style={{
            display: 'none',
            background: 'rgba(100, 140, 255, 0.15)',
            border: '2px solid rgba(100, 140, 255, 0.4)',
            zIndex: 9998,
          }}
        />

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
            dragging={!!iconDragInfo || !!dragging}
            dragId={dragging?.id ?? null}
            fsRevision={fsRevision}
            onFocus={focusWindow}
            onClose={closeWindow}
            onMinimize={minimizeWindow}
            onToggleMaximize={toggleMaximize}
            onTitlePointerDown={handleTitlePointerDown}
            onResizePointerDown={handleResizePointerDown}
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

        {/* Alert Dialog */}
        {alertMsg && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 20000 }}>
            <div className="absolute inset-0 bg-black/40" onClick={() => setAlertMsg(null)} />
            <div
              className="relative w-72 rounded-lg shadow-2xl overflow-hidden"
              style={{ background: '#2a2a3a', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <div className="flex items-center px-3 py-2 bg-zinc-800 border-b border-zinc-700">
                <span className="text-xs text-white/80 font-bold flex-1">FeTreeOS</span>
              </div>
              <div className="px-4 py-5">
                <p className="text-xs text-white/70 leading-relaxed">{alertMsg}</p>
              </div>
              <div className="flex justify-end px-3 py-2 border-t border-zinc-700">
                <button
                  onClick={() => setAlertMsg(null)}
                  className="px-4 py-1 rounded text-xs bg-zinc-700 text-white/80 hover:bg-zinc-600"
                >OK</button>
              </div>
            </div>
          </div>
        )}
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
