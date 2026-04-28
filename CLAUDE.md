# FeTreeOS

Web-based virtual desktop OS. Next.js 16 + React 19 + Tailwind CSS v4.

## Architecture

Single-page app (`app/page.tsx`) acting as a window manager + desktop shell.

| File | Role |
|------|------|
| `app/page.tsx` | OS shell — window manager, drag/resize/snap, taskbar, start menu |
| `app/FileExplorer.tsx` | Desktop icons (mode='desktop') + folder explorer (mode='explorer') |
| `app/fileSystem.ts` | Virtual FS — localStorage-based CRUD with in-memory cache |
| `app/constants.ts` | Shared types, sort comparators, grid helpers |
| `app/apps.ts` | App registry (AppDef array) |
| `app/Notepad.tsx` | Notepad app |
| `app/Browser.tsx` | Browser app (iframe) |
| `app/Gallery.tsx` | Gallery app (Supabase artworks) |
| `app/Settings.tsx` | Settings app |
| `app/MyComputer.tsx` | System info app |
| `app/Clock.tsx` | Taskbar clock + calendar |
| `app/ContextMenu.tsx` | Right-click context menu |
| `app/useDesktopDrag.ts` | Desktop icon drag hook |
| `app/useExplorerDrag.ts` | Explorer icon drag hook |
| `app/lib/supabase.ts` | Supabase client singleton |

## Key Patterns

- **Window state**: `windows` array in page.tsx, each with ratio-based x/y/w/h (0~1)
- **Snap zones**: left/right half, 4 corners (quarter), top (fullscreen)
- **Double-click detection**: manual ref timer (350ms) — `setPointerCapture` blocks native dblclick
- **Focus management**: `suppressDesktopBlur` ref prevents focus loss on maximize toggle
- **FS cache**: `fsCache` in fileSystem.ts — `loadFS()` parses JSON once, `saveFS()` updates cache
- **Icon layout**: `autoArrange` ON → sorted grid placement; OFF → `autoPlace` free positioning
- **Resize handles**: 10px edges (±5 offset), 16px corners, overflow:hidden on inner wrapper div

## Conventions

- Korean UI text, English code/comments
- localStorage keys prefixed `fetree-`
- FS version tracked in `fetree-fs-version` — bump `CURRENT_VERSION` when changing default nodes
- Apps defined in `apps.ts`, FS nodes auto-created in `initDefaultFS()`
- iframe apps: independent web apps embedded via AppDef `url` field

## Environment Variables

| Variable | Scope | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Supabase anon key (RLS enforced) |

Dev DB: `vadcnfhflpjqrglplkyo` / Prod DB: `jpunsvpmueguisvcvhia`

## Commands

```bash
npm run dev     # dev server (Turbopack)
npm run build   # production build
npm run start   # production server
```

## Docs

- `docs/TODO.md` — roadmap, performance analysis, known issues
- `docs/LAUNCH_CHECKLIST.md` — MVP deployment checklist
- `docs/ARCHITECTURE.md` — system design notes
- `docs/DECISIONS.md` — design decision log
- `CHANGELOG.md` — version history
