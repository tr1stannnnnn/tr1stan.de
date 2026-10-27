// Input-only cloud test driver. Never mutates Flight state or production scores.
export function targetHeight(f, collect = false) {
  const h = f.hazard;
  if (h?.kind === 'trace' && h.locked !== null) return h.locked >= 360 ? Math.max(252, h.locked - 82) : Math.min(452, h.locked + 100);
  if (h?.kind === 'laser') return h.side > 0 ? 310 : 420;
  const fragment = f.gates.find(g => g.passed && g.fragment && !g.resolved);
  if (collect && fragment) return fragment.baseCenter + fragment.fragmentOffset;
  const g = f.gates.find(g => !g.passed);
  return g?.center || 360;
}
export function shouldFlap(f, collect = false) { return !f.dead && f.y > targetHeight(f, collect) + 18 && f.vy > 0; }
