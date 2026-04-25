import type { FSNode } from './fileSystem';

export const CELL_W = 90;
export const CELL_H = 90;
export const TRASH_NODE: FSNode = { id: 'trash', name: '휴지통', type: 'folder', parentId: '', createdAt: 0, updatedAt: 0, icon: '🗑️' };
export const TYPE_ORDER: Record<string, number> = { app: 0, folder: 1, file: 2 };
