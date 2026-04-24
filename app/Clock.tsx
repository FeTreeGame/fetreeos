'use client';

import { useState, useEffect, useRef } from 'react';

export default function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!calendarOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [calendarOpen]);

  if (!now) return <div className="text-xs text-white/50 px-2">--:--</div>;

  const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const dateStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setCalendarOpen(v => !v); }}
        className="h-7 px-2 rounded flex flex-col items-end justify-center hover:bg-white/10 transition-colors"
      >
        <span className="text-xs text-white/50 leading-tight">{timeStr}</span>
        <span className="text-[10px] text-white/35 leading-tight">{dateStr}</span>
      </button>

      {calendarOpen && (
        <div
          className="absolute bottom-10 right-0 w-64 rounded-lg overflow-hidden shadow-2xl"
          style={{ background: 'linear-gradient(180deg, #2e2e40 0%, #1e1e30 100%)', border: '1px solid rgba(255,255,255,0.12)', zIndex: 9999 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-3 border-b border-white/10">
            <div className="text-sm text-white/90 font-bold">{monthLabel}</div>
            <div className="text-xs text-white/40 mt-0.5">{dateStr}</div>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-white/40 mb-1">
              {['일','월','화','수','목','금','토'].map(d => <span key={d}>{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
              {cells.map((d, i) => (
                <span
                  key={i}
                  className={`h-7 flex items-center justify-center rounded ${
                    d === today ? 'bg-blue-500/80 text-white font-bold' : d ? 'text-white/60' : ''
                  }`}
                >
                  {d ?? ''}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
