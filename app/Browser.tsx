'use client';

import { useState } from 'react';

const GAMES_DATA: Record<string, { title: string; embedUrl: string }> = {
  'dog-ninja': { title: 'Dog Ninja', embedUrl: 'https://www.youtube.com/embed/iofYDsA2yqg' },
  'demo-platformer': { title: 'Demo Platformer', embedUrl: 'https://www.youtube.com/embed/yQxwbZsL14Y' },
  'puzzle-box': { title: 'Puzzle Box', embedUrl: 'https://www.youtube.com/embed/VoiaFMeS4Ok' },
  'arcade-rush': { title: 'Arcade Rush', embedUrl: 'https://www.youtube.com/embed/wTXJ2SgIymo' },
  'tiny-rpg': { title: 'Tiny RPG', embedUrl: 'https://www.youtube.com/embed/t0Rxxk3fpOo' },
  'grid-tactics': { title: 'Grid Tactics', embedUrl: 'https://www.youtube.com/embed/_vUD2SZVX0A' },
};

interface BrowserProps {
  winId: string;
  browserUrl: string;
  active: boolean;
  onNavigate: (id: string, url: string) => void;
}

export default function Browser({ winId, browserUrl, active, onNavigate }: BrowserProps) {
  const [addressBar, setAddressBar] = useState(browserUrl || '');
  const currentSlug = browserUrl?.replace('/games/', '') || '';
  const game = GAMES_DATA[currentSlug];

  const navigate = (url: string) => {
    setAddressBar(url);
    onNavigate(winId, url);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      <div className="flex items-center gap-1 px-2 py-1 bg-zinc-800 border-b border-zinc-700">
        <button
          onClick={() => navigate('')}
          className="w-6 h-6 rounded text-xs text-zinc-400 hover:bg-zinc-700 flex items-center justify-center"
        >⌂</button>
        <div className="flex-1 flex">
          <input
            value={addressBar}
            onChange={(e) => setAddressBar(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate(addressBar); }}
            className="flex-1 h-6 px-2 text-xs bg-zinc-900 border border-zinc-600 rounded-l text-white outline-none"
            placeholder="Enter address..."
          />
          <button
            onClick={() => navigate(addressBar)}
            className="h-6 px-2 bg-zinc-700 border border-l-0 border-zinc-600 rounded-r text-xs text-zinc-300 hover:bg-zinc-600"
          >Go</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {game ? (
          <div className="p-4">
            <h1 className="text-lg font-bold mb-3">{game.title}</h1>
            <div className="aspect-video bg-black rounded overflow-hidden mb-3">
              <iframe src={game.embedUrl} className="w-full h-full" allowFullScreen style={{ pointerEvents: active ? 'auto' : 'none' }} />
            </div>
            <button onClick={() => navigate('')} className="text-xs text-blue-400 hover:underline">← Back to list</button>
          </div>
        ) : (
          <div className="p-4">
            <h2 className="text-sm font-bold text-zinc-300 mb-3">Games</h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(GAMES_DATA).map(([slug, g]) => (
                <button
                  key={slug}
                  onClick={() => navigate(`/games/${slug}`)}
                  className="flex items-center gap-2 p-2 rounded hover:bg-zinc-800 text-left transition-colors"
                >
                  <span className="text-lg">🎮</span>
                  <span className="text-xs text-zinc-300">{g.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
