export function finiteNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
