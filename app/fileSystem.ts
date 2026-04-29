import { APPS } from './apps';

const STORAGE_KEY = 'fetree-fs';
const FS_VERSION_KEY = 'fetree-fs-version';
const CURRENT_VERSION = 6;
export const MAX_DEPTH = 4;

export interface FSNode {
  id: string;
  name: string;
  type: 'file' | 'folder' | 'app' | 'system';
  parentId: string;
  extension?: string;
  content?: string;
  url?: string;
  appId?: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
  deletedFrom?: string;
  deletedAt?: number;
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
  if (node.type === 'app' || node.type === 'system') return '📦';
  if (node.type === 'folder') return '📁';
  if (node.extension === '.txt') return '📄';
  return '📎';
}

// --- localStorage 구현 (추후 Supabase로 교체) ---
// 인메모리 캐시: loadFS()를 페이지 로드 시 1회만 파싱, 이후 캐시 히트.
// saveFS()가 캐시를 갱신하므로 write 후 즉시 반영.

let fsCache: FSNode[] | null = null;

export function loadFS(): FSNode[] {
  if (typeof window === 'undefined') return [];
  if (fsCache) return fsCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    fsCache = raw ? JSON.parse(raw) : [];
    return fsCache!;
  } catch {
    fsCache = [];
    return fsCache;
  }
}

export function clearFSCache(): void {
  fsCache = null;
}

function saveFS(nodes: FSNode[]): void {
  fsCache = nodes;
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

export function isFolderAlive(folderId: string): boolean {
  if (ROOT_IDS.has(folderId)) return folderId !== 'trash';
  const nodes = loadFS();
  const map = new Map(nodes.map(n => [n.id, n]));
  let current = folderId;
  while (current && !ROOT_IDS.has(current)) {
    const node = map.get(current);
    if (!node) return false;
    current = node.parentId;
  }
  return current !== 'trash';
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

export function uniqueName(parentId: string, name: string): string {
  const siblings = getChildren(parentId);
  const names = new Set(siblings.map(n => n.name));
  if (!names.has(name)) return name;

  const dotIdx = name.lastIndexOf('.');
  const base = dotIdx > 0 ? name.slice(0, dotIdx) : name;
  const ext = dotIdx > 0 ? name.slice(dotIdx) : '';

  let i = 2;
  while (names.has(`${base} (${i})${ext}`)) i++;
  return `${base} (${i})${ext}`;
}

export function createFile(parentId: string, name: string, content = ''): FSNode {
  const finalName = uniqueName(parentId, name);
  const ext = finalName.includes('.') ? finalName.slice(finalName.lastIndexOf('.')) : undefined;
  const node: FSNode = {
    id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: finalName,
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
  const finalName = uniqueName(parentId, name);
  const node: FSNode = {
    id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: finalName,
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

export type MoveConflictMode = 'skip' | 'overwrite' | 'rename';

export function checkMoveConflicts(ids: string[], targetParentId: string): string[] {
  const nodes = loadFS();
  const siblings = nodes.filter(n => n.parentId === targetParentId);
  const names = new Set(siblings.map(n => n.name));
  const conflicts: string[] = [];
  for (const id of ids) {
    const node = nodes.find(n => n.id === id);
    if (node && names.has(node.name)) conflicts.push(id);
  }
  return conflicts;
}

export function moveNodes(ids: string[], targetParentId: string, conflictMode: MoveConflictMode = 'rename'): { moved: string[]; blocked: string[] } {
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
    if ((node.type === 'app' || node.type === 'system') && isTrash) { blocked.push(id); continue; }
    if (!isTrash && targetDepth + 1 + getSubtreeDepth(id) > MAX_DEPTH) { blocked.push(id); continue; }
    if (!isTrash) {
      const siblings = nodes.filter(n => n.parentId === targetParentId && n.id !== id);
      const names = new Set(siblings.map(n => n.name));
      if (names.has(node.name)) {
        if (conflictMode === 'skip') { blocked.push(id); continue; }
        if (conflictMode === 'overwrite') {
          const existing = siblings.find(n => n.name === node.name);
          if (existing) {
            const idx = nodes.indexOf(existing);
            if (idx >= 0) nodes.splice(idx, 1);
            map.delete(existing.id);
          }
        }
        if (conflictMode === 'rename') {
          const dotIdx = node.name.lastIndexOf('.');
          const base = dotIdx > 0 ? node.name.slice(0, dotIdx) : node.name;
          const ext = dotIdx > 0 ? node.name.slice(dotIdx) : '';
          let i = 2;
          while (names.has(`${base} (${i})${ext}`)) i++;
          node.name = `${base} (${i})${ext}`;
          if (node.type === 'file') {
            node.extension = node.name.includes('.') ? node.name.slice(node.name.lastIndexOf('.')) : undefined;
          }
        }
      }
    }
    if (isTrash) {
      node.deletedFrom = node.parentId;
      node.deletedAt = now;
    } else if (node.deletedFrom) {
      delete node.deletedFrom;
      delete node.deletedAt;
    }
    node.parentId = targetParentId;
    node.updatedAt = now;
    moved.push(id);
  }

  saveFS(nodes);
  return { moved, blocked };
}

export function restoreFromTrash(id: string, targetParent = 'desktop'): void {
  moveNodes([id], targetParent);
}

export function deleteNode(id: string): void {
  let nodes = loadFS();
  const target = nodes.find(n => n.id === id);
  if (target?.type === 'app' || target?.type === 'system') return;
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
  for (const app of APPS) {
    const nodeType = app.system ? 'system' : 'app';
    const existing = nodes.find(n => (n.type === 'app' || n.type === 'system') && n.appId === app.id);
    if (existing) {
      existing.name = app.title;
      existing.icon = app.icon;
      existing.type = nodeType;
      continue;
    }
    const node: FSNode = {
      id: `app-${app.id}`,
      name: app.title,
      type: nodeType,
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
      content: '이곳은 FeTreeOS입니다.\n자유롭게 파일을 만들고 정리해보세요.',
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
