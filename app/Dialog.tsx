'use client';

import type { ReactNode } from 'react';

export interface DialogButton {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'primary';
}

interface DialogProps {
  title: string;
  children: ReactNode;
  buttons: DialogButton[];
  onClose: () => void;
  modal?: boolean;
}

const VARIANT_CLASS: Record<NonNullable<DialogButton['variant']>, string> = {
  default: 'bg-zinc-700 text-white/80 hover:bg-zinc-600',
  danger: 'bg-red-800/80 text-white/80 hover:bg-red-700/80',
  primary: 'bg-blue-700/80 text-white/80 hover:bg-blue-600/80',
};

export default function Dialog({ title, children, buttons, onClose, modal }: DialogProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 20000 }}>
      <div className="absolute inset-0 bg-black/40" onClick={modal ? undefined : onClose} />
      <div
        className="relative w-80 rounded-lg shadow-2xl overflow-hidden"
        style={{ background: '#2a2a3a', border: '1px solid rgba(255,255,255,0.15)' }}
      >
        <div className="flex items-center px-3 py-2 bg-zinc-800 border-b border-zinc-700">
          <span className="text-xs text-white/80 font-bold flex-1">{title}</span>
        </div>
        <div className="px-4 py-4">
          {children}
        </div>
        <div className="flex justify-end gap-1.5 px-3 py-2 border-t border-zinc-700">
          {buttons.map((btn, i) => (
            <button
              key={i}
              onClick={btn.onClick}
              className={`px-3 py-1 rounded text-xs ${VARIANT_CLASS[btn.variant ?? 'default']}`}
            >{btn.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
