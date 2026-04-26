'use client';

import type { FSNode } from './fileSystem';
import type { SortKey } from './constants';

interface ContextMenuProps {
  x: number;
  y: number;
  node?: FSNode;
  currentFolder: string;
  isDesktop: boolean;
  autoArrange: boolean;
  desktopSort: SortKey;
  explorerSort: SortKey | null;
  subMenu: 'create' | 'sort' | null;
  onClose: () => void;
  onOpen: (node: FSNode) => void;
  onDelete: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onRename: (node: FSNode) => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onEmptyTrash: () => void;
  onToggleAutoArrange: () => void;
  onDesktopSort: (key: SortKey) => void;
  onExplorerSort: (key: SortKey) => void;
  onRefresh: () => void;
  onSubMenu: (menu: 'create' | 'sort' | null) => void;
}

const SORT_LABELS: Record<SortKey, string> = { name: '이름순', type: '유형순', date: '날짜순' };

export default function ContextMenu({
  x, y, node, currentFolder, isDesktop,
  autoArrange, desktopSort, explorerSort, subMenu,
  onClose, onOpen, onDelete, onPermanentDelete, onRestore, onRename,
  onNewFile, onNewFolder, onEmptyTrash,
  onToggleAutoArrange, onDesktopSort, onExplorerSort, onRefresh, onSubMenu,
}: ContextMenuProps) {
  const menuStyle = {
    left: x, top: y,
    background: '#2a2a3a',
    border: '1px solid rgba(255,255,255,0.12)',
    zIndex: 10000,
    minWidth: 140,
  };
  const subStyle = { background: '#2a2a3a', border: '1px solid rgba(255,255,255,0.12)', minWidth: 100 };
  const btn = 'w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10';
  const btnDanger = 'w-full text-left px-3 py-1.5 text-xs text-red-400/70 hover:bg-white/10';
  const sep = <div className="border-t border-white/10 my-0.5" />;

  if (!node && currentFolder === 'trash') {
    return (
      <div className="fixed rounded shadow-xl" style={menuStyle} onClick={e => e.stopPropagation()}>
        <button onClick={onEmptyTrash} className={btnDanger}>휴지통 비우기</button>
      </div>
    );
  }

  if (node) {
    if (node.id === 'trash') return (
      <div className="fixed rounded shadow-xl" style={menuStyle} onClick={e => e.stopPropagation()}>
        <button onClick={() => onOpen(node)} className={btn}>열기</button>
        {sep}
        <button onClick={onEmptyTrash} className={btnDanger}>휴지통 비우기</button>
      </div>
    );
    if (currentFolder === 'trash') return (
      <div className="fixed rounded shadow-xl" style={menuStyle} onClick={e => e.stopPropagation()}>
        <button onClick={() => onRestore(node.id)} className={btn}>복원</button>
        {sep}
        <button onClick={() => onPermanentDelete(node.id)} className={btnDanger}>완전 삭제</button>
      </div>
    );
    return (
      <div className="fixed rounded shadow-xl" style={menuStyle} onClick={e => e.stopPropagation()}>
        <button onClick={() => onOpen(node)} className={btn}>열기</button>
        {node.type !== 'app' && (<>
          <button onClick={() => onRename(node)} className={btn}>이름 변경</button>
          {sep}
          <button onClick={() => onDelete(node.id)} className={btnDanger}>삭제</button>
        </>)}
      </div>
    );
  }

  const sortSub = (current: SortKey | null, onSort: (k: SortKey) => void) => (
    <div className="absolute left-full top-0 rounded shadow-xl overflow-hidden" style={subStyle}>
      {(['name', 'type', 'date'] as SortKey[]).map(k => (
        <button key={k} onClick={() => onSort(k)} className={btn}>
          {current === k ? '✓ ' : '   '}{SORT_LABELS[k]}
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed rounded shadow-xl" style={menuStyle} onClick={e => e.stopPropagation()}>
      <div className="relative" onMouseEnter={() => onSubMenu('create')} onMouseLeave={() => onSubMenu(null)}>
        <button className={`${btn} flex justify-between items-center`}>
          새로 만들기 <span className="text-[10px] text-white/40">▶</span>
        </button>
        {subMenu === 'create' && (
          <div className="absolute left-full top-0 rounded shadow-xl overflow-hidden" style={{ ...subStyle, minWidth: 120 }}>
            <button onClick={onNewFile} className={btn}>텍스트 파일</button>
            <button onClick={onNewFolder} className={btn}>폴더</button>
          </div>
        )}
      </div>
      {sep}
      {isDesktop ? (<>
        <button onClick={onToggleAutoArrange} className={btn}>
          {autoArrange ? '✓ ' : '   '}자동 정렬
        </button>
        <div className="relative" onMouseEnter={() => onSubMenu('sort')} onMouseLeave={() => onSubMenu(null)}>
          <button className={`${btn} flex justify-between items-center`}>
            정렬 기준 <span className="text-[10px] text-white/40">▶</span>
          </button>
          {subMenu === 'sort' && sortSub(desktopSort, onDesktopSort)}
        </div>
        <button onClick={onRefresh} className={btn}>새로고침</button>
      </>) : (
        <div className="relative" onMouseEnter={() => onSubMenu('sort')} onMouseLeave={() => onSubMenu(null)}>
          <button className={`${btn} flex justify-between items-center`}>
            정렬 기준 <span className="text-[10px] text-white/40">▶</span>
          </button>
          {subMenu === 'sort' && sortSub(explorerSort, onExplorerSort)}
        </div>
      )}
    </div>
  );
}
