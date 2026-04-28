# FeTreeOS

Web-based virtual desktop OS built with Next.js, React, and Tailwind CSS.

**Live**: [fetreeos.vercel.app](https://fetreeos.vercel.app)

## Features

- Window manager — drag, snap (half/quarter/fullscreen), resize, z-order
- Virtual file system — files, folders, trash, context menu, drag & drop
- Desktop grid — auto-arrange, sorting (name/type/date), icon positioning
- Built-in apps — File Explorer, Notepad, Browser, Settings, Gallery, My Computer
- iframe apps — Experience Space, Interactive Plains
- Supabase integration — Gallery reads artworks from shared database

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI**: React 19, Tailwind CSS v4
- **Database**: Supabase (PostgreSQL + Realtime)
- **Deploy**: Vercel

## Getting Started

```bash
npm install
npm run dev
```

Requires `.env.local` with Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## License

MIT — see [LICENSE](LICENSE) for details.

Brand assets (name "FeTreeOS", logos, icons) are excluded from the MIT license. Forks must use their own branding.
