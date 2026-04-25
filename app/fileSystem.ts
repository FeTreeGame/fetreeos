import { APPS } from './apps';

const STORAGE_KEY = 'fetree-fs';
const FS_VERSION_KEY = 'fetree-fs-version';
const CURRENT_VERSION = 3;
export const MAX_DEPTH = 4;

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

const ROOT_IDS = new Set(['desktop', 'trash', 'root']);

export function getPath(nodeId: string): { id: string; name: string }[] {
  const nodes = loadFS();
  const map = new Map(nodes.map(n => [n.id, n]));
  const path: { id: string; name: string }[] = [];
  let current = nodeId;
  while (current && !ROOT_IDS.has(current)) {
    const node = map.get(current);
    if (!node) break;
    path.unshift({ id: node.id, name: node.name });
    current = node.parentId;
  }
  if (ROOT_IDS.has(current ?? nodeId)) {
    const labels: Record<string, string> = { desktop: 'Desktop', trash: '휴지통', root: '/' };
    path.unshift({ id: current ?? nodeId, name: labels[current ?? nodeId] ?? current ?? nodeId });
  }
  return path;
}

export function getDepth(parentId: string): number {
  if (ROOT_IDS.has(parentId)) return 0;
  const nodes = loadFS();
  const map = new Map(nodes.map(n => [n.id, n]));
  let depth = 0;
  let current = parentId;
  while (current && !ROOT_IDS.has(current)) {
    depth++;
    const node = map.get(current);
    if (!node) break;
    current = node.parentId;
  }
  return depth;
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

export function createFolder(parentId: string, name: string): FSNode | null {
  if (getDepth(parentId) >= MAX_DEPTH) return null;
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

export function moveNodes(ids: string[], targetParentId: string): { moved: string[]; blocked: string[] } {
  const nodes = loadFS();
  const map = new Map(nodes.map(n => [n.id, n]));
  const moved: string[] = [];
  const blocked: string[] = [];
  const isTrash = targetParentId === 'trash';
  const targetDepth = isTrash ? 0 : getDepth(targetParentId);

  const getSubtreeDepth = (nodeId: string): number => {
    let max = 0;
    for (const n of nodes) {
      if (n.parentId === nodeId) max = Math.max(max, 1 + getSubtreeDepth(n.id));
    }
    return max;
  };

  const isDescendant = (ancestorId: string, nodeId: string): boolean => {
    let cur = nodeId;
    while (cur && !ROOT_IDS.has(cur)) {
      if (cur === ancestorId) return true;
      const n = map.get(cur);
      if (!n) break;
      cur = n.parentId;
    }
    return false;
  };

  const now = Date.now();
  for (const id of ids) {
    const node = map.get(id);
    if (!node) { blocked.push(id); continue; }
    if (id === targetParentId) { blocked.push(id); continue; }
    if (isDescendant(id, targetParentId)) { blocked.push(id); continue; }
    if (node.type === 'app' && isTrash) { blocked.push(id); continue; }
    if (!isTrash && targetDepth + 1 + getSubtreeDepth(id) > MAX_DEPTH) { blocked.push(id); continue; }
    node.parentId = targetParentId;
    node.updatedAt = now;
    moved.push(id);
  }

  saveFS(nodes);
  return { moved, blocked };
}

export function moveToTrash(id: string): void {
  moveNodes([id], 'trash');
}

export function restoreFromTrash(id: string, targetParent = 'desktop'): void {
  moveNodes([id], targetParent);
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
    const existing = nodes.find(n => n.type === 'app' && n.appId === app.id);
    if (existing) {
      existing.name = app.title;
      existing.icon = app.icon;
      continue;
    }
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
    const docsId = `folder-docs-${Date.now()}`;
    nodes.push({
      id: docsId,
      name: '내 문서',
      type: 'folder',
      parentId: 'desktop',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    nodes.push({
      id: `file-memo-${Date.now()}`,
      name: '메모.txt',
      type: 'file',
      parentId: docsId,
      extension: '.txt',
      content: '내 문서 폴더의 샘플 메모입니다.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    nodes.push({
      id: `folder-projects-${Date.now()}`,
      name: '프로젝트',
      type: 'folder',
      parentId: docsId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  saveFS(nodes);
  if (typeof window !== 'undefined') localStorage.setItem(FS_VERSION_KEY, String(CURRENT_VERSION));
}
