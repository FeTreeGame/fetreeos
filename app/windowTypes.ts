import type { AppDef } from './apps';

export interface WindowState {
  id: string;
  app: AppDef;
  x: number;
  y: number;
  w: number;
  h: number;
  minimized: boolean;
  maximized: boolean;
  snapZone: SnapZone;
  preSnapX?: number;
  preSnapY?: number;
  preSnapW?: number;
  preSnapH?: number;
  zIndex: number;
  browserUrl?: string;
  fileId?: string;
}

export const MIN_W_PX = 320;
export const MIN_H_PX = 200;
export const SNAP_EDGE_PX = 16;

export type SnapZone = 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'fullscreen' | null;

export type DragMode =
  | { kind: 'move'; id: string; offsetX: number; offsetY: number; startX?: number; startY?: number; originX?: number; originY?: number; originW?: number; originH?: number; currentX?: number; currentY?: number }
  | { kind: 'resize'; id: string; edge: string; startX: number; startY: number; startW: number; startH: number; startWX: number; startWY: number; currentX?: number; currentY?: number; currentW?: number; currentH?: number };

export const SNAP_ZONES: { test: (px: number, py: number) => boolean; zone: NonNullable<SnapZone> }[] = [
  { zone: 'top-left',     test: (px, py) => px <= SNAP_EDGE_PX && py <= SNAP_EDGE_PX },
  { zone: 'top-right',    test: (px, py) => px >= 100 - SNAP_EDGE_PX && py <= SNAP_EDGE_PX },
  { zone: 'bottom-left',  test: (px, py) => px <= SNAP_EDGE_PX && py >= 100 - SNAP_EDGE_PX },
  { zone: 'bottom-right', test: (px, py) => px >= 100 - SNAP_EDGE_PX && py >= 100 - SNAP_EDGE_PX },
  { zone: 'fullscreen',   test: (_px, py) => py <= 5 },
  { zone: 'left',         test: (px) => px <= 3 },
  { zone: 'right',        test: (px) => px >= 97 },
];

export const SNAP_RECTS: Record<NonNullable<SnapZone>, { left: string; top: string; width: string; height: string }> = {
  'fullscreen':   { left: '0',   top: '0',   width: '100%', height: '100%' },
  'left':         { left: '0',   top: '0',   width: '50%',  height: '100%' },
  'right':        { left: '50%', top: '0',   width: '50%',  height: '100%' },
  'top-left':     { left: '0',   top: '0',   width: '50%',  height: '50%' },
  'top-right':    { left: '50%', top: '0',   width: '50%',  height: '50%' },
  'bottom-left':  { left: '0',   top: '50%', width: '50%',  height: '50%' },
  'bottom-right': { left: '50%', top: '50%', width: '50%',  height: '50%' },
};

export function detectSnap(cursorX: number, cursorY: number, container: DOMRect): SnapZone {
  const px = ((cursorX - container.left) / container.width) * 100;
  const py = ((cursorY - container.top) / container.height) * 100;
  for (const { test, zone } of SNAP_ZONES) {
    if (test(px, py)) return zone;
  }
  return null;
}
