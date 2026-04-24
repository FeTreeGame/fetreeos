import { APPS } from './apps';

const STORAGE_KEY = 'fetree-fs';
const FS_VERSION_KEY = 'fetree-fs-version';
const CURRENT_VERSION = 2;

export interface FSNode {
  id: string;
  name: string;
  type: 'file' | 'folder' | 'app';
  parentId: string;
  extension?: string;
  content?: string;
  url?: string;
  appId?: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
}

const EXT_APP_MAP: Record<string, string> = {
  '.txt': 'notepad',
  '.url': 'browser',
};

export function getAppForExtension(ext?: string): string | null {
  return ext ? EXT_APP_MAP[ext] ?? null : null;
}

export function getIconForNode(node: FSNode): string {
  if (node.icon) return node.icon;
  if (node.type === 'app') return '📦';
  if (node.type === 'folder') return '📁';
  if (node.extension === '.txt') return '📄';
  return '📎';
}

// --- localStorage 구현 (추후 Supabase로 교체) ---

export function loadFS(): FSNode[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFS(nodes: FSNode[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
}

export function getFilesByExtension(ext: string): FSNode[] {
  return loadFS().filter(n => n.type === 'file' && n.extension === ext);
}

export function getChildren(parentId: string): FSNode[] {
  return loadFS().filter(n => n.parentId === parentId);
}

export function getNode(id: string): FSNode | null {
  return loadFS().find(n => n.id === id) ?? null;
}

export function createFile(parentId: string, name: string, content = ''): FSNode {
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : undefined;
  const node: FSNode = {
    id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    type: 'file',
    parentId,
    extension: ext,
    content,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const nodes = loadFS();
  nodes.push(node);
  saveFS(nodes);
  return node;
}

export function createFolder(parentId: string, name: string): FSNode {
  const node: FSNode = {
    id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    type: 'folder',
    parentId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const nodes = loadFS();
  nodes.push(node);
  saveFS(nodes);
  return node;
}

export function updateNode(id: string, updates: Partial<Pick<FSNode, 'name' | 'content' | 'parentId'>>): void {
  const nodes = loadFS();
  const idx = nodes.findIndex(n => n.id === id);
  if (idx < 0) return;
  if (updates.name !== undefined) {
    nodes[idx].name = updates.name;
    if (nodes[idx].type === 'file') {
      nodes[idx].extension = updates.name.includes('.') ? updates.name.slice(updates.name.lastIndexOf('.')) : undefined;
    }
  }
  if (updates.content !== undefined) nodes[idx].content = updates.content;
  if (updates.parentId !== undefined) nodes[idx].parentId = updates.parentId;
  nodes[idx].updatedAt = Date.now();
  saveFS(nodes);
}

export function moveToTrash(id: string): void {
  const nodes = loadFS();
  const node = nodes.find(n => n.id === id);
  if (node?.type === 'app') return;
  const moveRecursive = (targetId: string) => {
    const idx = nodes.findIndex(n => n.id === targetId);
    if (idx >= 0 && nodes[idx].parentId !== 'trash') {
      nodes[idx].parentId = 'trash';
      nodes[idx].updatedAt = Date.now();
    }
    nodes.filter(n => n.parentId === targetId).forEach(n => moveRecursive(n.id));
  };
  moveRecursive(id);
  saveFS(nodes);
}

export function restoreFromTrash(id: string, targetParent = 'desktop'): void {
  updateNode(id, { parentId: targetParent });
}

export function deleteNode(id: string): void {
  let nodes = loadFS();
  const target = nodes.find(n => n.id === id);
  if (target?.type === 'app') return;
  const toDelete = new Set<string>();
  const collect = (targetId: string) => {
    toDelete.add(targetId);
    nodes.filter(n => n.parentId === targetId).forEach(n => collect(n.id));
  };
  collect(id);
  nodes = nodes.filter(n => !toDelete.has(n.id));
  saveFS(nodes);
}

export function emptyTrash(): void {
  let nodes = loadFS();
  const trashIds = new Set<string>();
  const collect = (parentId: string) => {
    nodes.filter(n => n.parentId === parentId).forEach(n => {
      trashIds.add(n.id);
      collect(n.id);
    });
  };
  nodes.filter(n => n.parentId === 'trash').forEach(n => {
    trashIds.add(n.id);
    collect(n.id);
  });
  nodes = nodes.filter(n => !trashIds.has(n.id));
  saveFS(nodes);
}

export function getTrashCount(): number {
  return loadFS().filter(n => n.parentId === 'trash').length;
}

export function initDefaultFS(): void {
  const version = typeof window !== 'undefined' ? Number(localStorage.getItem(FS_VERSION_KEY) || '0') : 0;
  if (version >= CURRENT_VERSION) return;

  const nodes = loadFS();
  const existingAppIds = new Set(nodes.filter(n => n.type === 'app').map(n => n.appId));

  for (const app of APPS) {
    if (existingAppIds.has(app.id)) continue;
    const node: FSNode = {
      id: `app-${app.id}`,
      name: app.title,
      type: 'app',
      parentId: 'desktop',
      appId: app.id,
      icon: app.icon,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    nodes.push(node);
  }

  if (!nodes.some(n => n.type === 'file' && n.name === '환영합니다.txt')) {
    const ext = '.txt';
    nodes.push({
      id: `file-welcome-${Date.now()}`,
      name: '환영합니다.txt',
      type: 'file',
      parentId: 'desktop',
      extension: ext,
      content: '이곳은 FeTree OS입니다.\n자유롭게 파일을 만들고 정리해보세요.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  if (!nodes.some(n => n.type === 'folder' && n.name === '내 문서')) {
    nodes.push({
      id: `folder-docs-${Date.now()}`,
      name: '내 문서',
      type: 'folder',
      parentId: 'desktop',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  saveFS(nodes);
  if (typeof window !== 'undefined') localStorage.setItem(FS_VERSION_KEY, String(CURRENT_VERSION));
}
