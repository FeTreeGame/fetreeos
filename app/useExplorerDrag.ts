import { useCallback } from 'react';
import { getIconForNode, type FSNode } from './fileSystem';
import { type IconDragInfo, type IconDragState, type SelBoxState } from './constants';

interface UseExplorerDragParams {
  contentRef: React.RefObject<HTMLDivElement | null>;
  items: FSNode[];
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  iconDrag: IconDragState;
  setIconDrag: React.Dispatch<React.SetStateAction<IconDragState>>;
  selBox: SelBoxState;
  setSelBox: React.Dispatch<React.SetStateAction<SelBoxState>>;
  currentFolder: string;
  onIconDragChange?: (info: IconDragInfo | null) => void;
  clearDragState: () => void;
  getDragIds: (dragId: string, excludeTrash?: boolean) => string[];
}

export function useExplorerDrag({
  contentRef, items, selectedIds, setSelectedIds,
  iconDrag, setIconDrag, selBox, setSelBox,
  currentFolder, onIconDragChange, clearDragState, getDragIds,
}: UseExplorerDragParams) {

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
  }, [iconDrag, selBox, currentFolder, onIconDragChange, items, selectedIds, contentRef, getDragIds, setIconDrag, setSelBox, setSelectedIds]);

  const handleExplorerPointerUp = useCallback(() => {
    if (iconDrag?.active) {
      onIconDragChange?.(null);
    }
    clearDragState();
  }, [iconDrag, onIconDragChange, clearDragState]);

  return { handleExplorerPointerMove, handleExplorerPointerUp };
}
