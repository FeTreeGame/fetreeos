'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getChildren, getIconForNode, getPath, getNode, createFile, createFolder, moveNodes, checkMoveConflicts, emptyTrash, deleteNode, updateNode, isFolderAlive, restoreFromTrash, type FSNode } from './fileSystem';
import Dialog from './Dialog';
import ContextMenu from './ContextMenu';
import { useDesktopDrag } from './useDesktopDrag';
import { useExplorerDrag } from './useExplorerDrag';
import { CELL_W, CELL_H, TRASH_NODE, TYPE_ORDER, SORT_COMPARATORS, placeOnGrid, type IconDragInfo, type IconPositions, type IconDragState, type SelBoxState, type DropTargetState, type SortKey } from './constants';

const ICON_POS_KEY = 'fetree-icon-positions';

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
  const unplaced: { id: string }[] = [];

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
    unplaced.push(item);
  }
  let startIdx = 0;
  for (const pos of Object.values(result)) {
    const idx = pos.col * rows + pos.row + 1;
    if (idx > startIdx) startIdx = idx;
  }
  for (const item of unplaced) {
    let placed = false;
    for (let i = startIdx; i < cols * rows && !placed; i++) {
      const c = Math.floor(i / rows);
      const r = i % rows;
      const key = `${c},${r}`;
      if (!occupied.has(key)) {
        result[item.id] = { col: c, row: r };
        occupied.add(key);
        placed = true;
      }
    }
    if (!placed) {
      for (let i = 0; i < startIdx && !placed; i++) {
        const c = Math.floor(i / rows);
        const r = i % rows;
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
  onIconDragChange?: (info: IconDragInfo | null) => void;
  crossDragging?: boolean;
  crossDropTarget?: string | null;
  getFolderSort?: (folderId: string) => SortKey;
  onFolderSortChange?: (folderId: string, sort: SortKey) => void;
  isFileOpenInApp?: (fileId: string) => boolean;
  onAlert?: (msg: string) => void;
}

export default function FileExplorer({ mode = 'explorer', initialFolderId = 'desktop', refreshKey, onOpenFile, onFSChange, onIconDragChange, crossDragging, crossDropTarget, getFolderSort, onFolderSortChange, isFileOpenInApp, onAlert }: FileExplorerProps) {
  const isDesktop = mode === 'desktop';
  const [currentFolder, setCurrentFolder] = useState(initialFolderId);
  const [items, setItems] = useState<FSNode[]>([]);
  const [history, setHistory] = useState<string[]>([initialFolderId]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node?: FSNode } | null>(null);
  const [subMenu, setSubMenu] = useState<'create' | 'sort' | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [propsNode, setPropsNode] = useState<FSNode | null>(null);
  const [restoreConflict, setRestoreConflict] = useState<{ id: string; target: string; names: string[] } | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const [gridSize, setGridSize] = useState({ cols: 1, rows: 1 });
  const [iconPositions, setIconPositions] = useState<IconPositions>({});
  const [showGrid, setShowGrid] = useState(true);
  const [autoArrange, setAutoArrange] = useState(true);
  const [desktopSort, setDesktopSort] = useState<SortKey>('type');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setShowGrid(localStorage.getItem('fetree-show-grid') !== 'false');
    setAutoArrange(localStorage.getItem('fetree-auto-arrange') !== 'false');
    setDesktopSort((localStorage.getItem('fetree-desktop-sort') as SortKey) || 'type');
    setItems(getChildren(initialFolderId));
    setHydrated(true);
  }, [initialFolderId]);
  const [explorerSort, setExplorerSortRaw] = useState<SortKey>(() => getFolderSort?.(initialFolderId) ?? 'type');
  const setExplorerSort = useCallback((key: SortKey) => {
    setExplorerSortRaw(key);
    onFolderSortChange?.(currentFolder, key);
  }, [currentFolder, onFolderSortChange]);

  const [iconDrag, setIconDrag] = useState<IconDragState>(null);
  const [dropTarget, setDropTarget] = useState<DropTargetState>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selBox, setSelBox] = useState<SelBoxState>(null);

  const refresh = useCallback(() => {
    setItems(getChildren(currentFolder));
    onFSChange?.();
  }, [currentFolder, onFSChange]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (refreshKey !== undefined) {
      if (!isDesktop && currentFolder !== 'desktop' && currentFolder !== 'trash' && !isFolderAlive(currentFolder)) {
        let fallback = 'desktop';
        let cur = getNode(currentFolder);
        for (let i = 0; i < 10 && cur; i++) {
          const target = cur.deletedFrom ?? (cur.parentId !== 'trash' ? cur.parentId : null);
          if (!target) break;
          if (target === 'desktop' || isFolderAlive(target)) { fallback = target; break; }
          cur = getNode(target);
        }
        setCurrentFolder(fallback);
        setHistory(prev => [...prev.slice(0, historyIdx + 1), fallback]);
        setHistoryIdx(prev => prev + 1);
        setItems(getChildren(fallback));
      } else {
        setItems(getChildren(currentFolder));
      }
      if (isDesktop) {
        setShowGrid(localStorage.getItem('fetree-show-grid') !== 'false');
        setAutoArrange(localStorage.getItem('fetree-auto-arrange') !== 'false');
        setDesktopSort((localStorage.getItem('fetree-desktop-sort') as SortKey) || 'type');
      }
      setIconDrag(null);
      setDropTarget(null);
    }
  }, [refreshKey, currentFolder, isDesktop, historyIdx]);

  useEffect(() => {
    if (!isDesktop || !contentRef.current) return;
    const el = contentRef.current;
    const measure = () => {
      const cols = Math.max(1, Math.floor(el.clientWidth / CELL_W));
      const rows = Math.max(1, Math.floor(el.clientHeight / CELL_H));
      setGridSize(prev => (prev.cols === cols && prev.rows === rows) ? prev : { cols, rows });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isDesktop]);

  const allDesktopItems = useCallback((): ({ id: string } & Partial<FSNode>)[] => {
    return [...items, { id: TRASH_NODE.id, name: TRASH_NODE.name, type: TRASH_NODE.type, createdAt: Infinity }];
  }, [items]);

  const applyLayout = useCallback((positions: IconPositions) => {
    setIconPositions(positions);
    saveIconPositions(positions);
  }, []);

  const compactLayout = useCallback(() => {
    const all = allDesktopItems();
    const saved = loadIconPositions();
    const { cols, rows } = gridSize;
    const withPos: { id: string; idx: number }[] = [];
    const tail: { id: string }[] = [];
    for (const item of all) {
      const pos = saved[item.id];
      if (pos) {
        withPos.push({ id: item.id, idx: pos.col * rows + pos.row });
      } else {
        tail.push(item);
      }
    }
    withPos.sort((a, b) => a.idx - b.idx);
    applyLayout(placeOnGrid([...withPos, ...tail], cols, rows));
  }, [allDesktopItems, gridSize, applyLayout]);

  useEffect(() => {
    if (!hydrated || !isDesktop || (gridSize.cols <= 1 && gridSize.rows <= 1)) return;
    if (items.length === 0) return;
    const all = allDesktopItems();
    const saved = loadIconPositions();
    const { cols, rows } = gridSize;
    if (autoArrange) {
      const withPos: { id: string; idx: number }[] = [];
      const newItems: (typeof all)[number][] = [];
      for (const item of all) {
        const pos = saved[item.id];
        if (pos) {
          withPos.push({ id: item.id, idx: pos.col * rows + pos.row });
        } else {
          newItems.push(item);
        }
      }
      if (withPos.length === 0) {
        all.sort(SORT_COMPARATORS[desktopSort]);
        applyLayout(placeOnGrid(all, cols, rows));
      } else {
        withPos.sort((a, b) => a.idx - b.idx);
        applyLayout(placeOnGrid([...withPos, ...newItems], cols, rows));
      }
    } else {
      applyLayout(autoPlace(all, saved, cols, rows));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, isDesktop, items, gridSize, autoArrange, allDesktopItems, applyLayout]);

  const navigateTo = useCallback((folderId: string) => {
    setCurrentFolder(folderId);
    setExplorerSortRaw(getFolderSort?.(folderId) ?? 'type');
    setHistory(prev => [...prev.slice(0, historyIdx + 1), folderId]);
    setHistoryIdx(prev => prev + 1);
  }, [historyIdx, getFolderSort]);

  const goBack = useCallback(() => {
    if (historyIdx <= 0) return;
    const newIdx = historyIdx - 1;
    setHistoryIdx(newIdx);
    setCurrentFolder(history[newIdx]);
    setExplorerSortRaw(getFolderSort?.(history[newIdx]) ?? 'type');
  }, [historyIdx, history, getFolderSort]);

  const goForward = useCallback(() => {
    if (historyIdx >= history.length - 1) return;
    const newIdx = historyIdx + 1;
    setHistoryIdx(newIdx);
    setCurrentFolder(history[newIdx]);
    setExplorerSortRaw(getFolderSort?.(history[newIdx]) ?? 'type');
  }, [historyIdx, history, getFolderSort]);

  const handleDoubleClick = useCallback((node: FSNode) => {
    if (currentFolder === 'trash') {
      setPropsNode(node);
      return;
    }
    if (node.type === 'folder' && !isDesktop) {
      navigateTo(node.id);
    } else if (onOpenFile) {
      onOpenFile(node);
    }
  }, [navigateTo, onOpenFile, isDesktop, currentFolder]);

  useEffect(() => {
    const close = () => setContextMenu(null);
    const handlePointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest?.('[data-context-menu]')) return;
      setContextMenu(null);
    };
    document.addEventListener('fetree-close-context', close);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('fetree-close-context', close);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, node?: FSNode) => {
    e.preventDefault();
    e.stopPropagation();
    document.dispatchEvent(new Event('fetree-close-context'));
    setContextMenu({ x: e.clientX, y: e.clientY, node });
    setSubMenu(null);
  }, []);

  const handleNewFile = useCallback(() => {
    createFile(currentFolder, '새 텍스트.txt');
    setContextMenu(null);
    refresh();
  }, [currentFolder, refresh]);

  const handleNewFolder = useCallback(() => {
    if (!createFolder(currentFolder, '새 폴더')) return;
    setContextMenu(null);
    refresh();
  }, [currentFolder, refresh]);

  const handleDelete = useCallback((id: string) => {
    if (isFileOpenInApp?.(id)) {
      const node = items.find(n => n.id === id);
      onAlert?.(`"${node?.name ?? id}" 파일이 열려있어 삭제할 수 없습니다.`);
      setContextMenu(null);
      return;
    }
    moveNodes([id], 'trash');
    setContextMenu(null);
    refresh();
  }, [refresh, isFileOpenInApp, items, onAlert]);

  const handleRestore = useCallback((id: string) => {
    const node = getNode(id);
    const target = node?.deletedFrom ?? 'desktop';
    const conflicts = checkMoveConflicts([id], target);
    if (conflicts.length > 0) {
      setRestoreConflict({ id, target, names: conflicts.map(cid => getNode(cid)?.name ?? cid) });
      setContextMenu(null);
      setPropsNode(null);
      return;
    }
    restoreFromTrash(id, target);
    setContextMenu(null);
    setPropsNode(null);
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

  const { handleDesktopPointerMove, handleDesktopPointerUp, clearDragState, getDragIds } = useDesktopDrag({
    contentRef, iconPositions, setIconPositions, saveIconPositions,
    gridSize, items, selectedIds, setSelectedIds,
    iconDrag, setIconDrag, dropTarget, setDropTarget,
    selBox, setSelBox, autoArrange, currentFolder,
    onIconDragChange, refresh,
  });

  const handleIconPointerDown = useCallback((id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    if (!isDesktop) {
      setIconDrag({ id, startX: e.clientX, startY: e.clientY, curX: e.clientX, curY: e.clientY, active: false });
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    } else if (!selectedIds.has(id)) {
      setSelectedIds(new Set([id]));
    }
    setIconDrag({ id, startX: e.clientX, startY: e.clientY, curX: e.clientX, curY: e.clientY, active: false });
  }, [isDesktop, selectedIds]);

  const handleBgPointerDown = useCallback((e: React.PointerEvent) => {
    const isAdditive = e.ctrlKey || e.metaKey;
    if (!isAdditive) setSelectedIds(new Set());
    const el = contentRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setSelBox({
      startX: e.clientX - rect.left, startY: e.clientY - rect.top,
      curX: e.clientX - rect.left, curY: e.clientY - rect.top,
      active: false, additive: isAdditive, baseSelection: new Set(isAdditive ? selectedIds : []),
    });
  }, [selectedIds]);

  const { handleExplorerPointerMove, handleExplorerPointerUp } = useExplorerDrag({
    contentRef, items, selectedIds, setSelectedIds,
    iconDrag, setIconDrag, selBox, setSelBox,
    currentFolder, onIconDragChange, clearDragState, getDragIds,
  });

  const sortLayout = useCallback((key?: SortKey) => {
    const sortKey = key ?? desktopSort;
    if (key) {
      setDesktopSort(key);
      localStorage.setItem('fetree-desktop-sort', key);
    }
    const all = allDesktopItems();
    all.sort(SORT_COMPARATORS[sortKey]);
    applyLayout(placeOnGrid(all, gridSize.cols, gridSize.rows));
    setContextMenu(null);
  }, [desktopSort, allDesktopItems, gridSize, applyLayout]);

  const breadcrumb = getPath(currentFolder);

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
            onClick={() => {
              if (breadcrumb.length > 1) navigateTo(breadcrumb[breadcrumb.length - 2].id);
            }}
            disabled={breadcrumb.length <= 1}
            className="w-6 h-6 rounded text-xs text-zinc-400 hover:bg-zinc-700 flex items-center justify-center disabled:opacity-30"
          >↑</button>
          <div className="flex-1 h-6 px-2 mx-1 bg-zinc-900 border border-zinc-600 rounded text-xs text-zinc-400 flex items-center overflow-hidden">
            {breadcrumb.map((seg, i) => (
              <span key={seg.id} className="flex items-center shrink-0">
                {i > 0 && <span className="mx-1 text-zinc-600">/</span>}
                <button
                  onClick={() => navigateTo(seg.id)}
                  className="hover:text-white/80 transition-colors truncate"
                >{seg.name}</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div
        ref={contentRef}
        data-drop-folder={currentFolder}
        className={`flex-1 overflow-auto relative ${isDesktop ? '' : 'p-3'}`}
        onContextMenu={(e) => handleContextMenu(e)}
        onPointerDown={handleBgPointerDown}
        onPointerMove={isDesktop ? handleDesktopPointerMove : handleExplorerPointerMove}
        onPointerUp={isDesktop ? (e) => handleDesktopPointerUp(e) : handleExplorerPointerUp}
      >
        {items.length === 0 && !isDesktop && hydrated ? (
          <div className="text-zinc-500 text-xs text-center mt-8">{currentFolder === 'trash' ? '휴지통이 비어 있습니다' : '빈 폴더입니다'}</div>
        ) : isDesktop ? (
          <div className="relative w-full h-full">
            {/* Grid debug overlay */}
            {showGrid && Array.from({ length: gridSize.cols * gridSize.rows }, (_, i) => {
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
            {iconDrag?.active && dropTarget && (() => {
              const targetId = Object.keys(iconPositions).find(
                id => id !== iconDrag.id && iconPositions[id].col === dropTarget.col && iconPositions[id].row === dropTarget.row
              );
              const targetNode = targetId === 'trash' ? TRASH_NODE : items.find(n => n.id === targetId);
              const isReceiver = dropTarget.center && targetNode && (targetNode.type === 'folder' || targetId === 'trash');
              if (isReceiver) {
                return (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: dropTarget.col * CELL_W + 4,
                      top: dropTarget.row * CELL_H + 4,
                      width: CELL_W - 8,
                      height: CELL_H - 8,
                      borderRadius: 8,
                      background: 'rgba(100, 200, 120, 0.15)',
                      border: '2px solid rgba(100, 200, 120, 0.5)',
                    }}
                  />
                );
              }
              if (autoArrange) {
                const barY = dropTarget.afterY
                  ? (dropTarget.row + 1) * CELL_H
                  : dropTarget.row * CELL_H;
                return (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: dropTarget.col * CELL_W + 8,
                      top: barY - 1,
                      width: CELL_W - 16,
                      height: 2,
                      borderRadius: 1,
                      background: 'rgba(100, 140, 255, 0.8)',
                    }}
                  />
                );
              }
              return (
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
              );
            })()}
            {[...items, TRASH_NODE].map(node => {
              const pos = iconPositions[node.id];
              if (!pos) return null;
              const isTrash = node.id === 'trash';
              const isDragging = iconDrag?.active && (iconDrag.id === node.id || (selectedIds.has(iconDrag.id) && selectedIds.size > 1 && selectedIds.has(node.id)));
              const isSelected = selectedIds.has(node.id);
              const isCrossDropReceiver = crossDropTarget === node.id;
              return (
                <button
                  key={node.id}
                  data-node-id={node.id}
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
                  onDoubleClick={() => {
                    if (iconDrag?.active) return;
                    setSelectedIds(new Set());
                    if (isTrash) { onOpenFile?.(TRASH_NODE); return; }
                    handleDoubleClick(node);
                  }}
                  onContextMenu={(e) => {
                    if (isTrash) { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, node: TRASH_NODE }); return; }
                    handleContextMenu(e, node);
                  }}
                >
                  <div className={`absolute inset-0 rounded transition-colors ${isCrossDropReceiver ? 'bg-green-500/15 border-2 border-green-500/50' : isSelected ? 'bg-blue-500/20' : !iconDrag?.active ? 'group-hover:bg-blue-500/10' : ''}`} />
                  <span className="text-3xl relative">{isTrash ? '🗑️' : getIconForNode(node)}</span>
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
            {/* Ghost icons during drag (skip when page.tsx handles cross-drag ghosts) */}
            {iconDrag?.active && !crossDragging && (() => {
              const rect = contentRef.current?.getBoundingClientRect();
              if (!rect) return null;
              const originPos = iconPositions[iconDrag.id];
              if (!originPos) return null;
              const originPxX = rect.left + originPos.col * CELL_W + CELL_W / 2;
              const originPxY = rect.top + originPos.row * CELL_H + CELL_H / 2;
              const offsetX = iconDrag.curX - originPxX;
              const offsetY = iconDrag.curY - originPxY;

              const ghostIds = getDragIds(iconDrag.id);

              return ghostIds.map(gid => {
                const gpos = iconPositions[gid];
                if (!gpos) return null;
                const gNode = gid === 'trash' ? TRASH_NODE : items.find(n => n.id === gid);
                if (!gNode) return null;
                const gIcon = gid === 'trash' ? '🗑️' : getIconForNode(gNode);
                const gLabel = gNode.name;
                return (
                  <div
                    key={`ghost-${gid}`}
                    className="fixed flex flex-col items-center justify-center pointer-events-none"
                    style={{
                      left: rect.left + gpos.col * CELL_W + offsetX,
                      top: rect.top + gpos.row * CELL_H + offsetY,
                      width: CELL_W,
                      height: CELL_H,
                      opacity: 0.7,
                      zIndex: 10001,
                    }}
                  >
                    <span className="text-3xl">{gIcon}</span>
                    <span className="text-[11px] text-white mt-1 text-center leading-tight truncate w-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {gLabel}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        ) : (<>
          <div className="grid grid-cols-4 gap-1">
            {[...items].sort(SORT_COMPARATORS[explorerSort]).map(node => (
              <button
                key={node.id}
                data-node-id={node.id}
                className={`flex flex-col items-center p-2 rounded transition-colors ${crossDropTarget === node.id ? 'bg-green-500/15 ring-2 ring-green-500/50' : selectedIds.has(node.id) ? 'bg-blue-500/20' : !iconDrag?.active ? 'hover:bg-white/10' : ''}`}
                style={{ opacity: iconDrag?.active && crossDropTarget !== node.id && (iconDrag.id === node.id || (selectedIds.has(iconDrag.id) && selectedIds.has(node.id))) ? 0.3 : 1 }}
                onPointerDown={(e) => handleIconPointerDown(node.id, e)}
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
        </>)}
        {/* Selection box (rubber band) — shared */}
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

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          currentFolder={currentFolder}
          isDesktop={isDesktop}
          autoArrange={autoArrange}
          desktopSort={desktopSort}
          explorerSort={explorerSort}
          subMenu={subMenu}
          onClose={() => setContextMenu(null)}
          onOpen={(node) => { if (node.id === 'trash') onOpenFile?.(TRASH_NODE); else { handleDoubleClick(node); } setContextMenu(null); }}
          onDelete={(id) => { handleDelete(id); }}
          onPermanentDelete={(id) => { deleteNode(id); setContextMenu(null); refresh(); }}
          onRestore={handleRestore}
          onRename={(node) => startRename(node)}
          onNewFile={handleNewFile}
          onNewFolder={handleNewFolder}
          onEmptyTrash={() => { emptyTrash(); refresh(); setContextMenu(null); }}
          onProperties={(node) => { setPropsNode(node); setContextMenu(null); }}
          onToggleAutoArrange={() => {
            const next = !autoArrange;
            setAutoArrange(next);
            localStorage.setItem('fetree-auto-arrange', String(next));
            if (next) sortLayout();
            setContextMenu(null);
          }}
          onDesktopSort={(key) => sortLayout(key)}
          onExplorerSort={(key) => { setExplorerSort(key); setContextMenu(null); }}
          onRefresh={() => sortLayout()}
          onSubMenu={setSubMenu}
        />
      )}

      {/* Trash item properties dialog */}
      {propsNode && (() => {
        const isInTrash = currentFolder === 'trash';
        const typeLabels: Record<string, string> = { folder: '폴더', file: '파일', app: '앱', system: '시스템' };
        const typeLabel = typeLabels[propsNode.type] ?? propsNode.type;
        const locationPath = isInTrash
          ? (propsNode.deletedFrom ? getPath(propsNode.deletedFrom).map(s => s.name).join(' > ') : 'Desktop')
          : getPath(propsNode.parentId).map(s => s.name).join(' > ');
        const fmt = (ts?: number) => {
          if (!ts) return '-';
          const d = new Date(ts);
          return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        };
        const buttons = isInTrash
          ? [{ label: '복원', variant: 'primary' as const, onClick: () => handleRestore(propsNode.id) }, { label: '닫기', onClick: () => setPropsNode(null) }]
          : [{ label: '확인', onClick: () => setPropsNode(null) }];
        return (
          <Dialog title={`${propsNode.name} 속성`} onClose={() => setPropsNode(null)} buttons={buttons}>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-700">
              <span className="text-2xl">{getIconForNode(propsNode)}</span>
              <span className="text-sm text-white/90 font-medium truncate">{propsNode.name}</span>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
              <span className="text-white/40">종류:</span>
              <span className="text-white/70">{typeLabel}{propsNode.extension ? ` (${propsNode.extension})` : ''}</span>
              <span className="text-white/40">{isInTrash ? '원본:' : '위치:'}</span>
              <span className="text-white/70 truncate">{locationPath}</span>
              {isInTrash && (<>
                <span className="text-white/40 mt-2">삭제한 날짜:</span>
                <span className="text-white/70 mt-2">{fmt(propsNode.deletedAt)}</span>
              </>)}
              <span className={`text-white/40 ${!isInTrash ? 'mt-2' : ''}`}>만든 날짜:</span>
              <span className={`text-white/70 ${!isInTrash ? 'mt-2' : ''}`}>{fmt(propsNode.createdAt)}</span>
              <span className="text-white/40">수정한 날짜:</span>
              <span className="text-white/70">{fmt(propsNode.updatedAt)}</span>
            </div>
          </Dialog>
        );
      })()}

      {/* Restore conflict dialog */}
      {restoreConflict && (
        <Dialog
          title="복원 충돌"
          modal
          onClose={() => setRestoreConflict(null)}
          buttons={[
            { label: '건너뛰기', onClick: () => setRestoreConflict(null) },
            { label: '덮어쓰기', variant: 'danger', onClick: () => { moveNodes([restoreConflict.id], restoreConflict.target, 'overwrite'); setRestoreConflict(null); refresh(); } },
            { label: '다른 이름', variant: 'primary', onClick: () => { moveNodes([restoreConflict.id], restoreConflict.target, 'rename'); setRestoreConflict(null); refresh(); } },
          ]}
        >
          <p className="text-xs text-white/70 leading-relaxed mb-2">원본 위치에 같은 이름의 항목이 있습니다:</p>
          <ul className="text-xs text-white/60 mb-1 max-h-24 overflow-y-auto">
            {restoreConflict.names.map((name, i) => (
              <li key={i} className="truncate">• {name}</li>
            ))}
          </ul>
        </Dialog>
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
