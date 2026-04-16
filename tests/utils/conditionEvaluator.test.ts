import { describe, it, expect } from "vitest";
import { evaluate, type EvalContext } from "../../src/utils/conditionEvaluator.js";
import type { ConditionExpression } from "../../src/types/events.js";

function makeCtx(overrides: Partial<EvalContext> = {}): EvalContext {
  return {
    stats: { money: 50, energy: 50, health: 50, closeness: 50, career: 50, stress: 50 },
    hiddenStats: { burnout: 20, fragility: 20, estrangement: 20, vitality: 60, defocus: 0 },
    flags: new Set(),
    activeTags: new Set(),
    ...overrides,
  };
}

describe("conditionEvaluator", () => {
  it("evaluates a simple stat >= condition (true)", () => {
    const expr: ConditionExpression = { stat: "career", op: ">=", value: 40 };
    expect(evaluate(expr, makeCtx())).toBe(true);
  });

  it("evaluates a simple stat >= condition (false)", () => {
    const expr: ConditionExpression = { stat: "career", op: ">=", value: 60 };
    expect(evaluate(expr, makeCtx())).toBe(false);
  });

  it("evaluates hidden stat condition", () => {
    const expr: ConditionExpression = { stat: "vitality", op: "<", value: 70 };
    expect(evaluate(expr, makeCtx())).toBe(true);
  });

  it("evaluates hasTag (present)", () => {
    const expr: ConditionExpression = { hasTag: "career_focus" };
    const ctx = makeCtx({ activeTags: new Set(["career_focus", "work"]) });
    expect(evaluate(expr, ctx)).toBe(true);
  });

  it("evaluates hasTag (absent)", () => {
    const expr: ConditionExpression = { hasTag: "career_focus" };
    expect(evaluate(expr, makeCtx())).toBe(false);
  });

  it("evaluates flag condition", () => {
    const expr: ConditionExpression = { flag: "promoted_once" };
    const ctx = makeCtx({ flags: new Set(["promoted_once"]) });
    expect(evaluate(expr, ctx)).toBe(true);
  });

  it("evaluates and (all true)", () => {
    const expr: ConditionExpression = {
      and: [
        { stat: "career", op: ">=", value: 40 },
        { stat: "money", op: ">=", value: 40 },
      ],
    };
    expect(evaluate(expr, makeCtx())).toBe(true);
  });

  it("evaluates and (one false)", () => {
    const expr: ConditionExpression = {
      and: [
        { stat: "career", op: ">=", value: 40 },
        { stat: "money", op: ">=", value: 60 },
      ],
    };
    expect(evaluate(expr, makeCtx())).toBe(false);
  });

  it("evaluates or (one true)", () => {
    const expr: ConditionExpression = {
      or: [
        { stat: "career", op: ">=", value: 80 },
        { stat: "money", op: ">=", value: 40 },
      ],
    };
    expect(evaluate(expr, makeCtx())).toBe(true);
  });

  it("evaluates not", () => {
    const expr: ConditionExpression = {
      not: { stat: "career", op: ">=", value: 80 },
    };
    expect(evaluate(expr, makeCtx())).toBe(true);
  });

  it("evaluates nested condition", () => {
    const expr: ConditionExpression = {
      and: [
        { stat: "stress", op: "<=", value: 60 },
        {
          or: [
            { hasTag: "career_focus" },
            { flag: "promoted_once" },
          ],
        },
      ],
    };
    const ctx = makeCtx({ activeTags: new Set(["career_focus"]) });
    expect(evaluate(expr, ctx)).toBe(true);
  });

  it("returns false for unknown stat", () => {
    const expr: ConditionExpression = { stat: "unknown_stat", op: ">=", value: 0 };
    expect(evaluate(expr, makeCtx())).toBe(false);
  });
});
