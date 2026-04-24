'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getChildren, getIconForNode, createFile, createFolder, moveToTrash, emptyTrash, updateNode, type FSNode } from './fileSystem';

const CELL_W = 90;
const CELL_H = 90;
const ICON_POS_KEY = 'fetree-icon-positions';

type IconPositions = Record<string, { col: number; row: number }>;

function loadIconPositions(): IconPositions {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(ICON_POS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveIconPositions(positions: IconPositions): void {
  localStorage.setItem(ICON_POS_KEY, JSON.stringify(positions));
}

function autoPlace(
  items: { id: string }[],
  existing: IconPositions,
  cols: number,
  rows: number,
): IconPositions {
  const result: IconPositions = {};
  const occupied = new Set<string>();

  for (const item of items) {
    const pos = existing[item.id];
    if (pos && pos.col < cols && pos.row < rows) {
      const key = `${pos.col},${pos.row}`;
      if (!occupied.has(key)) {
        result[item.id] = pos;
        occupied.add(key);
        continue;
      }
    }
    let placed = false;
    for (let c = 0; c < cols && !placed; c++) {
      for (let r = 0; r < rows && !placed; r++) {
        const key = `${c},${r}`;
        if (!occupied.has(key)) {
          result[item.id] = { col: c, row: r };
          occupied.add(key);
          placed = true;
        }
      }
    }
  }
  return result;
}

interface FileExplorerProps {
  mode?: 'desktop' | 'explorer';
  initialFolderId?: string;
  refreshKey?: number;
  onOpenFile?: (node: FSNode) => void;
  onFSChange?: () => void;
}

export default function FileExplorer({ mode = 'explorer', initialFolderId = 'desktop', refreshKey, onOpenFile, onFSChange }: FileExplorerProps) {
  const isDesktop = mode === 'desktop';
  const [currentFolder, setCurrentFolder] = useState(initialFolderId);
  const [items, setItems] = useState<FSNode[]>([]);
  const [history, setHistory] = useState<string[]>([initialFolderId]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node?: FSNode } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const contentRef = useRef<HTMLDivElement>(null);
  const [gridSize, setGridSize] = useState({ cols: 1, rows: 1 });
  const [iconPositions, setIconPositions] = useState<IconPositions>({});

  const refresh = useCallback(() => {
    setItems(getChildren(currentFolder));
    onFSChange?.();
  }, [currentFolder, onFSChange]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { if (refreshKey !== undefined) setItems(getChildren(currentFolder)); }, [refreshKey, currentFolder]);

  useEffect(() => {
    if (!isDesktop || !contentRef.current) return;
    const el = contentRef.current;
    const measure = () => {
      const cols = Math.max(1, Math.floor(el.clientWidth / CELL_W));
      const rows = Math.max(1, Math.floor(el.clientHeight / CELL_H));
      setGridSize({ cols, rows });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isDesktop]);

  useEffect(() => {
    if (!isDesktop) return;
    const allItems = [...items, { id: '__trash__' }];
    const saved = loadIconPositions();
    const placed = autoPlace(allItems, saved, gridSize.cols, gridSize.rows);
    setIconPositions(placed);
    saveIconPositions(placed);
  }, [isDesktop, items, gridSize]);

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
    if (node.type === 'folder' && !isDesktop) {
      navigateTo(node.id);
    } else if (onOpenFile) {
      onOpenFile(node);
    }
  }, [navigateTo, onOpenFile, isDesktop]);

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
        ref={contentRef}
        className={`flex-1 overflow-auto ${isDesktop ? '' : 'p-3'}`}
        onContextMenu={(e) => handleContextMenu(e)}
      >
        {items.length === 0 && !isDesktop ? (
          <div className="text-zinc-500 text-xs text-center mt-8">빈 폴더입니다</div>
        ) : isDesktop ? (
          <div className="relative w-full h-full">
            {/* Grid debug overlay */}
            {Array.from({ length: gridSize.cols * gridSize.rows }, (_, i) => {
              const col = i % gridSize.cols;
              const row = Math.floor(i / gridSize.cols);
              return (
                <div
                  key={`grid-${i}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: col * CELL_W,
                    top: row * CELL_H,
                    width: CELL_W,
                    height: CELL_H,
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                />
              );
            })}
            {items.map(node => {
              const pos = iconPositions[node.id];
              if (!pos) return null;
              return (
                <button
                  key={node.id}
                  className="absolute flex flex-col items-center justify-center rounded hover:bg-white/10 transition-colors"
                  style={{
                    left: pos.col * CELL_W,
                    top: pos.row * CELL_H,
                    width: CELL_W,
                    height: CELL_H,
                    padding: 6,
                  }}
                  onDoubleClick={() => handleDoubleClick(node)}
                  onContextMenu={(e) => handleContextMenu(e, node)}
                >
                  <span className="text-3xl">{getIconForNode(node)}</span>
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
                    <span className="text-[11px] text-white mt-1 text-center leading-tight truncate w-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {node.name}
                    </span>
                  )}
                </button>
              );
            })}
            {/* Trash */}
            {(() => {
              const pos = iconPositions['__trash__'];
              if (!pos) return null;
              return (
                <button
                  className="absolute flex flex-col items-center justify-center rounded hover:bg-white/10 transition-colors"
                  style={{
                    left: pos.col * CELL_W,
                    top: pos.row * CELL_H,
                    width: CELL_W,
                    height: CELL_H,
                    padding: 6,
                  }}
                  onDoubleClick={() => {
                    const trashNode: FSNode = { id: 'trash', name: '휴지통', type: 'folder', parentId: '', createdAt: 0, updatedAt: 0, icon: '🗑️' };
                    onOpenFile?.(trashNode);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContextMenu({ x: e.clientX, y: e.clientY, node: { id: '__trash__', name: '휴지통', type: 'folder', parentId: '', createdAt: 0, updatedAt: 0, icon: '🗑️' } as FSNode });
                  }}
                >
                  <span className="text-3xl">🗑️</span>
                  <span className="text-[11px] text-white mt-1 text-center leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    휴지통
                  </span>
                </button>
              );
            })()}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1">
            {items.map(node => (
              <button
                key={node.id}
                className="flex flex-col items-center p-2 rounded hover:bg-white/10 transition-colors"
                onDoubleClick={() => handleDoubleClick(node)}
                onContextMenu={(e) => handleContextMenu(e, node)}
              >
                <span className="text-2xl">{getIconForNode(node)}</span>
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
                  <span className="text-[10px] text-zinc-300 mt-1 text-center leading-tight truncate w-full">
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
          {contextMenu.node ? (
            contextMenu.node.id === '__trash__' ? (<>
              <button onClick={() => {
                const trashNode: FSNode = { id: 'trash', name: '휴지통', type: 'folder', parentId: '', createdAt: 0, updatedAt: 0, icon: '🗑️' };
                onOpenFile?.(trashNode);
                setContextMenu(null);
              }} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">열기</button>
              <div className="border-t border-white/10 my-0.5" />
              <button onClick={() => { emptyTrash(); refresh(); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-xs text-red-400/70 hover:bg-white/10">휴지통 비우기</button>
            </>) : (<>
              <button onClick={() => handleDoubleClick(contextMenu.node!)} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">열기</button>
              {contextMenu.node.type !== 'app' && (<>
                <button onClick={() => startRename(contextMenu.node!)} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">이름 변경</button>
                <div className="border-t border-white/10 my-0.5" />
                <button onClick={() => handleDelete(contextMenu.node!.id)} className="w-full text-left px-3 py-1.5 text-xs text-red-400/70 hover:bg-white/10">삭제</button>
              </>)}
            </>)
          ) : (<>
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
