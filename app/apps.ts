export interface AppDef {
  id: string;
  title: string;
  icon: string;
  type: 'browser' | 'notepad' | 'iframe' | 'explorer' | 'empty';
  defaultW?: number;
  defaultH?: number;
  url?: string;
  text?: string;
}

export const APPS: AppDef[] = [
  // --- 기본 앱 ---
  { id: 'explorer', title: 'Files', icon: '📂', type: 'explorer' },
  { id: 'browser', title: 'Internet', icon: '🌐', type: 'browser' },
  { id: 'notepad', title: 'Notes', icon: '📝', type: 'notepad' },
  { id: 'settings', title: 'Settings', icon: '⚙', type: 'empty' },

  // --- 콘텐츠 앱 ---
  { id: 'experience-space', title: 'Experience Space', icon: '🌌', type: 'iframe', url: 'https://experience-space.vercel.app' },
  { id: 'interactive-plains', title: 'Interactive Plains', icon: '🏜️', type: 'iframe', url: 'https://interactive-plains.vercel.app' },
  { id: 'craft', title: 'Craft 3D', icon: '🔧', type: 'empty' },
  { id: 'viewer', title: 'GLB Viewer', icon: '📦', type: 'empty' },
  { id: 'music', title: 'Music', icon: '🎵', type: 'empty' },
];
