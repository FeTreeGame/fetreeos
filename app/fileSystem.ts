const STORAGE_KEY = 'fetree-fs';

export interface FSNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string;
  extension?: string;
  content?: string;
  url?: string;
  createdAt: number;
  updatedAt: number;
}

// 확장자 → 앱 타입 매핑
const EXT_APP_MAP: Record<string, string> = {
  '.txt': 'notepad',
  '.url': 'browser',
};

export function getAppForExtension(ext?: string): string | null {
  return ext ? EXT_APP_MAP[ext] ?? null : null;
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

export function deleteNode(id: string): void {
  let nodes = loadFS();
  const toDelete = new Set<string>();
  const collect = (targetId: string) => {
    toDelete.add(targetId);
    nodes.filter(n => n.parentId === targetId).forEach(n => collect(n.id));
  };
  collect(id);
  nodes = nodes.filter(n => !toDelete.has(n.id));
  saveFS(nodes);
}

export function initDefaultFS(): void {
  const nodes = loadFS();
  if (nodes.length > 0) return;
  createFile('desktop', '환영합니다.txt', '이곳은 FeTree OS입니다.\n자유롭게 파일을 만들고 정리해보세요.');
  createFolder('desktop', '내 문서');
}
