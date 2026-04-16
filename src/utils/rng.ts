/**
 * Deterministic pseudo-random number generator (mulberry32).
 * Seeded so playthroughs are reproducible.
 */
export class RNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Returns a float in [0, 1) */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let z = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    z = (z ^ (z + Math.imul(z ^ (z >>> 7), 61 | z))) >>> 0;
    return (z ^ (z >>> 14)) / 4294967296;
  }

  /** Returns an integer in [0, max) */
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  /** Weighted random pick: items with higher weight are more likely */
  weightedPick<T>(items: T[], getWeight: (item: T) => number): T {
    const total = items.reduce((sum, item) => sum + getWeight(item), 0);
    let roll = this.next() * total;
    for (const item of items) {
      roll -= getWeight(item);
      if (roll <= 0) return item;
    }
    return items[items.length - 1];
  }

  getSeed(): number {
    return this.state;
  }
}

export function makeRNG(seed?: number): RNG {
  return new RNG(seed ?? (Date.now() & 0xffffffff));
}
