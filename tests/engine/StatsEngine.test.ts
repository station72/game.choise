import { describe, it, expect } from "vitest";
import { StatsEngine } from "../../src/engine/StatsEngine.js";
import type { VisibleStats, HiddenStats } from "../../src/types/stats.js";

function makeStats(overrides: Partial<VisibleStats> = {}): VisibleStats {
  return { money: 50, energy: 50, health: 50, closeness: 50, career: 50, stress: 50, ...overrides };
}

function makeHidden(overrides: Partial<HiddenStats> = {}): HiddenStats {
  return { burnout: 20, fragility: 20, estrangement: 20, vitality: 60, defocus: 0, ...overrides };
}

const engine = new StatsEngine();

describe("StatsEngine.applyDelta", () => {
  it("applies positive delta", () => {
    const { stats } = engine.applyDelta(makeStats(), makeHidden(), { money: 10, career: 5 });
    expect(stats.money).toBe(60);
    expect(stats.career).toBe(55);
  });

  it("applies negative delta", () => {
    const { stats } = engine.applyDelta(makeStats(), makeHidden(), { energy: -20 });
    expect(stats.energy).toBe(30);
  });

  it("clamps at 0", () => {
    const { stats } = engine.applyDelta(makeStats({ money: 5 }), makeHidden(), { money: -20 });
    expect(stats.money).toBe(0);
  });

  it("clamps at 100", () => {
    const { stats } = engine.applyDelta(makeStats({ career: 95 }), makeHidden(), { career: 10 });
    expect(stats.career).toBe(100);
  });

  it("applies hidden stat delta", () => {
    const { hiddenStats } = engine.applyDelta(makeStats(), makeHidden({ burnout: 50 }), { burnout: 20 });
    expect(hiddenStats.burnout).toBe(70);
  });
});

describe("StatsEngine.applyCascades", () => {
  it("high career + low energy → raises stress", () => {
    const stats = makeStats({ career: 75, energy: 30, stress: 40 });
    const result = engine.applyCascades(stats, makeHidden(), new Set(), 0);
    expect(result.stats.stress).toBeGreaterThan(40);
  });

  it("high stress → reduces health", () => {
    const stats = makeStats({ stress: 80, health: 60 });
    const result = engine.applyCascades(stats, makeHidden(), new Set(), 0);
    expect(result.stats.health).toBeLessThan(60);
  });

  it("low closeness with partner → raises estrangement", () => {
    const stats = makeStats({ closeness: 20 });
    const flags = new Set<string>(); // no "relationship_single" → has partner
    const result = engine.applyCascades(stats, makeHidden({ estrangement: 30 }), flags, 0);
    expect(result.hiddenStats.estrangement).toBeGreaterThan(30);
  });

  it("no estrangement when single", () => {
    const stats = makeStats({ closeness: 20 });
    const flags = new Set(["relationship_single"]);
    const result = engine.applyCascades(stats, makeHidden({ estrangement: 30 }), flags, 0);
    expect(result.hiddenStats.estrangement).toBe(30);
  });

  it("personal line ignored 3+ months → reduces vitality", () => {
    const result = engine.applyCascades(makeStats(), makeHidden({ vitality: 60 }), new Set(), 3);
    expect(result.hiddenStats.vitality).toBeLessThan(60);
  });

  it("burnout >= 70 → sets burnout_active flag and drains stats", () => {
    const result = engine.applyCascades(makeStats({ energy: 50 }), makeHidden({ burnout: 75 }), new Set(), 0);
    expect(result.newFlags).toContain("burnout_active");
    expect(result.stats.energy).toBeLessThan(50);
  });

  it("vitality < 20 → sets meaning_crisis_risk flag", () => {
    const result = engine.applyCascades(makeStats(), makeHidden({ vitality: 15 }), new Set(), 0);
    expect(result.newFlags).toContain("meaning_crisis_risk");
  });
});
