import type { FSNode } from './fileSystem';

export const CELL_W = 90;
export const CELL_H = 90;
export const TRASH_NODE: FSNode = { id: 'trash', name: '휴지통', type: 'folder', parentId: '', createdAt: 0, updatedAt: 0, icon: '🗑️' };
export const TYPE_ORDER: Record<string, number> = { app: 0, folder: 1, file: 2 };

// --- Shared types ---

export type IconPositions = Record<string, { col: number; row: number }>;

export interface IconDragInfo {
  ids: string[];
  sourceFolder: string;
  ghosts: { icon: string; name: string }[];
  curX: number;
  curY: number;
}

export type IconDragState = {
  id: string;
  startX: number;
  startY: number;
  curX: number;
  curY: number;
  active: boolean;
} | null;

export type SelBoxState = {
  startX: number;
  startY: number;
  curX: number;
  curY: number;
  active: boolean;
  additive: boolean;
  baseSelection: Set<string>;
} | null;

export type DropTargetState = {
  col: number;
  row: number;
  center: boolean;
  afterY: boolean;
} | null;

export type SortKey = 'name' | 'type' | 'date';

// --- Shared sort comparators (module-scope, zero per-render cost) ---

type SortItem = { id: string } & Partial<FSNode>;

export const SORT_COMPARATORS: Record<SortKey, (a: SortItem, b: SortItem) => number> = {
  name: (a, b) => (a.name ?? '').localeCompare(b.name ?? ''),
  type: (a, b) => (TYPE_ORDER[a.type ?? 'file'] ?? 2) - (TYPE_ORDER[b.type ?? 'file'] ?? 2) || (a.name ?? '').localeCompare(b.name ?? ''),
  date: (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0),
};

// --- Grid placement helper ---

export function placeOnGrid(
  items: { id: string }[],
  cols: number,
  rows: number,
): IconPositions {
  const result: IconPositions = {};
  let idx = 0;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (idx >= items.length) break;
      result[items[idx].id] = { col: c, row: r };
      idx++;
    }
  }
  return result;
}
