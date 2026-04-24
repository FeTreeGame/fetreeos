'use client';

import { useState, useEffect, useCallback } from 'react';
import { loadNotes, saveNote, deleteNote, type Note } from './noteStore';
import { SAMPLE_NOTE } from './sampleNotes';

interface NotepadProps {
  initialNoteId?: string;
}

export default function Notepad({ initialNoteId }: NotepadProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(initialNoteId ?? null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    const loaded = loadNotes();
    if (loaded.length === 0) {
      const sample: Note = { id: 'sample', title: '인터렉티브 평원 설계서', content: SAMPLE_NOTE, updatedAt: Date.now() };
      saveNote(sample);
      loaded.push(sample);
    }
    setNotes(loaded);
    const target = loaded.find(n => n.id === initialNoteId) ?? loaded[0];
    if (target) {
      setActiveId(target.id);
      setTitle(target.title);
      setContent(target.content);
    }
  }, [initialNoteId]);

  const refresh = useCallback(() => {
    setNotes(loadNotes());
  }, []);

  const handleSave = useCallback(() => {
    if (!activeId) return;
    const note: Note = { id: activeId, title, content, updatedAt: Date.now() };
    saveNote(note);
    refresh();
  }, [activeId, title, content, refresh]);

  const handleNew = useCallback(() => {
    const id = `note-${Date.now()}`;
    const note: Note = { id, title: '새 메모', content: '', updatedAt: Date.now() };
    saveNote(note);
    setActiveId(id);
    setTitle(note.title);
    setContent(note.content);
    setShowList(false);
    refresh();
  }, [refresh]);

  const handleOpen = useCallback((note: Note) => {
    if (activeId) {
      saveNote({ id: activeId, title, content, updatedAt: Date.now() });
    }
    setActiveId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setShowList(false);
    refresh();
  }, [activeId, title, content, refresh]);

  const handleDelete = useCallback((id: string) => {
    deleteNote(id);
    const remaining = loadNotes();
    setNotes(remaining);
    if (activeId === id) {
      if (remaining.length > 0) {
        setActiveId(remaining[0].id);
        setTitle(remaining[0].title);
        setContent(remaining[0].content);
      } else {
        handleNew();
      }
    }
  }, [activeId, handleNew]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-2 py-1 bg-zinc-800 border-b border-zinc-700 text-xs text-zinc-400">
        <div className="relative">
          <span className="hover:text-white cursor-default px-1" onClick={() => setShowList(v => !v)}>File</span>
          {showList && (
            <div
              className="absolute top-full left-0 mt-0.5 w-48 rounded shadow-xl overflow-hidden"
              style={{ background: '#2a2a3a', border: '1px solid rgba(255,255,255,0.12)', zIndex: 100 }}
            >
              <button onClick={handleNew} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">New</button>
              <button onClick={handleSave} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">Save</button>
              <div className="border-t border-white/10 my-0.5" />
              {notes.map(n => (
                <div key={n.id} className="flex items-center group">
                  <button
                    onClick={() => handleOpen(n)}
                    className={`flex-1 text-left px-3 py-1.5 text-xs truncate ${n.id === activeId ? 'text-blue-400' : 'text-white/60'} hover:bg-white/10`}
                  >{n.title}</button>
                  {notes.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                      className="px-2 text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100"
                    >✕</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <span className="hover:text-white cursor-default px-1">Edit</span>
        <span className="hover:text-white cursor-default px-1">Format</span>
        <div className="flex-1" />
        <button onClick={handleSave} className="px-1.5 py-0.5 rounded text-[10px] text-white/40 hover:text-white/70 hover:bg-white/10">Save</button>
      </div>
      <div className="flex items-center px-3 py-1 bg-zinc-850 border-b border-zinc-700">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSave}
          className="flex-1 bg-transparent text-xs text-white/70 outline-none"
          placeholder="제목 없음"
        />
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleSave}
        className="flex-1 bg-zinc-950 text-zinc-300 text-xs p-3 outline-none resize-none font-mono leading-relaxed"
        spellCheck={false}
      />
    </div>
  );
}
