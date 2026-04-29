'use client';

import { memo, type RefObject } from 'react';
import { getIconForNode, type FSNode } from './fileSystem';
import { CELL_W, CELL_H, TRASH_NODE, type IconPositions, type IconDragState, type DropTargetState } from './constants';

interface DesktopGridProps {
  items: FSNode[];
  iconPositions: IconPositions;
  gridSize: { cols: number; rows: number };
  showGrid: boolean;
  autoArrange: boolean;
  iconDrag: IconDragState;
  dropTarget: DropTargetState;
  selectedIds: Set<string>;
  crossDropTarget?: string | null;
  crossDragging?: boolean;
  renaming: string | null;
  renameValue: string;
  contentRef: RefObject<HTMLDivElement | null>;
  getDragIds: (id: string) => string[];
  onIconPointerDown: (id: string, e: React.PointerEvent) => void;
  onDoubleClick: (node: FSNode) => void;
  onTrashOpen: () => void;
  onContextMenu: (e: React.MouseEvent, node?: FSNode) => void;
  onRenameChange: (value: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  onClearSelection: () => void;
}

const DesktopGrid = memo(function DesktopGrid({
  items, iconPositions, gridSize, showGrid, autoArrange,
  iconDrag, dropTarget, selectedIds, crossDropTarget, crossDragging,
  renaming, renameValue, contentRef, getDragIds,
  onIconPointerDown, onDoubleClick, onTrashOpen, onContextMenu,
  onRenameChange, onRenameCommit, onRenameCancel, onClearSelection,
}: DesktopGridProps) {
  return (
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

      {/* Icons */}
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
            onPointerDown={(e) => onIconPointerDown(node.id, e)}
            onDoubleClick={() => {
              if (iconDrag?.active) return;
              onClearSelection();
              if (isTrash) { onTrashOpen(); return; }
              onDoubleClick(node);
            }}
            onContextMenu={(e) => {
              if (isTrash) { e.preventDefault(); e.stopPropagation(); onContextMenu(e, TRASH_NODE); return; }
              onContextMenu(e, node);
            }}
          >
            <div className={`absolute inset-0 rounded transition-colors ${isCrossDropReceiver ? 'bg-green-500/15 border-2 border-green-500/50' : isSelected ? 'bg-blue-500/20' : !iconDrag?.active ? 'group-hover:bg-blue-500/10' : ''}`} />
            <span className="text-3xl relative">{isTrash ? '🗑️' : getIconForNode(node)}</span>
            {renaming === node.id ? (
              <input
                value={renameValue}
                onChange={(e) => onRenameChange(e.target.value)}
                onBlur={onRenameCommit}
                onKeyDown={(e) => { if (e.key === 'Enter') onRenameCommit(); if (e.key === 'Escape') onRenameCancel(); }}
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

      {/* Ghost icons during drag */}
      {iconDrag?.active && !crossDragging && (() => {
        const rect = contentRef.current?.getBoundingClientRect();
        if (!rect) return null;
        const originPos = iconPositions[iconDrag.id];
        if (!originPos) return null;
        const offsetX = iconDrag.curX - (rect.left + originPos.col * CELL_W + CELL_W / 2);
        const offsetY = iconDrag.curY - (rect.top + originPos.row * CELL_H + CELL_H / 2);
        const ghostIds = getDragIds(iconDrag.id);
        return ghostIds.map(gid => {
          const gpos = iconPositions[gid];
          if (!gpos) return null;
          const gNode = gid === 'trash' ? TRASH_NODE : items.find(n => n.id === gid);
          if (!gNode) return null;
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
              <span className="text-3xl">{gid === 'trash' ? '🗑️' : getIconForNode(gNode)}</span>
              <span className="text-[11px] text-white mt-1 text-center leading-tight truncate w-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {gNode.name}
              </span>
            </div>
          );
        });
      })()}
    </div>
  );
});

export default DesktopGrid;
