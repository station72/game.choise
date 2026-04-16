/** Clamp a number to [min, max] inclusive */
export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

/** Apply a delta value to a stat and clamp result */
export function applyAndClamp(base: number, delta: number): number {
  return clamp(base + delta);
}
