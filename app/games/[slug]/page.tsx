import Link from "next/link";

const GAMES: Record<string, { title: string; category: string; description: string; embedUrl: string; thumbnail: string }> = {
  "dog-ninja": {
    title: "Dog Ninja",
    category: "Action",
    description: "Fast-paced action game built with Adobe Animate and ECS framework.",
    embedUrl: "https://www.youtube.com/embed/iofYDsA2yqg",
    thumbnail: "https://img.youtube.com/vi/iofYDsA2yqg/mqdefault.jpg",
  },
  "demo-platformer": {
    title: "Demo Platformer",
    category: "Platformer",
    description: "Classic 2D platformer with smooth controls.",
    embedUrl: "https://www.youtube.com/embed/yQxwbZsL14Y",
    thumbnail: "https://img.youtube.com/vi/yQxwbZsL14Y/mqdefault.jpg",
  },
  "puzzle-box": {
    title: "Puzzle Box",
    category: "Puzzle",
    description: "Brain teaser puzzles",
    embedUrl: "https://www.youtube.com/embed/VoiaFMeS4Ok",
    thumbnail: "https://img.youtube.com/vi/VoiaFMeS4Ok/mqdefault.jpg",
  },
  "arcade-rush": {
    title: "Arcade Rush",
    category: "Arcade",
    description: "Retro arcade action",
    embedUrl: "https://www.youtube.com/embed/wTXJ2SgIymo",
    thumbnail: "https://img.youtube.com/vi/wTXJ2SgIymo/mqdefault.jpg",
  },
  "tiny-rpg": {
    title: "Tiny RPG",
    category: "RPG",
    description: "Micro RPG adventure",
    embedUrl: "https://www.youtube.com/embed/t0Rxxk3fpOo",
    thumbnail: "https://img.youtube.com/vi/t0Rxxk3fpOo/mqdefault.jpg",
  },
  "grid-tactics": {
    title: "Grid Tactics",
    category: "Strategy",
    description: "Turn-based strategy",
    embedUrl: "https://www.youtube.com/embed/_vUD2SZVX0A",
    thumbnail: "https://img.youtube.com/vi/_vUD2SZVX0A/mqdefault.jpg",
  },
  "simmiland": {
    title: "Simmiland",
    category: "Strategy",
    description: "God-like card game by Sokpop",
    embedUrl: "https://itch.io/embed/292658",
    thumbnail: "https://img.itch.zone/aW1hZ2UvMjkyNjU4LzE0NzQ3MzAucG5n/original/f5ndB%2F.png",
  },
  "tavern-for-tea": {
    title: "A Tavern for Tea",
    category: "RPG",
    description: "Fantasy visual novel & tea-making sim",
    embedUrl: "https://itch.io/embed/475414",
    thumbnail: "https://img.itch.zone/aW1nLzExNDQ0MzQ1LnBuZw==/original/Sdr4QU.png",
  },
};

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = GAMES[slug];

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Game not found</h1>
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors">Back to home</Link>
        </div>
      </div>
    );
  }

  const otherGames = Object.entries(GAMES).filter(([s]) => s !== slug);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/60">
        <div className="flex h-14 items-center px-4 gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-emerald-600 text-xs font-bold text-white">F</div>
            <span className="font-bold text-lg hidden sm:block">FeTreeGame</span>
          </Link>
          <div className="flex-1 max-w-2xl mx-auto px-4">
            <div className="flex">
              <input
                type="text"
                placeholder="Search games..."
                className="w-full h-10 px-4 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-l-full text-white placeholder-zinc-500 outline-none focus:border-zinc-500 transition-colors"
              />
              <button className="h-10 w-16 bg-zinc-800 border border-l-0 border-zinc-700 rounded-r-full flex items-center justify-center hover:bg-zinc-700 transition-colors">
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content — YouTube Watch Layout (3:1 grid) */}
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left — Main (3/4) */}
          <div className="xl:col-span-3 space-y-4">
            {/* Game Embed */}
            <div className="aspect-video bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 overflow-hidden">
              {game.embedUrl ? (
                <iframe
                  src={game.embedUrl}
                  className="w-full h-full rounded-xl"
                  allowFullScreen
                />
              ) : (
                <span className="text-zinc-500">Game embed will appear here</span>
              )}
            </div>

            {/* Game Info */}
            <div>
              <h1 className="text-lg font-bold">{game.title}</h1>
              <div className="flex items-center gap-3 mt-2">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-500">
                  {game.title[0]}
                </div>
                <div>
                  <span className="text-sm text-zinc-300">FeTreeGame</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{game.category}</span>
                    <span className="text-xs text-zinc-500">{game.description}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments */}
            <section className="border-t border-zinc-800 pt-4">
              <h2 className="text-sm font-bold mb-3">Comments</h2>
              <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
                <textarea
                  placeholder="Leave a comment..."
                  className="w-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none resize-none"
                  rows={3}
                />
                <div className="flex justify-end mt-2">
                  <button className="px-4 py-2 bg-white text-black rounded-full text-sm font-medium hover:opacity-90 transition-opacity">
                    Post
                  </button>
                </div>
              </div>
              <div className="text-sm text-zinc-600 text-center py-4">
                No comments yet. Be the first!
              </div>
            </section>
          </div>

          {/* Right — Recommendations (1/4) */}
          <aside className="xl:col-span-1 space-y-3">
            <h3 className="text-sm font-bold text-zinc-400 mb-2">Other Games</h3>
            {otherGames.map(([s, g]) => (
              <Link key={s} href={`/games/${s}`} className="flex gap-3 group cursor-pointer">
                <div className="w-40 shrink-0 aspect-video bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden border border-zinc-800 group-hover:border-zinc-600 transition-colors">
                  {g.thumbnail ? (
                    <img src={g.thumbnail} alt={g.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-zinc-600 text-xs">{g.title}</span>
                  )}
                </div>
                <div className="min-w-0 py-0.5">
                  <h3 className="text-sm font-medium line-clamp-2 group-hover:text-white transition-colors">{g.title}</h3>
                  <p className="text-xs text-zinc-500 mt-1">{g.category}</p>
                  <p className="text-xs text-zinc-600 mt-0.5 line-clamp-2">{g.description}</p>
                </div>
              </Link>
            ))}
          </aside>
        </div>
      </div>
    </div>
  );
}
