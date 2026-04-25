'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getChildren, getIconForNode, getPath, createFile, createFolder, moveNodes, emptyTrash, deleteNode, updateNode, type FSNode } from './fileSystem';

const CELL_W = 90;
const CELL_H = 90;
const ICON_POS_KEY = 'fetree-icon-positions';

type IconPositions = Record<string, { col: number; row: number }>;
const TYPE_ORDER: Record<string, number> = { app: 0, folder: 1, file: 2 };
const TRASH_NODE: FSNode = { id: 'trash', name: '휴지통', type: 'folder', parentId: '', createdAt: 0, updatedAt: 0, icon: '🗑️' };

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

export interface IconDragInfo {
  ids: string[];
  sourceFolder: string;
  ghosts: { icon: string; name: string }[];
  curX: number;
  curY: number;
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
}

export default function FileExplorer({ mode = 'explorer', initialFolderId = 'desktop', refreshKey, onOpenFile, onFSChange, onIconDragChange, crossDragging, crossDropTarget }: FileExplorerProps) {
  const isDesktop = mode === 'desktop';
  const [currentFolder, setCurrentFolder] = useState(initialFolderId);
  const [items, setItems] = useState<FSNode[]>([]);
  const [history, setHistory] = useState<string[]>([initialFolderId]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node?: FSNode } | null>(null);
  const [subMenu, setSubMenu] = useState<'create' | 'sort' | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const contentRef = useRef<HTMLDivElement>(null);
  const [gridSize, setGridSize] = useState({ cols: 1, rows: 1 });
  const [iconPositions, setIconPositions] = useState<IconPositions>({});
  const [showGrid, setShowGrid] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('fetree-show-grid') !== 'false';
  });
  const [autoArrange, setAutoArrange] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('fetree-auto-arrange') === 'true';
  });
  const [desktopSort, setDesktopSort] = useState<'name' | 'type' | 'date'>(() => {
    if (typeof window === 'undefined') return 'type';
    return (localStorage.getItem('fetree-desktop-sort') as 'name' | 'type' | 'date') || 'type';
  });
  const [explorerSort, setExplorerSort] = useState<'name' | 'type' | 'date' | null>(null);

  const [iconDrag, setIconDrag] = useState<{
    id: string;
    startX: number;
    startY: number;
    curX: number;
    curY: number;
    active: boolean;
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ col: number; row: number; center: boolean; afterY: boolean } | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selBox, setSelBox] = useState<{
    startX: number;
    startY: number;
    curX: number;
    curY: number;
    active: boolean;
    additive: boolean;
    baseSelection: Set<string>;
  } | null>(null);

  const refresh = useCallback(() => {
    setItems(getChildren(currentFolder));
    onFSChange?.();
  }, [currentFolder, onFSChange]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (refreshKey !== undefined) {
      setItems(getChildren(currentFolder));
      if (isDesktop) setShowGrid(localStorage.getItem('fetree-show-grid') !== 'false');
      setIconDrag(null);
      setDropTarget(null);
    }
  }, [refreshKey, currentFolder, isDesktop]);

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

  useEffect(() => {
    if (!isDesktop || (gridSize.cols <= 1 && gridSize.rows <= 1)) return;
    const allItems: ({ id: string } & Partial<FSNode>)[] = [...items, { id: 'trash', name: '휴지통', type: 'folder' as const, createdAt: Infinity }];
    if (autoArrange) {
      if (desktopSort === 'name') allItems.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
      else if (desktopSort === 'date') allItems.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
      else allItems.sort((a, b) => (TYPE_ORDER[a.type ?? 'file'] ?? 2) - (TYPE_ORDER[b.type ?? 'file'] ?? 2) || (a.name ?? '').localeCompare(b.name ?? ''));
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
    } else {
      const saved = loadIconPositions();
      const placed = autoPlace(allItems, saved, gridSize.cols, gridSize.rows);
      setIconPositions(placed);
      saveIconPositions(placed);
    }
  }, [isDesktop, items, gridSize, autoArrange, desktopSort]);

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
    moveNodes([id], 'trash');
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

  const clearDragState = useCallback(() => {
    setIconDrag(null);
    setDropTarget(null);
    setSelBox(null);
  }, []);

  const getDragIds = useCallback((dragId: string, excludeTrash = false) => {
    if (selectedIds.has(dragId) && selectedIds.size > 1) {
      const ids = [...selectedIds];
      return excludeTrash ? ids.filter(id => id !== 'trash') : ids;
    }
    return [dragId];
  }, [selectedIds]);

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
      const relX = ((e.clientX - rect.left) % CELL_W) / CELL_W;
      const relY = ((e.clientY - rect.top) % CELL_H) / CELL_H;
      const center = relX > 0.2 && relX < 0.8 && relY > 0.2 && relY < 0.8;

      if (!iconDrag.active) {
        const movedIds = getDragIds(iconDrag.id, true);
        const ghosts = movedIds.map(id => {
          const n = id === 'trash' ? TRASH_NODE : items.find(nd => nd.id === id);
          return { icon: n ? (id === 'trash' ? '🗑️' : getIconForNode(n)) : '📎', name: n?.name ?? '' };
        });
        onIconDragChange?.({
          ids: movedIds,
          sourceFolder: currentFolder,
          ghosts,
          curX: e.clientX,
          curY: e.clientY,
        });
      }
      setIconDrag(prev => prev ? { ...prev, curX: e.clientX, curY: e.clientY, active: true } : null);
      setDropTarget({ col, row, center, afterY: relY >= 0.5 });
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

      const allIds = [...items.map(n => n.id), 'trash'];
      const hit = new Set<string>(selBox.additive ? selBox.baseSelection : []);
      for (const id of allIds) {
        const pos = iconPositions[id];
        if (!pos) continue;
        const iconLeft = pos.col * CELL_W;
        const iconTop = pos.row * CELL_H;
        const iconRight = iconLeft + CELL_W;
        const iconBottom = iconTop + CELL_H;
        if (iconRight > left && iconLeft < right && iconBottom > top && iconTop < bottom) {
          if (selBox.additive && selBox.baseSelection.has(id)) {
            hit.delete(id);
          } else {
            hit.add(id);
          }
        }
      }
      setSelectedIds(hit);
    }
  }, [iconDrag, selBox, gridSize, items, iconPositions]);

  const handleDesktopPointerUp = useCallback((e?: React.PointerEvent) => {
    if (iconDrag?.active && e) {
      const movedIds = getDragIds(iconDrag.id, true);
      const els = document.elementsFromPoint(iconDrag.curX, iconDrag.curY);
      const dropEl = els.find(el => el.getAttribute('data-drop-folder') && el !== contentRef.current);
      if (dropEl) {
        const targetFolder = dropEl.getAttribute('data-drop-folder')!;
        moveNodes(movedIds, targetFolder);
        setSelectedIds(new Set());
        onIconDragChange?.(null);
        clearDragState();
        refresh();
        return;
      }
    }
    if (iconDrag?.active && dropTarget) {
      const dragOrigin = iconPositions[iconDrag.id];
      if (!dragOrigin) { clearDragState(); return; }

      const targetNodeId = dropTarget.center
        ? Object.keys(iconPositions).find(id => id !== iconDrag.id && iconPositions[id].col === dropTarget.col && iconPositions[id].row === dropTarget.row)
        : undefined;
      const movedIds = getDragIds(iconDrag.id, true);

      if (targetNodeId && dropTarget.center) {
        const targetNode = targetNodeId === 'trash' ? TRASH_NODE : items.find(n => n.id === targetNodeId);
        if (targetNodeId === 'trash' || targetNode?.type === 'folder') {
          moveNodes(movedIds, targetNodeId);
          setSelectedIds(new Set());
          clearDragState();
          refresh();
          return;
        }
      }

      if (autoArrange) {
        const movedSet = new Set(movedIds);
        const sorted = Object.entries(iconPositions)
          .sort(([, a], [, b]) => a.col - b.col || a.row - b.row)
          .map(([id]) => id);
        const rest = sorted.filter(id => !movedSet.has(id));
        const dropIdx = dropTarget.col * gridSize.rows + dropTarget.row + (dropTarget.afterY ? 1 : 0);
        const insertAt = Math.min(dropIdx, rest.length);
        rest.splice(insertAt, 0, ...movedIds);
        const next: IconPositions = {};
        let idx = 0;
        for (let c = 0; c < gridSize.cols; c++) {
          for (let r = 0; r < gridSize.rows; r++) {
            if (idx >= rest.length) break;
            next[rest[idx]] = { col: c, row: r };
            idx++;
          }
        }
        setIconPositions(next);
        saveIconPositions(next);
        clearDragState();
        return;
      }

      const dc = dropTarget.col - dragOrigin.col;
      const dr = dropTarget.row - dragOrigin.row;
      const freeMovedIds = getDragIds(iconDrag.id);

      setIconPositions(prev => {
        const next = { ...prev };
        const newPositions: Record<string, { col: number; row: number }> = {};
        for (const id of freeMovedIds) {
          const old = prev[id];
          if (!old) continue;
          const nc = Math.max(0, Math.min(gridSize.cols - 1, old.col + dc));
          const nr = Math.max(0, Math.min(gridSize.rows - 1, old.row + dr));
          newPositions[id] = { col: nc, row: nr };
        }

        const movedSet = new Set(freeMovedIds);
        const occupiedByMoved = new Set(Object.values(newPositions).map(p => `${p.col},${p.row}`));
        for (const [id, pos] of Object.entries(newPositions)) {
          const conflictKey = Object.keys(next).find(
            k => !movedSet.has(k) && next[k].col === pos.col && next[k].row === pos.row
          );
          if (conflictKey) {
            const origPos = prev[id];
            if (origPos && !occupiedByMoved.has(`${origPos.col},${origPos.row}`)) {
              next[conflictKey] = { ...origPos };
            }
          }
          next[id] = pos;
        }

        saveIconPositions(next);
        return next;
      });
    }
    onIconDragChange?.(null);
    clearDragState();
  }, [iconDrag, dropTarget, selectedIds, iconPositions, gridSize, refresh, autoArrange, onIconDragChange, clearDragState, getDragIds]);

  const handleExplorerPointerMove = useCallback((e: React.PointerEvent) => {
    if (iconDrag) {
      const dx = e.clientX - iconDrag.startX;
      const dy = e.clientY - iconDrag.startY;
      if (!iconDrag.active && Math.sqrt(dx * dx + dy * dy) < 5) return;
      if (!iconDrag.active) {
        const dragIds = getDragIds(iconDrag.id);
        const ghosts = dragIds.map(id => {
          const n = items.find(nd => nd.id === id);
          return { icon: n ? getIconForNode(n) : '📎', name: n?.name ?? '' };
        });
        onIconDragChange?.({
          ids: dragIds,
          sourceFolder: currentFolder,
          ghosts,
          curX: e.clientX,
          curY: e.clientY,
        });
      }
      setIconDrag(prev => prev ? { ...prev, curX: e.clientX, curY: e.clientY, active: true } : null);
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

      const hit = new Set<string>(selBox.additive ? selBox.baseSelection : []);
      const icons = el.querySelectorAll<HTMLElement>('[data-node-id]');
      for (const icon of icons) {
        const ir = icon.getBoundingClientRect();
        const iconLeft = ir.left - rect.left;
        const iconTop = ir.top - rect.top;
        const iconRight = iconLeft + ir.width;
        const iconBottom = iconTop + ir.height;
        const id = icon.getAttribute('data-node-id')!;
        if (iconRight > left && iconLeft < right && iconBottom > top && iconTop < bottom) {
          if (selBox.additive && selBox.baseSelection.has(id)) hit.delete(id);
          else hit.add(id);
        }
      }
      setSelectedIds(hit);
    }
  }, [iconDrag, selBox, currentFolder, onIconDragChange, items, selectedIds]);

  const handleExplorerPointerUp = useCallback(() => {
    if (iconDrag?.active) {
      onIconDragChange?.(null);
    }
    clearDragState();
  }, [iconDrag, onIconDragChange, clearDragState]);

  const sortAndPlace = useCallback((compareFn: (a: { id: string } & Partial<FSNode>, b: { id: string } & Partial<FSNode>) => number) => {
    const allItems: ({ id: string } & Partial<FSNode>)[] = [...items, { id: 'trash', name: '휴지통', type: 'folder' as const, createdAt: Infinity }];
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

  const SORT_COMPARATORS: Record<string, (a: { id: string } & Partial<FSNode>, b: { id: string } & Partial<FSNode>) => number> = {
    name: (a, b) => (a.name ?? '').localeCompare(b.name ?? ''),
    type: (a, b) => (TYPE_ORDER[a.type ?? 'file'] ?? 2) - (TYPE_ORDER[b.type ?? 'file'] ?? 2) || (a.name ?? '').localeCompare(b.name ?? ''),
    date: (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0),
  };

  const applyDesktopSort = useCallback((key: 'name' | 'type' | 'date') => {
    setDesktopSort(key);
    localStorage.setItem('fetree-desktop-sort', key);
    sortAndPlace(SORT_COMPARATORS[key]);
  }, [sortAndPlace]);

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
        {items.length === 0 && !isDesktop ? (
          <div className="text-zinc-500 text-xs text-center mt-8">빈 폴더입니다</div>
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
            {(() => {
              if (!explorerSort) return items;
              const sorted = [...items];
              if (explorerSort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
              else if (explorerSort === 'type') sorted.sort((a, b) => (TYPE_ORDER[a.type] ?? 2) - (TYPE_ORDER[b.type] ?? 2) || a.name.localeCompare(b.name));
              else if (explorerSort === 'date') sorted.sort((a, b) => a.createdAt - b.createdAt);
              return sorted;
            })().map(node => (
              <button
                key={node.id}
                data-node-id={node.id}
                className={`flex flex-col items-center p-2 rounded transition-colors ${selectedIds.has(node.id) ? 'bg-blue-500/20' : 'hover:bg-white/10'}`}
                style={{ opacity: iconDrag?.active && (iconDrag.id === node.id || (selectedIds.has(iconDrag.id) && selectedIds.has(node.id))) ? 0.3 : 1 }}
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
        <div
          className="fixed rounded shadow-xl"
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
          {!contextMenu.node && currentFolder === 'trash' ? (<>
            <button onClick={() => { emptyTrash(); refresh(); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-xs text-red-400/70 hover:bg-white/10">휴지통 비우기</button>
          </>) : contextMenu.node ? (
            contextMenu.node.id === 'trash' ? (<>
              <button onClick={() => {
                onOpenFile?.(TRASH_NODE);
                setContextMenu(null);
              }} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">열기</button>
              <div className="border-t border-white/10 my-0.5" />
              <button onClick={() => { emptyTrash(); refresh(); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-xs text-red-400/70 hover:bg-white/10">휴지통 비우기</button>
            </>) : currentFolder === 'trash' ? (<>
              <button onClick={() => { moveNodes([contextMenu.node!.id], 'desktop'); setContextMenu(null); refresh(); }} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">복원</button>
              <div className="border-t border-white/10 my-0.5" />
              <button onClick={() => { deleteNode(contextMenu.node!.id); setContextMenu(null); refresh(); }} className="w-full text-left px-3 py-1.5 text-xs text-red-400/70 hover:bg-white/10">완전 삭제</button>
            </>) : (<>
              <button onClick={() => handleDoubleClick(contextMenu.node!)} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">열기</button>
              {contextMenu.node.type !== 'app' && (<>
                <button onClick={() => startRename(contextMenu.node!)} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">이름 변경</button>
                <div className="border-t border-white/10 my-0.5" />
                <button onClick={() => handleDelete(contextMenu.node!.id)} className="w-full text-left px-3 py-1.5 text-xs text-red-400/70 hover:bg-white/10">삭제</button>
              </>)}
            </>)
          ) : (<>
            <div className="relative" onMouseEnter={() => setSubMenu('create')} onMouseLeave={() => setSubMenu(null)}>
              <button className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 flex justify-between items-center">
                새로 만들기 <span className="text-[10px] text-white/40">▶</span>
              </button>
              {subMenu === 'create' && (
                <div className="absolute left-full top-0 rounded shadow-xl overflow-hidden" style={{ background: '#2a2a3a', border: '1px solid rgba(255,255,255,0.12)', minWidth: 120 }}>
                  <button onClick={handleNewFile} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">텍스트 파일</button>
                  <button onClick={handleNewFolder} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">폴더</button>
                </div>
              )}
            </div>
            <div className="border-t border-white/10 my-0.5" />
            {isDesktop ? (<>
              <button onClick={() => {
                const next = !autoArrange;
                setAutoArrange(next);
                localStorage.setItem('fetree-auto-arrange', String(next));
                setContextMenu(null);
              }} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">
                {autoArrange ? '✓ ' : '   '}자동 정렬
              </button>
              <div className="relative" onMouseEnter={() => setSubMenu('sort')} onMouseLeave={() => setSubMenu(null)}>
                <button className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 flex justify-between items-center">
                  정렬 기준 <span className="text-[10px] text-white/40">▶</span>
                </button>
                {subMenu === 'sort' && (
                  <div className="absolute left-full top-0 rounded shadow-xl overflow-hidden" style={{ background: '#2a2a3a', border: '1px solid rgba(255,255,255,0.12)', minWidth: 100 }}>
                    <button onClick={() => applyDesktopSort('name')} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">
                      {desktopSort === 'name' ? '✓ ' : '   '}이름순
                    </button>
                    <button onClick={() => applyDesktopSort('type')} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">
                      {desktopSort === 'type' ? '✓ ' : '   '}유형순
                    </button>
                    <button onClick={() => applyDesktopSort('date')} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">
                      {desktopSort === 'date' ? '✓ ' : '   '}날짜순
                    </button>
                  </div>
                )}
              </div>
            </>) : (<>
              <div className="relative" onMouseEnter={() => setSubMenu('sort')} onMouseLeave={() => setSubMenu(null)}>
                <button className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 flex justify-between items-center">
                  정렬 기준 <span className="text-[10px] text-white/40">▶</span>
                </button>
                {subMenu === 'sort' && (
                  <div className="absolute left-full top-0 rounded shadow-xl overflow-hidden" style={{ background: '#2a2a3a', border: '1px solid rgba(255,255,255,0.12)', minWidth: 100 }}>
                    <button onClick={() => { setExplorerSort(explorerSort === 'name' ? null : 'name'); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">
                      {explorerSort === 'name' ? '✓ ' : '   '}이름순
                    </button>
                    <button onClick={() => { setExplorerSort(explorerSort === 'type' ? null : 'type'); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">
                      {explorerSort === 'type' ? '✓ ' : '   '}유형순
                    </button>
                    <button onClick={() => { setExplorerSort(explorerSort === 'date' ? null : 'date'); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">
                      {explorerSort === 'date' ? '✓ ' : '   '}날짜순
                    </button>
                  </div>
                )}
              </div>
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
