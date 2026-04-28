'use client';

import { useState, useEffect } from 'react';

function getStorageUsage(): { used: number; max: number } {
  if (typeof window === 'undefined') return { used: 0, max: 5 * 1024 * 1024 };
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) total += key.length + (localStorage.getItem(key)?.length ?? 0);
  }
  return { used: total * 2, max: 5 * 1024 * 1024 };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function MyComputer() {
  const [storage, setStorage] = useState({ used: 0, max: 5 * 1024 * 1024 });

  useEffect(() => {
    setStorage(getStorageUsage());
  }, []);

  const pct = Math.min(100, (storage.used / storage.max) * 100);

  return (
    <div className="h-full bg-zinc-900 flex flex-col text-zinc-300 text-sm">
      <div className="px-4 py-3 border-b border-zinc-700">
        <span className="font-medium">My Computer</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          <div className="text-xs text-zinc-500">System</div>
          <div className="bg-zinc-800 rounded p-3 space-y-1">
            <div className="flex justify-between"><span className="text-zinc-400">OS</span><span>FeTreeOS</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Version</span><span>{process.env.APP_VERSION}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Engine</span><span>Next.js + React</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Platform</span><span>{typeof navigator !== 'undefined' ? navigator.platform : '-'}</span></div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-zinc-500">Storage (localStorage)</div>
          <div className="bg-zinc-800 rounded p-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-zinc-400">Used</span>
              <span>{formatBytes(storage.used)} / {formatBytes(storage.max)}</span>
            </div>
            <div className="w-full h-2 bg-zinc-700 rounded overflow-hidden">
              <div
                className={`h-full rounded ${pct > 80 ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="text-xs text-zinc-500">{pct.toFixed(1)}% used</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-zinc-500">Browser</div>
          <div className="bg-zinc-800 rounded p-3 space-y-1">
            <div className="flex justify-between"><span className="text-zinc-400">User Agent</span></div>
            <div className="text-xs text-zinc-500 break-all">{typeof navigator !== 'undefined' ? navigator.userAgent : '-'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
