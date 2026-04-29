'use client';

import { useState, useCallback, useRef, type RefObject, type SetStateAction, type Dispatch } from 'react';
import { MIN_W_PX, MIN_H_PX, SNAP_RECTS, detectSnap, type WindowState, type DragMode } from './windowTypes';

interface UseWindowDragOptions {
  windows: WindowState[];
  setWindows: Dispatch<SetStateAction<WindowState[]>>;
  rootRef: RefObject<HTMLDivElement | null>;
  desktopRef: RefObject<HTMLDivElement | null>;
  focusWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
}

export default function useWindowDrag({
  windows, setWindows, rootRef, desktopRef, focusWindow, toggleMaximize,
}: UseWindowDragOptions) {
  const dragRef = useRef<DragMode | null>(null);
  const [dragging, setDragging] = useState<{ kind: 'move' | 'resize'; id: string; edge?: string } | null>(null);
  const snapPreviewRef = useRef<HTMLDivElement>(null);
  const lastTitleClick = useRef<{ id: string; time: number }>({ id: '', time: 0 });
  const suppressDesktopBlur = useRef(false);

  const handleSnapRestore = useCallback((id: string, e: React.PointerEvent, preSnapW?: number, preSnapH?: number) => {
    const desktop = desktopRef.current;
    if (!desktop) return;
    const dr = desktop.getBoundingClientRect();
    const restoreW = preSnapW ?? 0.4;
    const restoreH = preSnapH ?? 0.35;
    const cx = (e.clientX - dr.left) / dr.width;
    const cy = (e.clientY - dr.top) / dr.height;
    const newX = Math.max(0, Math.min(cx - restoreW / 2, 1 - restoreW));
    const newY = Math.max(0, Math.min(cy - 16 / dr.height, 1 - restoreH));
    const offsetX = (cx - newX) * dr.width;
    const offsetY = e.clientY - dr.top - newY * dr.height;
    setWindows(prev => prev.map(w => w.id === id ? {
      ...w, snapZone: null, maximized: false,
      x: newX, y: newY,
      w: restoreW, h: restoreH,
    } : w));
    rootRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { kind: 'move', id, offsetX, offsetY };
    setDragging({ kind: 'move', id });
  }, [desktopRef, rootRef, setWindows]);

  const handleTitlePointerDown = useCallback((id: string, e: React.PointerEvent) => {
    focusWindow(id);
    const now = Date.now();
    const last = lastTitleClick.current;
    if (last.id === id && now - last.time < 350) {
      lastTitleClick.current = { id: '', time: 0 };
      suppressDesktopBlur.current = true;
      setTimeout(() => { suppressDesktopBlur.current = false; }, 100);
      toggleMaximize(id);
      return;
    }
    lastTitleClick.current = { id, time: now };
    const winEl = document.getElementById(`win-${id}`);
    if (!winEl) return;
    const rect = winEl.getBoundingClientRect();
    rootRef.current?.setPointerCapture(e.pointerId);
    const w = windows.find(win => win.id === id);
    dragRef.current = { kind: 'move', id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top, startX: e.clientX, startY: e.clientY, originX: w?.x, originY: w?.y, originW: w?.w, originH: w?.h };
    setDragging({ kind: 'move', id });
  }, [focusWindow, toggleMaximize, windows, rootRef]);

  const handleResizePointerDown = useCallback((id: string, edge: string, e: React.PointerEvent) => {
    e.stopPropagation();
    focusWindow(id);
    rootRef.current?.setPointerCapture(e.pointerId);
    const w = windows.find(win => win.id === id);
    if (!w) return;
    dragRef.current = { kind: 'resize', id, edge, startX: e.clientX, startY: e.clientY, startW: w.w, startH: w.h, startWX: w.x, startWY: w.y };
    setDragging({ kind: 'resize', id, edge });
  }, [focusWindow, windows, rootRef]);

  const processMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const desktop = desktopRef.current;
    if (!desktop) return;
    const dr = desktop.getBoundingClientRect();

    if (d.kind === 'move') {
      if (d.startX != null && d.startY != null) {
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        if (dx * dx + dy * dy < 9) return;
        const win = windows.find(w => w.id === d.id);
        if (win && (win.snapZone || win.maximized)) {
          handleSnapRestore(d.id, e, win.preSnapW, win.preSnapH);
          return;
        }
        dragRef.current = { ...d, startX: undefined, startY: undefined };
      }
      let x = (e.clientX - dr.left - d.offsetX) / dr.width;
      let y = (e.clientY - dr.top - d.offsetY) / dr.height;
      x = Math.max(-0.2, Math.min(x, 1 - 80 / dr.width));
      y = Math.max(0, Math.min(y, 1 - 40 / dr.height));

      dragRef.current = { ...dragRef.current!, currentX: x, currentY: y };

      const el = document.getElementById(`win-${d.id}`);
      if (el) {
        el.style.left = `${x * 100}%`;
        el.style.top = `${y * 100}%`;
      }

      const snap = detectSnap(e.clientX, e.clientY, dr);
      const spEl = snapPreviewRef.current;
      if (spEl) {
        if (snap) {
          const rect = SNAP_RECTS[snap];
          spEl.style.display = 'block';
          spEl.style.left = rect.left;
          spEl.style.top = rect.top;
          spEl.style.width = rect.width;
          spEl.style.height = rect.height;
        } else {
          spEl.style.display = 'none';
        }
      }
    } else {
      const dx = (e.clientX - d.startX) / dr.width;
      const dy = (e.clientY - d.startY) / dr.height;
      const minW = MIN_W_PX / dr.width;
      const minH = MIN_H_PX / dr.height;

      let newX = d.startWX, newY = d.startWY;
      let newW = d.startW, newH = d.startH;

      if (d.edge.includes('e')) newW = Math.max(minW, d.startW + dx);
      if (d.edge.includes('s')) newH = Math.max(minH, d.startH + dy);
      if (d.edge.includes('w')) {
        newW = Math.max(minW, d.startW - dx);
        newX = d.startWX + (d.startW - newW);
      }
      if (d.edge.includes('n')) {
        newH = Math.max(minH, d.startH - dy);
        newY = d.startWY + (d.startH - newH);
      }

      dragRef.current = { ...d, currentX: newX, currentY: newY, currentW: newW, currentH: newH };

      const el = document.getElementById(`win-${d.id}`);
      if (el) {
        el.style.left = `${newX * 100}%`;
        el.style.top = `${newY * 100}%`;
        el.style.width = `${newW * 100}%`;
        el.style.height = `${newH * 100}%`;
      }
    }
  }, [windows, desktopRef, handleSnapRestore]);

  const processUp = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const desktop = desktopRef.current;
    if (d.kind === 'move') {
      const snap = desktop ? detectSnap(e.clientX, e.clientY, desktop.getBoundingClientRect()) : null;
      if (snap) {
        setWindows(prev => prev.map(w => w.id === d.id ? {
          ...w,
          snapZone: snap,
          maximized: snap === 'fullscreen',
          preSnapX: w.snapZone ? w.preSnapX : (d.originX ?? w.x),
          preSnapY: w.snapZone ? w.preSnapY : (d.originY ?? w.y),
          preSnapW: w.snapZone ? w.preSnapW : (d.originW ?? w.w),
          preSnapH: w.snapZone ? w.preSnapH : (d.originH ?? w.h),
        } : w));
      } else if (d.currentX !== undefined && d.currentY !== undefined) {
        setWindows(prev => prev.map(w => w.id === d.id ? {
          ...w, x: d.currentX!, y: d.currentY!, maximized: false, snapZone: null,
        } : w));
      }
    } else {
      if (d.currentW !== undefined) {
        setWindows(prev => prev.map(w => w.id === d.id ? {
          ...w,
          x: d.currentX ?? w.x,
          y: d.currentY ?? w.y,
          w: d.currentW ?? w.w,
          h: d.currentH ?? w.h,
        } : w));
      }
    }
    if (rootRef.current && e.pointerId !== undefined && rootRef.current.hasPointerCapture(e.pointerId)) {
      rootRef.current.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
    setDragging(null);
    if (snapPreviewRef.current) snapPreviewRef.current.style.display = 'none';
  }, [desktopRef, rootRef, setWindows]);

  return {
    dragging,
    snapPreviewRef,
    suppressDesktopBlur,
    handleTitlePointerDown,
    handleResizePointerDown,
    processMove,
    processUp,
  };
}
