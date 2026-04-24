'use client';

import { useEffect, useRef } from 'react';

export interface MenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [onClose]);

  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const el = ref.current;
    if (rect.right > window.innerWidth) el.style.left = `${x - rect.width}px`;
    if (rect.bottom > window.innerHeight) el.style.top = `${y - rect.height}px`;
  }, [x, y]);

  return (
    <div
      ref={ref}
      className="fixed rounded shadow-2xl overflow-hidden"
      style={{
        left: x,
        top: y,
        background: 'linear-gradient(180deg, #2e2e40 0%, #1e1e30 100%)',
        border: '1px solid rgba(255,255,255,0.12)',
        zIndex: 10000,
        minWidth: 160,
      }}
    >
      {items.map((item, i) => (
        <div key={i}>
          {item.divider && <div className="border-t border-white/10 my-0.5" />}
          <button
            onClick={() => { item.onClick(); onClose(); }}
            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 ${
              item.danger ? 'text-red-400/80' : 'text-white/70'
            }`}
          >{item.label}</button>
        </div>
      ))}
    </div>
  );
}
