'use client';

import Dialog from './Dialog';
import { getIconForNode, getPath, type FSNode } from './fileSystem';

function formatDate(ts?: number): string {
  if (!ts) return '-';
  const d = new Date(ts);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

const TYPE_LABELS: Record<string, string> = { folder: '폴더', file: '파일', app: '앱', system: '시스템' };

interface PropertiesDialogProps {
  node: FSNode;
  isInTrash: boolean;
  onClose: () => void;
  onRestore?: (id: string) => void;
}

export default function PropertiesDialog({ node, isInTrash, onClose, onRestore }: PropertiesDialogProps) {
  const typeLabel = TYPE_LABELS[node.type] ?? node.type;
  const locationPath = isInTrash
    ? (node.deletedFrom ? getPath(node.deletedFrom).map(s => s.name).join(' > ') : 'Desktop')
    : getPath(node.parentId).map(s => s.name).join(' > ');
  const buttons = isInTrash && onRestore
    ? [{ label: '복원', variant: 'primary' as const, onClick: () => onRestore(node.id) }, { label: '닫기', onClick: onClose }]
    : [{ label: '확인', onClick: onClose }];

  return (
    <Dialog title={`${node.name} 속성`} onClose={onClose} buttons={buttons}>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-700">
        <span className="text-2xl">{getIconForNode(node)}</span>
        <span className="text-sm text-white/90 font-medium truncate">{node.name}</span>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
        <span className="text-white/40">종류:</span>
        <span className="text-white/70">{typeLabel}{node.extension ? ` (${node.extension})` : ''}</span>
        <span className="text-white/40">{isInTrash ? '원본:' : '위치:'}</span>
        <span className="text-white/70 truncate">{locationPath}</span>
        {isInTrash && (<>
          <span className="text-white/40 mt-2">삭제한 날짜:</span>
          <span className="text-white/70 mt-2">{formatDate(node.deletedAt)}</span>
        </>)}
        <span className={`text-white/40 ${!isInTrash ? 'mt-2' : ''}`}>만든 날짜:</span>
        <span className={`text-white/70 ${!isInTrash ? 'mt-2' : ''}`}>{formatDate(node.createdAt)}</span>
        <span className="text-white/40">수정한 날짜:</span>
        <span className="text-white/70">{formatDate(node.updatedAt)}</span>
      </div>
    </Dialog>
  );
}
