'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './lib/supabase';

interface Stroke {
  points: [number, number, number?][];
  color: string;
  width: number;
  isEraser?: boolean;
  filled?: boolean;
}

interface Artwork {
  id: string;
  strokes: Stroke[];
  bounds: { x: number; y: number; w: number; h: number };
  created_at: string;
}

function renderStrokes(canvas: HTMLCanvasElement, strokes: Stroke[], bounds: { x: number; y: number; w: number; h: number }) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const pad = 8;
  const scaleX = (canvas.width - pad * 2) / Math.max(bounds.w, 1);
  const scaleY = (canvas.height - pad * 2) / Math.max(bounds.h, 1);
  const scale = Math.min(scaleX, scaleY);
  const offX = pad + (canvas.width - pad * 2 - bounds.w * scale) / 2 - bounds.x * scale;
  const offY = pad + (canvas.height - pad * 2 - bounds.h * scale) / 2 - bounds.y * scale;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#faf8f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const stroke of strokes) {
    if (stroke.isEraser) continue;
    if (stroke.points.length < 2) continue;

    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    const [sx, sy] = stroke.points[0];
    ctx.moveTo(sx * scale + offX, sy * scale + offY);
    for (let i = 1; i < stroke.points.length; i++) {
      const [px, py] = stroke.points[i];
      ctx.lineTo(px * scale + offX, py * scale + offY);
    }

    if (stroke.filled) {
      ctx.fillStyle = stroke.color;
      ctx.closePath();
      ctx.fill();
    }
    ctx.stroke();
    ctx.restore();
  }
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function ArtworkCard({ artwork, onClick }: { artwork: Artwork; onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderStrokes(canvasRef.current, artwork.strokes, artwork.bounds);
    }
  }, [artwork]);

  return (
    <div className="flex flex-col gap-1" onClick={onClick}>
      <canvas
        ref={canvasRef}
        width={200}
        height={200}
        className="w-full aspect-square rounded border border-zinc-700 cursor-pointer hover:border-zinc-500 transition-colors"
      />
      <span className="text-xs text-zinc-500">{formatDate(artwork.created_at)}</span>
    </div>
  );
}

function DetailView({ artworks, index, onClose, onPrev, onNext }: {
  artworks: Artwork[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const artwork = artworks[index];

  useEffect(() => {
    if (canvasRef.current && artwork) {
      renderStrokes(canvasRef.current, artwork.strokes, artwork.bounds);
    }
  }, [artwork]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === 'ArrowRight') onNext();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onPrev, onNext, onClose]);

  if (!artwork) return null;

  return (
    <div className="absolute inset-0 bg-zinc-950/90 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs text-zinc-500">{index + 1} / {artworks.length}</span>
        <span className="text-xs text-zinc-500">{formatDate(artwork.created_at)}</span>
        <button onClick={onClose} className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700">Close</button>
      </div>
      <div className="flex-1 flex items-center justify-center gap-2 px-2 min-h-0">
        <button
          onClick={onPrev}
          disabled={index <= 0}
          className="shrink-0 w-8 h-8 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 disabled:opacity-20 disabled:cursor-default flex items-center justify-center"
        >&lt;</button>
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="max-w-full max-h-full aspect-square rounded border border-zinc-700"
        />
        <button
          onClick={onNext}
          disabled={index >= artworks.length - 1}
          className="shrink-0 w-8 h-8 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 disabled:opacity-20 disabled:cursor-default flex items-center justify-center"
        >&gt;</button>
      </div>
    </div>
  );
}

export default function Gallery() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewIndex, setViewIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('artworks')
      .select('id, strokes, bounds, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (err) {
      setError(err.message);
    } else {
      setArtworks(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const prev = useCallback(() => setViewIndex(i => i !== null && i > 0 ? i - 1 : i), []);
  const next = useCallback(() => setViewIndex(i => i !== null && i < artworks.length - 1 ? i + 1 : i), [artworks.length]);
  const close = useCallback(() => setViewIndex(null), []);

  return (
    <div className="h-full bg-zinc-900 flex flex-col relative">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700">
        <span className="text-sm text-zinc-300">Gallery — Interactive Plains</span>
        <button
          onClick={load}
          className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
        >
          Refresh
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {loading && (
          <div className="flex items-center justify-center h-32">
            <span className="text-zinc-500 text-sm">Loading...</span>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-32">
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}
        {!loading && !error && artworks.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <span className="text-zinc-500 text-sm">No artworks yet</span>
          </div>
        )}
        {!loading && !error && artworks.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {artworks.map((a, i) => <ArtworkCard key={a.id} artwork={a} onClick={() => setViewIndex(i)} />)}
          </div>
        )}
      </div>
      {viewIndex !== null && (
        <DetailView artworks={artworks} index={viewIndex} onClose={close} onPrev={prev} onNext={next} />
      )}
    </div>
  );
}
