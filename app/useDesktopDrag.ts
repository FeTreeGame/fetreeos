import { useCallback } from 'react';
import { getIconForNode, moveNodes, type FSNode } from './fileSystem';
import type { IconDragInfo } from './FileExplorer';
import { CELL_W, CELL_H, TRASH_NODE } from './constants';

type IconPositions = Record<string, { col: number; row: number }>;
type DropTarget = { col: number; row: number; center: boolean; afterY: boolean };
type SelBox = { startX: number; startY: number; curX: number; curY: number; active: boolean; additive: boolean; baseSelection: Set<string> };
type IconDrag = { id: string; startX: number; startY: number; curX: number; curY: number; active: boolean };

interface UseDesktopDragParams {
  contentRef: React.RefObject<HTMLDivElement | null>;
  iconPositions: IconPositions;
  setIconPositions: React.Dispatch<React.SetStateAction<IconPositions>>;
  saveIconPositions: (p: IconPositions) => void;
  gridSize: { cols: number; rows: number };
  items: FSNode[];
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  iconDrag: IconDrag | null;
  setIconDrag: React.Dispatch<React.SetStateAction<IconDrag | null>>;
  dropTarget: DropTarget | null;
  setDropTarget: React.Dispatch<React.SetStateAction<DropTarget | null>>;
  selBox: SelBox | null;
  setSelBox: React.Dispatch<React.SetStateAction<SelBox | null>>;
  autoArrange: boolean;
  currentFolder: string;
  onIconDragChange?: (info: IconDragInfo | null) => void;
  refresh: () => void;
}

export function useDesktopDrag({
  contentRef, iconPositions, setIconPositions, saveIconPositions,
  gridSize, items, selectedIds, setSelectedIds,
  iconDrag, setIconDrag, dropTarget, setDropTarget,
  selBox, setSelBox, autoArrange, currentFolder,
  onIconDragChange, refresh,
}: UseDesktopDragParams) {

  const clearDragState = useCallback(() => {
    setIconDrag(null);
    setDropTarget(null);
    setSelBox(null);
  }, [setIconDrag, setDropTarget, setSelBox]);

  const getDragIds = useCallback((dragId: string, excludeTrash = false) => {
    if (selectedIds.has(dragId) && selectedIds.size > 1) {
      const ids = [...selectedIds];
      return excludeTrash ? ids.filter(id => id !== 'trash') : ids;
    }
    return [dragId];
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
  }, [iconDrag, selBox, gridSize, items, iconPositions, contentRef, currentFolder, getDragIds, onIconDragChange, setIconDrag, setDropTarget, setSelBox, setSelectedIds]);

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
  }, [iconDrag, dropTarget, selectedIds, iconPositions, gridSize, refresh, autoArrange, onIconDragChange, clearDragState, getDragIds, contentRef, items, setSelectedIds, setIconPositions, saveIconPositions]);

  return {
    handleDesktopPointerMove,
    handleDesktopPointerUp,
    clearDragState,
    getDragIds,
  };
}
