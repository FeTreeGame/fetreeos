import type { IconPositions } from './constants';

const ICON_POS_KEY = 'fetree-icon-positions';

export function loadIconPositions(): IconPositions {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(ICON_POS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveIconPositions(positions: IconPositions): void {
  localStorage.setItem(ICON_POS_KEY, JSON.stringify(positions));
}

export function autoPlace(
  items: { id: string }[],
  existing: IconPositions,
  cols: number,
  rows: number,
): IconPositions {
  const result: IconPositions = {};
  const occupied = new Set<string>();
  const unplaced: { id: string }[] = [];

  for (const item of items) {
    const pos = existing[item.id];
    if (pos && pos.col < cols && pos.row < rows) {
      const key = `${pos.col},${pos.row}`;
      if (!occupied.has(key)) {
        result[item.id] = pos;
        occupied.add(key);
        continue;
      }
    }
    unplaced.push(item);
  }
  let startIdx = 0;
  for (const pos of Object.values(result)) {
    const idx = pos.col * rows + pos.row + 1;
    if (idx > startIdx) startIdx = idx;
  }
  for (const item of unplaced) {
    let placed = false;
    for (let i = startIdx; i < cols * rows && !placed; i++) {
      const c = Math.floor(i / rows);
      const r = i % rows;
      const key = `${c},${r}`;
      if (!occupied.has(key)) {
        result[item.id] = { col: c, row: r };
        occupied.add(key);
        placed = true;
      }
    }
    if (!placed) {
      for (let i = 0; i < startIdx && !placed; i++) {
        const c = Math.floor(i / rows);
        const r = i % rows;
        const key = `${c},${r}`;
        if (!occupied.has(key)) {
          result[item.id] = { col: c, row: r };
          occupied.add(key);
          placed = true;
        }
      }
    }
  }
  return result;
}
