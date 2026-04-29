'use client';

import { APPS, type AppDef } from './apps';
import Clock from './Clock';
import type { WindowState } from './windowTypes';

interface TaskbarProps {
  windows: WindowState[];
  focusedId: string | null;
  startMenuOpen: boolean;
  onStartToggle: () => void;
  onWindowClick: (id: string, minimized: boolean, isTop: boolean) => void;
  onOpenApp: (app: AppDef) => void;
}

export default function Taskbar({
  windows, focusedId, startMenuOpen,
  onStartToggle, onWindowClick, onOpenApp,
}: TaskbarProps) {
  return (
    <>
      <div
        className="h-10 flex items-center px-2 gap-1 shrink-0"
        style={{ background: 'linear-gradient(180deg, #2a2a3a 0%, #1a1a2a 100%)', borderTop: '1px solid rgba(255,255,255,0.1)' }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onStartToggle(); }}
          className="h-7 px-3 rounded flex items-center gap-1.5 text-xs text-white/90 hover:bg-white/10 transition-colors"
          style={{ background: startMenuOpen ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)' }}
        >
          <span className="text-sm">◆</span>
          <span className="font-bold">Start</span>
        </button>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <div className="flex-1 flex gap-1 overflow-hidden">
          {windows.map(win => {
            const isTop = win.id === focusedId;
            return (
              <button
                key={win.id}
                onClick={() => onWindowClick(win.id, win.minimized, isTop)}
                className={`h-7 px-3 rounded flex items-center gap-1.5 text-xs transition-colors max-w-[160px] ${isTop && !win.minimized ? 'text-white/90' : 'text-white/50'}`}
                style={{
                  background: isTop && !win.minimized ? 'rgba(255,255,255,0.15)' : win.minimized ? 'transparent' : 'rgba(255,255,255,0.06)',
                  borderBottom: isTop && !win.minimized ? '2px solid rgba(120,140,255,0.6)' : '2px solid transparent',
                }}
              >
                <span className="text-sm">{win.app.icon}</span>
                <span className="truncate">{win.app.title}</span>
              </button>
            );
          })}
        </div>
        <Clock />
      </div>

      {startMenuOpen && (
        <div
          className="absolute bottom-10 left-2 w-56 rounded-lg overflow-hidden shadow-2xl"
          style={{ background: 'linear-gradient(180deg, #2e2e40 0%, #1e1e30 100%)', border: '1px solid rgba(255,255,255,0.12)', zIndex: 9999 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-2 border-b border-white/10">
            <span className="text-xs text-white/40 px-2">Applications</span>
          </div>
          <div className="p-1">
            {APPS.map(app => (
              <button
                key={app.id}
                onClick={() => onOpenApp(app)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-white/10 transition-colors"
              >
                <span className="text-lg">{app.icon}</span>
                <span className="text-sm text-white/80">{app.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
