const COLORS = [
  '#00a884', '#53bdeb', '#ff8a65', '#a78bfa', '#f6c453',
  '#fb7185', '#34d399', '#60a5fa', '#f472b6', '#facc15',
];

// Cor determinística a partir de um id (mesmo contato => mesma cor).
export function colorFor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

// Iniciais para o avatar (ex.: "Ana Beatriz" => "AB").
export function initials(name) {
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?';
}

export function newId(prefix = 'm') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
