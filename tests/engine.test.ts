import { describe, it, expect } from "vitest";
import {
  availability,
  errorBudget,
  burnRate,
  evaluateAlerts,
  percentile,
  run,
  demo,
  inspect,
  DEFAULT_POLICIES,
} from "../src/engine";

describe("slo-workshop", () => {
  it("computes availability and budgets", () => {
    expect(availability(999, 1000)).toBeCloseTo(0.999, 5);
    expect(errorBudget(0.999, 1000)).toBeCloseTo(1, 5);
    expect(burnRate(2, 1, 1)).toBeCloseTo(2, 5);
  });

  it("percentile p95", () => {
    expect(percentile([1, 2, 3, 4, 100], 95)).toBe(100);
  });

  it("fires burn-rate alerts on spikes", () => {
    const now = Date.now();
    const points = Array.from({ length: 20 }, (_, i) => ({
      ts: now - (20 - i) * 60_000,
      good: i > 15 ? 900 : 999,
      total: 1000,
    }));
    const alerts = evaluateAlerts(points, 0.999, DEFAULT_POLICIES, now);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0]!.burnRate).toBeGreaterThan(1);
  });

  it("run/demo/inspect", () => {
    const r = run({ sloTarget: 0.99 });
    expect(r.author).toContain("zAx4hub");
    expect(r.availability).toBeGreaterThan(0);
    expect(demo().alerts).toBeDefined();
    expect(inspect().name).toBe("slo-workshop");
  });
});
