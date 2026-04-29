'use client';

import { memo } from 'react';
import type { IconDragInfo, SortKey } from './constants';
import type { FSNode } from './fileSystem';
import { MIN_W_PX, MIN_H_PX, SNAP_RECTS, type WindowState } from './windowTypes';
import Notepad from './Notepad';
import FileExplorer from './FileExplorer';
import Browser from './Browser';
import Settings from './Settings';
import Gallery from './Gallery';
import MyComputer from './MyComputer';

export interface AppWindowProps {
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
  getFolderSort: (folderId: string) => SortKey;
  onFolderSortChange: (folderId: string, sort: SortKey) => void;
}

const AppWindow = memo(function AppWindow({
  win, isTop, dragging, dragId, fsRevision,
  onFocus, onClose, onMinimize, onToggleMaximize,
  onTitlePointerDown, onResizePointerDown,
  onOpenNode, onFSChange, onNavigateBrowser, onIconDragChange,
  getFolderSort, onFolderSortChange,
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
          <FileExplorer initialFolderId={win.fileId ?? 'desktop'} refreshKey={fsRevision} onOpenFile={onOpenNode} onFSChange={onFSChange} onIconDragChange={onIconDragChange} getFolderSort={getFolderSort} onFolderSortChange={onFolderSortChange} />
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

export default AppWindow;
