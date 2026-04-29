import { getNode, checkMoveConflicts, moveNodes, type MoveConflictMode } from './fileSystem';

export function findDropTarget(
  clientX: number,
  clientY: number,
  excludeIds: string[],
): string | null {
  const icons = document.querySelectorAll<HTMLElement>('[data-node-id]');
  for (const icon of icons) {
    const rect = icon.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
      const id = icon.getAttribute('data-node-id')!;
      if (excludeIds.includes(id)) continue;
      if (id === 'trash') return 'trash';
      const node = getNode(id);
      if (node?.type === 'folder') return id;
    }
  }
  return null;
}

export interface MoveResult {
  moved: boolean;
  conflict?: { ids: string[]; target: string; names: string[] };
}

export function resolveAndMove(
  ids: string[],
  targetId: string,
  conflictMode?: MoveConflictMode,
): MoveResult {
  if (targetId !== 'trash' && !conflictMode) {
    const conflicts = checkMoveConflicts(ids, targetId);
    if (conflicts.length > 0) {
      return {
        moved: false,
        conflict: {
          ids,
          target: targetId,
          names: conflicts.map(id => getNode(id)?.name ?? id),
        },
      };
    }
  }
  moveNodes(ids, targetId, conflictMode);
  return { moved: true };
}
