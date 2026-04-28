'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getNode, updateNode, createFile, getFilesByExtension, type FSNode } from './fileSystem';

interface NotepadProps {
  fileId?: string;
  onFSChange?: () => void;
}

export default function Notepad({ fileId, onFSChange }: NotepadProps) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('새 메모.txt');
  const [currentFileId, setCurrentFileId] = useState<string | null>(fileId ?? null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [openDialog, setOpenDialog] = useState(false);
  const [txtFiles, setTxtFiles] = useState<FSNode[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (fileId) {
      const node = getNode(fileId);
      if (node) {
        setCurrentFileId(node.id);
        setTitle(node.name);
        setContent(node.content ?? '');
      }
    }
  }, [fileId]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [menuOpen]);

  const handleAutoSave = useCallback(() => {
    if (currentFileId) updateNode(currentFileId, { content, name: title });
  }, [currentFileId, content, title]);

  const handleSave = useCallback(() => {
    if (currentFileId) {
      updateNode(currentFileId, { content, name: title });
    } else {
      const node = createFile('desktop', title, content);
      setCurrentFileId(node.id);
      onFSChange?.();
    }
  }, [currentFileId, content, title, onFSChange]);

  const handleNew = useCallback(() => {
    if (currentFileId) updateNode(currentFileId, { content, name: title });
    setCurrentFileId(null);
    setTitle('새 메모.txt');
    setContent('');
    setMenuOpen(null);
  }, [currentFileId, content, title]);

  const showOpenDialog = useCallback(() => {
    if (currentFileId) updateNode(currentFileId, { content, name: title });
    setTxtFiles(getFilesByExtension('.txt'));
    setOpenDialog(true);
    setMenuOpen(null);
  }, [currentFileId, content, title]);

  const handleOpen = useCallback((node: FSNode) => {
    setCurrentFileId(node.id);
    setTitle(node.name);
    setContent(node.content ?? '');
    setOpenDialog(false);
  }, []);

  return (
    <div className="flex flex-col h-full relative">
      <div ref={menuRef} className={`flex items-center gap-1 px-2 py-1 border-b text-xs ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-zinc-200 border-zinc-300 text-zinc-600'}`}>
        <div className="relative">
          <span
            className={`px-1 cursor-default ${menuOpen === 'file' ? 'text-white bg-white/10 rounded' : 'hover:text-white'}`}
            onClick={() => setMenuOpen(v => v === 'file' ? null : 'file')}
          >File</span>
          {menuOpen === 'file' && (
            <div
              className="absolute top-full left-0 mt-0.5 w-40 rounded shadow-xl overflow-hidden"
              style={{ background: '#2a2a3a', border: '1px solid rgba(255,255,255,0.12)', zIndex: 100 }}
            >
              <button onClick={handleNew} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">New</button>
              <button onClick={showOpenDialog} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">Open...</button>
              <button onClick={() => { handleSave(); setMenuOpen(null); }} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">Save</button>
            </div>
          )}
        </div>
        <span className="hover:text-white cursor-default px-1">Edit</span>
        <div className="relative">
          <span
            className={`px-1 cursor-default ${menuOpen === 'theme' ? 'text-white bg-white/10 rounded' : 'hover:text-white'}`}
            onClick={() => setMenuOpen(v => v === 'theme' ? null : 'theme')}
          >Theme</span>
          {menuOpen === 'theme' && (
            <div
              className="absolute top-full left-0 mt-0.5 w-40 rounded shadow-xl overflow-hidden"
              style={{ background: '#2a2a3a', border: '1px solid rgba(255,255,255,0.12)', zIndex: 100 }}
            >
              <button onClick={() => { setTheme('dark'); setMenuOpen(null); }} className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 ${theme === 'dark' ? 'text-white' : 'text-white/50'}`}>
                {theme === 'dark' ? '● ' : '○ '}Dark
              </button>
              <button onClick={() => { setTheme('light'); setMenuOpen(null); }} className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 ${theme === 'light' ? 'text-white' : 'text-white/50'}`}>
                {theme === 'light' ? '● ' : '○ '}Light
              </button>
            </div>
          )}
        </div>
        <div className="flex-1" />
      </div>
      <div className={`flex items-center px-3 py-1 border-b ${theme === 'dark' ? 'border-zinc-700' : 'border-zinc-300'}`} style={{ background: theme === 'dark' ? '#1e1e2a' : '#f0f0f0' }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleAutoSave}
          className={`flex-1 bg-transparent text-xs outline-none ${theme === 'dark' ? 'text-white/70' : 'text-zinc-800'}`}
          placeholder="제목 없음"
        />
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleAutoSave}
        className={`flex-1 text-xs p-3 outline-none resize-none font-mono leading-relaxed ${theme === 'dark' ? 'bg-zinc-950 text-zinc-300' : 'bg-white text-zinc-900'}`}
        spellCheck={false}
      />

      {/* Open File Dialog */}
      {openDialog && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 200 }}>
          <div
            className="w-72 max-h-64 rounded-lg overflow-hidden flex flex-col shadow-2xl"
            style={{ background: '#2a2a3a', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 border-b border-zinc-700">
              <span className="text-xs text-white/80 font-bold">Open</span>
              <button onClick={() => setOpenDialog(false)} className="text-white/40 hover:text-white text-xs">✕</button>
            </div>
            <div className="flex-1 overflow-auto p-2">
              {txtFiles.length === 0 ? (
                <div className="text-xs text-zinc-500 text-center py-4">텍스트 파일이 없습니다</div>
              ) : (
                txtFiles.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleOpen(n)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded text-left hover:bg-white/10 ${n.id === currentFileId ? 'bg-white/5' : ''}`}
                  >
                    <span className="text-sm">📄</span>
                    <span className="text-xs text-white/70 truncate flex-1">{n.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
