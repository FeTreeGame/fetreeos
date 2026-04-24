'use client';

import { useState, useEffect, useCallback } from 'react';
import { getChildren, getIconForNode, createFile, createFolder, moveToTrash, updateNode, type FSNode } from './fileSystem';

interface FileExplorerProps {
  mode?: 'desktop' | 'explorer';
  initialFolderId?: string;
  onOpenFile?: (node: FSNode) => void;
  onFSChange?: () => void;
}

export default function FileExplorer({ mode = 'explorer', initialFolderId = 'desktop', onOpenFile, onFSChange }: FileExplorerProps) {
  const isDesktop = mode === 'desktop';
  const [currentFolder, setCurrentFolder] = useState(initialFolderId);
  const [items, setItems] = useState<FSNode[]>([]);
  const [history, setHistory] = useState<string[]>([initialFolderId]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node?: FSNode } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const refresh = useCallback(() => {
    setItems(getChildren(currentFolder));
    onFSChange?.();
  }, [currentFolder, onFSChange]);

  useEffect(() => { refresh(); }, [refresh]);

  const navigateTo = useCallback((folderId: string) => {
    setCurrentFolder(folderId);
    setHistory(prev => [...prev.slice(0, historyIdx + 1), folderId]);
    setHistoryIdx(prev => prev + 1);
  }, [historyIdx]);

  const goBack = useCallback(() => {
    if (historyIdx <= 0) return;
    const newIdx = historyIdx - 1;
    setHistoryIdx(newIdx);
    setCurrentFolder(history[newIdx]);
  }, [historyIdx, history]);

  const goForward = useCallback(() => {
    if (historyIdx >= history.length - 1) return;
    const newIdx = historyIdx + 1;
    setHistoryIdx(newIdx);
    setCurrentFolder(history[newIdx]);
  }, [historyIdx, history]);

  const handleDoubleClick = useCallback((node: FSNode) => {
    if (node.type === 'folder') {
      navigateTo(node.id);
    } else if (onOpenFile) {
      onOpenFile(node);
    }
  }, [navigateTo, onOpenFile]);

  const handleContextMenu = useCallback((e: React.MouseEvent, node?: FSNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const handleNewFile = useCallback(() => {
    createFile(currentFolder, '새 텍스트.txt');
    setContextMenu(null);
    refresh();
  }, [currentFolder, refresh]);

  const handleNewFolder = useCallback(() => {
    createFolder(currentFolder, '새 폴더');
    setContextMenu(null);
    refresh();
  }, [currentFolder, refresh]);

  const handleDelete = useCallback((id: string) => {
    moveToTrash(id);
    setContextMenu(null);
    refresh();
  }, [refresh]);

  const startRename = useCallback((node: FSNode) => {
    setRenaming(node.id);
    setRenameValue(node.name);
    setContextMenu(null);
  }, []);

  const commitRename = useCallback(() => {
    if (renaming && renameValue.trim()) {
      updateNode(renaming, { name: renameValue.trim() });
      refresh();
    }
    setRenaming(null);
  }, [renaming, renameValue, refresh]);

  const pathLabel = currentFolder === 'desktop' ? 'Desktop' : currentFolder === 'root' ? '/' : items.length >= 0 ? currentFolder : currentFolder;

  return (
    <div className={`flex flex-col h-full ${isDesktop ? 'bg-transparent' : 'bg-zinc-900'}`} onClick={() => setContextMenu(null)}>
      {/* Toolbar — explorer only */}
      {!isDesktop && (
        <div className="flex items-center gap-1 px-2 py-1 bg-zinc-800 border-b border-zinc-700">
          <button
            onClick={goBack}
            disabled={historyIdx <= 0}
            className="w-6 h-6 rounded text-xs text-zinc-400 hover:bg-zinc-700 flex items-center justify-center disabled:opacity-30"
          >←</button>
          <button
            onClick={goForward}
            disabled={historyIdx >= history.length - 1}
            className="w-6 h-6 rounded text-xs text-zinc-400 hover:bg-zinc-700 flex items-center justify-center disabled:opacity-30"
          >→</button>
          <button
            onClick={() => currentFolder !== 'desktop' && currentFolder !== 'root' ? goBack() : null}
            className="w-6 h-6 rounded text-xs text-zinc-400 hover:bg-zinc-700 flex items-center justify-center"
          >↑</button>
          <div className="flex-1 h-6 px-2 mx-1 bg-zinc-900 border border-zinc-600 rounded text-xs text-zinc-400 flex items-center">
            {pathLabel}
          </div>
        </div>
      )}

      {/* Content */}
      <div
        className={`flex-1 overflow-auto ${isDesktop ? 'p-4' : 'p-3'}`}
        onContextMenu={(e) => handleContextMenu(e)}
      >
        {items.length === 0 && !isDesktop ? (
          <div className="text-zinc-500 text-xs text-center mt-8">빈 폴더입니다</div>
        ) : (
          <div className={isDesktop
            ? 'flex flex-col flex-wrap gap-2 content-start h-full'
            : 'grid grid-cols-4 gap-1'
          }>
            {items.map(node => (
              <button
                key={node.id}
                className={`flex flex-col items-center rounded hover:bg-white/10 transition-colors ${
                  isDesktop ? 'w-20 p-2' : 'p-2'
                }`}
                onDoubleClick={() => handleDoubleClick(node)}
                onContextMenu={(e) => handleContextMenu(e, node)}
              >
                <span className={isDesktop ? 'text-3xl' : 'text-2xl'}>{getIconForNode(node)}</span>
                {renaming === node.id ? (
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(null); }}
                    className="w-full text-[10px] text-center bg-zinc-800 text-white border border-blue-500 outline-none rounded px-1 mt-1"
                    autoFocus
                  />
                ) : (
                  <span className={`mt-1 text-center leading-tight truncate w-full ${
                    isDesktop
                      ? 'text-[11px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
                      : 'text-[10px] text-zinc-300'
                  }`}>
                    {node.name}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed rounded shadow-xl overflow-hidden"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            background: '#2a2a3a',
            border: '1px solid rgba(255,255,255,0.12)',
            zIndex: 10000,
            minWidth: 140,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.node ? (<>
            <button onClick={() => handleDoubleClick(contextMenu.node!)} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">열기</button>
            {contextMenu.node.type !== 'app' && (<>
              <button onClick={() => startRename(contextMenu.node!)} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">이름 변경</button>
              <div className="border-t border-white/10 my-0.5" />
              <button onClick={() => handleDelete(contextMenu.node!.id)} className="w-full text-left px-3 py-1.5 text-xs text-red-400/70 hover:bg-white/10">삭제</button>
            </>)}
          </>) : (<>
            <button onClick={handleNewFile} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">새 텍스트 파일</button>
            <button onClick={handleNewFolder} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">새 폴더</button>
          </>)}
        </div>
      )}

      {/* Status bar — explorer only */}
      {!isDesktop && (
        <div className="flex items-center px-3 py-1 bg-zinc-800 border-t border-zinc-700 text-[10px] text-zinc-500">
          {items.length}개 항목
        </div>
      )}
    </div>
  );
}
