'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { APPS, type AppDef } from './apps';
import FileExplorer from './FileExplorer';
import Taskbar from './Taskbar';
import type { IconDragInfo, SortKey } from './constants';
import AppWindow from './AppWindow';
import Dialog from './Dialog';
import useWindowDrag from './useWindowDrag';
import { initDefaultFS, getAppForExtension, moveNodes, checkMoveConflicts, getNode, type FSNode } from './fileSystem';
import type { WindowState } from './windowTypes';

let zCounter = 1;

export default function Home() {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const desktopRef = useRef<HTMLDivElement>(null);
  const [iconDragInfo, setIconDragInfo] = useState<IconDragInfo | null>(null);
  const [crossDropTarget, setCrossDropTarget] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [moveConflict, setMoveConflict] = useState<{ ids: string[]; target: string; names: string[] } | null>(null);
  const folderSortMap = useRef<Map<string, SortKey>>(new Map());

  const getFolderSort = useCallback((folderId: string): SortKey => {
    return folderSortMap.current.get(folderId) ?? 'type';
  }, []);

  const setFolderSort = useCallback((folderId: string, sort: SortKey) => {
    folderSortMap.current.set(folderId, sort);
  }, []);

  const topZIndex = useCallback(() => {
    return ++zCounter;
  }, []);

  const openApp = useCallback((app: AppDef, fileId?: string) => {
    setStartMenuOpen(false);
    const desktop = desktopRef.current;
    const dw = desktop?.clientWidth ?? 800;
    const dh = desktop?.clientHeight ?? 600;
    const singleFileId = fileId === 'trash' ? 'trash' : undefined;
    setWindows(prev => {
      if (app.singleInstance || singleFileId) {
        const existing = singleFileId
          ? prev.find(w => w.fileId === singleFileId)
          : prev.find(w => w.app.id === app.id);
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
    setWindows(prev => {
      const remaining = prev.filter(w => w.id !== id);
      setFocusedId(fid => {
        if (fid !== id) return fid;
        const visible = remaining.filter(w => !w.minimized);
        if (visible.length === 0) return null;
        return visible.reduce((a, b) => a.zIndex > b.zIndex ? a : b).id;
      });
      return remaining;
    });
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev => {
      const updated = prev.map(w => w.id === id ? { ...w, minimized: true } : w);
      setFocusedId(fid => {
        if (fid !== id) return fid;
        const visible = updated.filter(w => !w.minimized);
        if (visible.length === 0) return null;
        return visible.reduce((a, b) => a.zIndex > b.zIndex ? a : b).id;
      });
      return updated;
    });
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

  const handleTaskbarWindowClick = useCallback((id: string, minimized: boolean, isTop: boolean) => {
    !minimized && isTop ? minimizeWindow(id) : focusWindow(id);
  }, [minimizeWindow, focusWindow]);

  const {
    dragging, snapPreviewRef, suppressDesktopBlur,
    handleTitlePointerDown, handleResizePointerDown,
    processMove, processUp,
  } = useWindowDrag({ windows, setWindows, rootRef, desktopRef, focusWindow, toggleMaximize });

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
    processMove(e);
  }, [iconDragInfo, processMove]);

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
        if (targetFolder !== 'trash') {
          const conflicts = checkMoveConflicts(iconDragInfo.ids, targetFolder);
          if (conflicts.length > 0) {
            setMoveConflict({ ids: iconDragInfo.ids, target: targetFolder, names: conflicts.map(id => {
              return getNode(id)?.name ?? id;
            })});
            setIconDragInfo(null);
            setCrossDropTarget(null);
            return;
          }
        }
        moveNodes(iconDragInfo.ids, targetFolder);
        if (topWinEl) {
          const winId = topWinEl.id.replace(/^win-/, '');
          setTimeout(() => focusWindow(winId), 0);
        }
      }
      setIconDragInfo(null);
      setCrossDropTarget(null);
      suppressDesktopBlur.current = true;
      requestAnimationFrame(() => { suppressDesktopBlur.current = false; });
      refreshDesktop();
    }
    processUp(e);
  }, [iconDragInfo, refreshDesktop, focusWindow, processUp]);


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
            getFolderSort={getFolderSort}
            onFolderSortChange={setFolderSort}
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

        {alertMsg && (
          <Dialog title="FeTreeOS" onClose={() => setAlertMsg(null)} buttons={[{ label: 'OK', onClick: () => setAlertMsg(null) }]}>
            <p className="text-xs text-white/70 leading-relaxed">{alertMsg}</p>
          </Dialog>
        )}

        {moveConflict && (
          <Dialog
            title="파일 충돌"
            onClose={() => setMoveConflict(null)}
            buttons={[
              { label: '건너뛰기', onClick: () => { moveNodes(moveConflict.ids, moveConflict.target, 'skip'); refreshDesktop(); setMoveConflict(null); } },
              { label: '덮어쓰기', variant: 'danger', onClick: () => { moveNodes(moveConflict.ids, moveConflict.target, 'overwrite'); refreshDesktop(); setMoveConflict(null); } },
              { label: '다른 이름', variant: 'primary', onClick: () => { moveNodes(moveConflict.ids, moveConflict.target, 'rename'); refreshDesktop(); setMoveConflict(null); } },
            ]}
          >
            <p className="text-xs text-white/70 leading-relaxed mb-2">대상 폴더에 같은 이름의 항목이 있습니다:</p>
            <ul className="text-xs text-white/60 mb-1 max-h-24 overflow-y-auto">
              {moveConflict.names.map((name, i) => (
                <li key={i} className="truncate">• {name}</li>
              ))}
            </ul>
          </Dialog>
        )}
      </div>

      <Taskbar
        windows={windows}
        focusedId={focusedId}
        startMenuOpen={startMenuOpen}
        onStartToggle={() => setStartMenuOpen(v => !v)}
        onWindowClick={handleTaskbarWindowClick}
        onOpenApp={openApp}
      />

    </div>
  );
}
