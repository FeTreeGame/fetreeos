export interface AppDef {
  id: string;
  title: string;
  icon: string;
  type: 'browser' | 'notepad' | 'iframe' | 'explorer' | 'settings' | 'gallery' | 'mycomputer' | 'empty';
  defaultW?: number;
  defaultH?: number;
  url?: string;
  text?: string;
  system?: boolean;
  singleInstance?: boolean;
  fileHandler?: boolean;
}

export const APPS: AppDef[] = [
  // --- 시스템 ---
  { id: 'mycomputer', title: 'My Computer', icon: '💻', type: 'mycomputer', system: true, singleInstance: true },

  // --- 기본 앱 ---
  { id: 'explorer', title: 'File Explorer', icon: '📂', type: 'explorer' },
  { id: 'browser', title: 'Internet', icon: '🌐', type: 'browser', fileHandler: true },
  { id: 'notepad', title: 'Notes', icon: '📝', type: 'notepad', fileHandler: true },
  { id: 'settings', title: 'Settings', icon: '⚙️', type: 'settings', system: true, singleInstance: true },

  // --- 콘텐츠 앱 ---
  { id: 'experience-space', title: 'Experience Space', icon: '🌌', type: 'iframe', url: 'https://experience-space.vercel.app' },
  { id: 'interactive-plains', title: 'Interactive Plains', icon: '🏜️', type: 'iframe', url: 'https://interactive-plains.vercel.app' },
  { id: 'gallery', title: 'Gallery', icon: '🖼️', type: 'gallery' },
  { id: 'craft', title: 'Craft 3D', icon: '🔧', type: 'empty' },
  { id: 'viewer', title: 'GLB Viewer', icon: '📦', type: 'empty' },
  { id: 'music', title: 'Music', icon: '🎵', type: 'empty' },
];
