'use client';

import { useState, useEffect } from 'react';
import { initDefaultFS } from './fileSystem';

const ICON_POS_KEY = 'fetree-icon-positions';

interface SettingsProps {
  onFSChange?: () => void;
}

export default function Settings({ onFSChange }: SettingsProps) {
  const [showGrid, setShowGrid] = useState(true);

  useEffect(() => {
    setShowGrid(localStorage.getItem('fetree-show-grid') !== 'false');
  }, []);

  const handleResetIcons = () => {
    localStorage.removeItem(ICON_POS_KEY);
    onFSChange?.();
  };

  const handleToggleGrid = () => {
    const next = !showGrid;
    setShowGrid(next);
    localStorage.setItem('fetree-show-grid', String(next));
    onFSChange?.();
  };

  const handleResetAll = () => {
    localStorage.removeItem('fetree-fs');
    localStorage.removeItem('fetree-fs-version');
    localStorage.removeItem(ICON_POS_KEY);
    localStorage.removeItem('fetree-show-grid');
    localStorage.removeItem('fetree-auto-arrange');
    localStorage.removeItem('fetree-desktop-sort');
    localStorage.removeItem('fetree-notes');
    initDefaultFS();
    onFSChange?.();
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      <div className="flex-1 overflow-auto p-4">
        <h2 className="text-sm font-bold text-white/80 mb-4">Settings</h2>

        <div className="space-y-3">
          <Section title="바탕화면">
            <SettingRow
              label="아이콘 위치 초기화"
              description="모든 아이콘을 기본 위치로 되돌립니다"
            >
              <button
                onClick={handleResetIcons}
                className="px-3 py-1 rounded text-xs bg-zinc-700 text-white/70 hover:bg-zinc-600"
              >초기화</button>
            </SettingRow>
            <SettingRow
              label="그리드 표시"
              description="바탕화면 격자 가이드라인"
            >
              <button
                onClick={handleToggleGrid}
                className={`w-10 h-5 rounded-full transition-colors relative ${showGrid ? 'bg-blue-500' : 'bg-zinc-600'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${showGrid ? 'left-5' : 'left-0.5'}`} />
              </button>
            </SettingRow>
          </Section>

          <Section title="시스템">
            <SettingRow
              label="모든 데이터 초기화"
              description="파일 시스템, 아이콘 위치, 설정을 모두 삭제합니다"
              danger
            >
              <button
                onClick={handleResetAll}
                className="px-3 py-1 rounded text-xs bg-red-900/50 text-red-400 hover:bg-red-900/80"
              >전체 초기화</button>
            </SettingRow>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">{title}</h3>
      <div className="rounded-lg overflow-hidden border border-zinc-700/50">
        {children}
      </div>
    </div>
  );
}

function SettingRow({ label, description, danger, children }: {
  label: string;
  description?: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 bg-zinc-800/50 border-b border-zinc-700/30 last:border-b-0">
      <div>
        <div className={`text-xs ${danger ? 'text-red-400/80' : 'text-white/70'}`}>{label}</div>
        {description && <div className="text-[10px] text-zinc-500 mt-0.5">{description}</div>}
      </div>
      {children}
    </div>
  );
}
