/** Shared geometry, used for drawing and hit testing. Dates keep their time spacing. */
export function dateCoordinate(date: string): number {
  return /^\d{4}$/.test(date) ? Date.UTC(Number(date), 0, 1) : Date.parse(date);
}
export function datePositions(
  dates: string[],
  left: number,
  right: number,
): number[] {
  if (!dates.length) return [];
  if (dates.length === 1) return [(left + right) / 2];
  const times = dates.map(dateCoordinate);
  const span = times.at(-1)! - times[0];
  return times.map(
    (t) => left + ((t - times[0]) / (span || 1)) * (right - left),
  );
}
export function nearestPoint(positions: number[], x: number): number | null {
  if (!positions.length || !Number.isFinite(x)) return null;
  let low = 0,
    high = positions.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (positions[mid] < x) low = mid + 1;
    else high = mid;
  }
  return low > 0 &&
    Math.abs(positions[low - 1] - x) <= Math.abs(positions[low] - x)
    ? low - 1
    : low;
}
export function visibleWindow(total: number, size: number, start: number) {
  const count = Math.min(total, Math.max(0, size || total));
  const first = Math.max(0, Math.min(start, total - count));
  return { start: first, size: count, end: first + count };
}
export function axisPrecision(min: number, max: number) {
  const step = (max - min) / 4;
  return step > 0
    ? Math.max(0, Math.min(8, 1 - Math.floor(Math.log10(step))))
    : 2;
}
