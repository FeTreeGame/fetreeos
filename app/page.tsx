import Link from "next/link";

const CATEGORIES = [
  "All",
  "Action",
  "Puzzle",
  "Platformer",
  "RPG",
  "Arcade",
  "Strategy",
];

const GAMES = [
  { slug: "dog-ninja", title: "Dog Ninja", category: "Action", description: "Fast-paced action game", status: "WIP", thumbnail: "https://img.youtube.com/vi/iofYDsA2yqg/mqdefault.jpg", embedUrl: "https://www.youtube.com/embed/iofYDsA2yqg" },
  { slug: "demo-platformer", title: "Demo Platformer", category: "Platformer", description: "Classic 2D platformer", status: "WIP", thumbnail: "https://img.youtube.com/vi/yQxwbZsL14Y/mqdefault.jpg", embedUrl: "https://www.youtube.com/embed/yQxwbZsL14Y" },
  { slug: "puzzle-box", title: "Puzzle Box", category: "Puzzle", description: "Brain teaser puzzles", status: "Soon", thumbnail: "https://img.youtube.com/vi/VoiaFMeS4Ok/mqdefault.jpg", embedUrl: "https://www.youtube.com/embed/VoiaFMeS4Ok" },
  { slug: "arcade-rush", title: "Arcade Rush", category: "Arcade", description: "Retro arcade action", status: "Soon", thumbnail: "https://img.youtube.com/vi/wTXJ2SgIymo/mqdefault.jpg", embedUrl: "https://www.youtube.com/embed/wTXJ2SgIymo" },
  { slug: "tiny-rpg", title: "Tiny RPG", category: "RPG", description: "Micro RPG adventure", status: "Soon", thumbnail: "https://img.youtube.com/vi/t0Rxxk3fpOo/mqdefault.jpg", embedUrl: "https://www.youtube.com/embed/t0Rxxk3fpOo" },
  { slug: "grid-tactics", title: "Grid Tactics", category: "Strategy", description: "Turn-based strategy", status: "Soon", thumbnail: "https://img.youtube.com/vi/_vUD2SZVX0A/mqdefault.jpg", embedUrl: "https://www.youtube.com/embed/_vUD2SZVX0A" },
  { slug: "simmiland", title: "Simmiland", category: "Strategy", description: "God-like card game by Sokpop", status: "WIP", thumbnail: "https://img.itch.zone/aW1hZ2UvMjkyNjU4LzE0NzQ3MzAucG5n/original/f5ndB%2F.png", embedUrl: "https://itch.io/embed/292658" },
  { slug: "tavern-for-tea", title: "A Tavern for Tea", category: "RPG", description: "Fantasy visual novel & tea-making sim", status: "WIP", thumbnail: "https://img.itch.zone/aW1nLzExNDQ0MzQ1LnBuZw==/original/Sdr4QU.png", embedUrl: "https://itch.io/embed/475414" },
];

const SIDEBAR_ITEMS = [
  { label: "JSFL AI", href: "https://jsfl-ai.vercel.app", tag: "Tool" },
  { label: "CEP Panel", href: "#", tag: "New" },
  { label: "GitHub", href: "https://github.com/FeTreeGame" },
  { label: "itch.io", href: "https://itch.io" },
];

export default function Home() {
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
          <div className="shrink-0 text-xs text-zinc-500">v0.1</div>
        </div>
      </header>

      <div className="flex">
        {/* Left Sidebar */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-zinc-800 fixed left-0 top-14 h-[calc(100vh-3.5rem)] overflow-y-auto p-2">
          <div className="space-y-1">
            <span className="text-xs text-zinc-500 uppercase tracking-wider px-3 py-2 block">Categories</span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  cat === "All"
                    ? "bg-zinc-800 text-white font-medium"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="border-t border-zinc-800 mt-4 pt-4 space-y-1">
            <span className="text-xs text-zinc-500 uppercase tracking-wider px-3 py-2 block">Links & Tools</span>
            {SIDEBAR_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800/50 hover:text-white transition-colors"
              >
                <span>{item.label}</span>
                {item.tag && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-400">{item.tag}</span>
                )}
              </a>
            ))}
          </div>

          <div className="border-t border-zinc-800 mt-4 pt-4 px-3">
            <p className="text-xs text-zinc-600 leading-relaxed">
              Minimizing repetitive work, focusing on creation. Free tools for 2D game dev & animation.
            </p>
            <p className="text-xs text-zinc-700 mt-2">&copy; 2026 FeTreeGame</p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-56 transition-all duration-300">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-6">Games</h2>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
              {GAMES.map((game) => (
                <Link key={game.slug} href={`/games/${game.slug}`}>
                  <div className="group cursor-pointer overflow-hidden rounded-xl bg-transparent">
                    {/* Thumbnail */}
                    <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-800 flex items-center justify-center mb-3">
                      {game.thumbnail ? (
                        <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <span className="text-zinc-600 text-sm">{game.title}</span>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 text-xs text-zinc-500">
                        {game.title[0]}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-white transition-colors">{game.title}</h3>
                        <p className="text-xs text-zinc-500">{game.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-zinc-600">{game.category}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            game.status === "WIP"
                              ? "bg-amber-900/50 text-amber-400"
                              : "bg-zinc-800 text-zinc-500"
                          }`}>{game.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
