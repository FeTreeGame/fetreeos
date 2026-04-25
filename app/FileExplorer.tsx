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

  const [iconDrag, setIconDrag] = useState<{
    id: string;
    startX: number;
    startY: number;
    curX: number;
    curY: number;
    active: boolean;
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ col: number; row: number } | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selBox, setSelBox] = useState<{
    startX: number;
    startY: number;
    curX: number;
    curY: number;
    active: boolean;
  } | null>(null);

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

  const handleIconPointerDown = useCallback((id: string, e: React.PointerEvent) => {
    if (!isDesktop) return;
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    } else {
      setSelectedIds(new Set([id]));
    }
    setIconDrag({ id, startX: e.clientX, startY: e.clientY, curX: e.clientX, curY: e.clientY, active: false });
  }, [isDesktop]);

  const handleBgPointerDown = useCallback((e: React.PointerEvent) => {
    if (!isDesktop) return;
    if (!e.ctrlKey && !e.metaKey) setSelectedIds(new Set());
    const el = contentRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setSelBox({ startX: e.clientX - rect.left, startY: e.clientY - rect.top, curX: e.clientX - rect.left, curY: e.clientY - rect.top, active: false });
  }, [isDesktop]);

  const handleDesktopPointerMove = useCallback((e: React.PointerEvent) => {
    if (iconDrag) {
      const dx = e.clientX - iconDrag.startX;
      const dy = e.clientY - iconDrag.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (!iconDrag.active && dist < 5) return;

      const el = contentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const col = Math.max(0, Math.min(gridSize.cols - 1, Math.floor((e.clientX - rect.left) / CELL_W)));
      const row = Math.max(0, Math.min(gridSize.rows - 1, Math.floor((e.clientY - rect.top) / CELL_H)));

      setIconDrag(prev => prev ? { ...prev, curX: e.clientX, curY: e.clientY, active: true } : null);
      setDropTarget({ col, row });
      return;
    }

    if (selBox) {
      const el = contentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const curX = e.clientX - rect.left;
      const curY = e.clientY - rect.top;
      setSelBox(prev => prev ? { ...prev, curX, curY, active: true } : null);

      const left = Math.min(selBox.startX, curX);
      const top = Math.min(selBox.startY, curY);
      const right = Math.max(selBox.startX, curX);
      const bottom = Math.max(selBox.startY, curY);

      const allIds = [...items.map(n => n.id), '__trash__'];
      const hit = new Set<string>();
      for (const id of allIds) {
        const pos = iconPositions[id];
        if (!pos) continue;
        const cx = pos.col * CELL_W + CELL_W / 2;
        const cy = pos.row * CELL_H + CELL_H / 2;
        if (cx >= left && cx <= right && cy >= top && cy <= bottom) {
          hit.add(id);
        }
      }
      setSelectedIds(hit);
    }
  }, [iconDrag, selBox, gridSize, items, iconPositions]);

  const handleDesktopPointerUp = useCallback(() => {
    if (iconDrag?.active && dropTarget) {
      setIconPositions(prev => {
        const next = { ...prev };
        const targetKey = Object.keys(next).find(
          k => next[k].col === dropTarget.col && next[k].row === dropTarget.row
        );
        if (targetKey && targetKey !== iconDrag.id) {
          next[targetKey] = { ...prev[iconDrag.id] };
        }
        next[iconDrag.id] = { col: dropTarget.col, row: dropTarget.row };
        saveIconPositions(next);
        return next;
      });
    }
    setIconDrag(null);
    setDropTarget(null);
    setSelBox(null);
  }, [iconDrag, dropTarget]);

  const sortAndPlace = useCallback((compareFn: (a: { id: string } & Partial<FSNode>, b: { id: string } & Partial<FSNode>) => number) => {
    const allItems: ({ id: string } & Partial<FSNode>)[] = [...items, { id: '__trash__', name: '휴지통', type: 'folder' as const, createdAt: Infinity }];
    allItems.sort(compareFn);
    const next: IconPositions = {};
    let idx = 0;
    for (let c = 0; c < gridSize.cols; c++) {
      for (let r = 0; r < gridSize.rows; r++) {
        if (idx >= allItems.length) break;
        next[allItems[idx].id] = { col: c, row: r };
        idx++;
      }
    }
    setIconPositions(next);
    saveIconPositions(next);
    setContextMenu(null);
  }, [items, gridSize]);

  const sortByName = useCallback(() => {
    sortAndPlace((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }, [sortAndPlace]);

  const TYPE_ORDER: Record<string, number> = { app: 0, folder: 1, file: 2 };
  const sortByType = useCallback(() => {
    sortAndPlace((a, b) => (TYPE_ORDER[a.type ?? 'file'] ?? 2) - (TYPE_ORDER[b.type ?? 'file'] ?? 2) || (a.name ?? '').localeCompare(b.name ?? ''));
  }, [sortAndPlace]);

  const sortByDate = useCallback(() => {
    sortAndPlace((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  }, [sortAndPlace]);

  const tidyGrid = useCallback(() => {
    const allItems = [...items.map(n => n.id), '__trash__'];
    const next: IconPositions = {};
    let idx = 0;
    for (let c = 0; c < gridSize.cols; c++) {
      for (let r = 0; r < gridSize.rows; r++) {
        if (idx >= allItems.length) break;
        next[allItems[idx]] = { col: c, row: r };
        idx++;
      }
    }
    setIconPositions(next);
    saveIconPositions(next);
    setContextMenu(null);
  }, [items, gridSize]);

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
        onPointerDown={isDesktop ? handleBgPointerDown : undefined}
        onPointerMove={isDesktop ? handleDesktopPointerMove : undefined}
        onPointerUp={isDesktop ? handleDesktopPointerUp : undefined}
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
            {/* Drop target highlight */}
            {iconDrag?.active && dropTarget && (
              <div
                className="absolute rounded pointer-events-none"
                style={{
                  left: dropTarget.col * CELL_W,
                  top: dropTarget.row * CELL_H,
                  width: CELL_W,
                  height: CELL_H,
                  background: 'rgba(100, 140, 255, 0.15)',
                  border: '2px solid rgba(100, 140, 255, 0.4)',
                }}
              />
            )}
            {items.map(node => {
              const pos = iconPositions[node.id];
              if (!pos) return null;
              const isDragging = iconDrag?.active && iconDrag.id === node.id;
              const isSelected = selectedIds.has(node.id);
              return (
                <button
                  key={node.id}
                  className="absolute flex flex-col items-center justify-center rounded group"
                  style={{
                    left: pos.col * CELL_W,
                    top: pos.row * CELL_H,
                    width: CELL_W,
                    height: CELL_H,
                    padding: 6,
                    opacity: isDragging ? 0.3 : 1,
                  }}
                  onPointerDown={(e) => handleIconPointerDown(node.id, e)}
                  onDoubleClick={() => { if (!iconDrag?.active) handleDoubleClick(node); }}
                  onContextMenu={(e) => handleContextMenu(e, node)}
                >
                  <div className={`absolute inset-0 rounded transition-colors ${isSelected ? 'bg-blue-500/20' : 'group-hover:bg-blue-500/10'}`} />
                  <span className="text-3xl relative">{getIconForNode(node)}</span>
                  {renaming === node.id ? (
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(null); }}
                      className="relative w-full text-[10px] text-center bg-zinc-800 text-white border border-blue-500 outline-none rounded px-1 mt-1"
                      autoFocus
                    />
                  ) : (
                    <span className="relative text-[11px] text-white mt-1 text-center leading-tight truncate w-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
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
              const isDragging = iconDrag?.active && iconDrag.id === '__trash__';
              const isSelected = selectedIds.has('__trash__');
              return (
                <button
                  className="absolute flex flex-col items-center justify-center rounded group"
                  style={{
                    left: pos.col * CELL_W,
                    top: pos.row * CELL_H,
                    width: CELL_W,
                    height: CELL_H,
                    padding: 6,
                    opacity: isDragging ? 0.3 : 1,
                  }}
                  onPointerDown={(e) => handleIconPointerDown('__trash__', e)}
                  onDoubleClick={() => { if (iconDrag?.active) return;
                    const trashNode: FSNode = { id: 'trash', name: '휴지통', type: 'folder', parentId: '', createdAt: 0, updatedAt: 0, icon: '🗑️' };
                    onOpenFile?.(trashNode);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContextMenu({ x: e.clientX, y: e.clientY, node: { id: '__trash__', name: '휴지통', type: 'folder', parentId: '', createdAt: 0, updatedAt: 0, icon: '🗑️' } as FSNode });
                  }}
                >
                  <div className={`absolute inset-0 rounded transition-colors ${isSelected ? 'bg-blue-500/20' : 'group-hover:bg-blue-500/10'}`} />
                  <span className="text-3xl relative">🗑️</span>
                  <span className="relative text-[11px] text-white mt-1 text-center leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    휴지통
                  </span>
                </button>
              );
            })()}
            {/* Ghost icon during drag */}
            {iconDrag?.active && (() => {
              const dragNode = items.find(n => n.id === iconDrag.id);
              const icon = dragNode ? getIconForNode(dragNode) : iconDrag.id === '__trash__' ? '🗑️' : '📎';
              const label = dragNode?.name ?? (iconDrag.id === '__trash__' ? '휴지통' : '');
              const rect = contentRef.current?.getBoundingClientRect();
              if (!rect) return null;
              return (
                <div
                  className="fixed flex flex-col items-center justify-center pointer-events-none"
                  style={{
                    left: iconDrag.curX - CELL_W / 2,
                    top: iconDrag.curY - CELL_H / 2,
                    width: CELL_W,
                    height: CELL_H,
                    opacity: 0.7,
                    zIndex: 10001,
                  }}
                >
                  <span className="text-3xl">{icon}</span>
                  <span className="text-[11px] text-white mt-1 text-center leading-tight truncate w-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {label}
                  </span>
                </div>
              );
            })()}
            {/* Selection box (rubber band) */}
            {selBox?.active && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: Math.min(selBox.startX, selBox.curX),
                  top: Math.min(selBox.startY, selBox.curY),
                  width: Math.abs(selBox.curX - selBox.startX),
                  height: Math.abs(selBox.curY - selBox.startY),
                  background: 'rgba(100, 140, 255, 0.1)',
                  border: '1px solid rgba(100, 140, 255, 0.5)',
                  zIndex: 10002,
                }}
              />
            )}
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
            {isDesktop && (<>
              <div className="border-t border-white/10 my-0.5" />
              <button onClick={sortByName} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">이름순 정렬</button>
              <button onClick={sortByType} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">유형순 정렬</button>
              <button onClick={sortByDate} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">날짜순 정렬</button>
              <div className="border-t border-white/10 my-0.5" />
              <button onClick={tidyGrid} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">그리드에 맞춤</button>
            </>)}
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
