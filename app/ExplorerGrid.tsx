'use client';

import { memo } from 'react';
import { getIconForNode, type FSNode } from './fileSystem';
import { SORT_COMPARATORS, type IconDragState, type SortKey } from './constants';

interface ExplorerGridProps {
  items: FSNode[];
  explorerSort: SortKey;
  iconDrag: IconDragState;
  selectedIds: Set<string>;
  crossDropTarget?: string | null;
  renaming: string | null;
  renameValue: string;
  onIconPointerDown: (id: string, e: React.PointerEvent) => void;
  onDoubleClick: (node: FSNode) => void;
  onContextMenu: (e: React.MouseEvent, node?: FSNode) => void;
  onRenameChange: (value: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
}

const ExplorerGrid = memo(function ExplorerGrid({
  items, explorerSort, iconDrag, selectedIds, crossDropTarget,
  renaming, renameValue,
  onIconPointerDown, onDoubleClick, onContextMenu,
  onRenameChange, onRenameCommit, onRenameCancel,
}: ExplorerGridProps) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {[...items].sort(SORT_COMPARATORS[explorerSort]).map(node => (
        <button
          key={node.id}
          data-node-id={node.id}
          className={`flex flex-col items-center p-2 rounded transition-colors ${crossDropTarget === node.id ? 'bg-green-500/15 ring-2 ring-green-500/50' : selectedIds.has(node.id) ? 'bg-blue-500/20' : !iconDrag?.active ? 'hover:bg-white/10' : ''}`}
          style={{ opacity: iconDrag?.active && crossDropTarget !== node.id && (iconDrag.id === node.id || (selectedIds.has(iconDrag.id) && selectedIds.has(node.id))) ? 0.3 : 1 }}
          onPointerDown={(e) => onIconPointerDown(node.id, e)}
          onDoubleClick={() => onDoubleClick(node)}
          onContextMenu={(e) => onContextMenu(e, node)}
        >
          <span className="text-2xl">{getIconForNode(node)}</span>
          {renaming === node.id ? (
            <input
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onBlur={onRenameCommit}
              onKeyDown={(e) => { if (e.key === 'Enter') onRenameCommit(); if (e.key === 'Escape') onRenameCancel(); }}
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
  );
});

export default ExplorerGrid;
