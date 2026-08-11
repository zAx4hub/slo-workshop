/** slo-workshop — SLO / error-budget calculator + alert policies by zAx4hub */

export type SliPoint = { ts: number; good: number; total: number; latencyMs?: number };
export type BurnPolicy = { windowMinutes: number; budgetFraction: number; severity: "page" | "ticket" };
export type Alert = { severity: string; reason: string; burnRate: number; windowMinutes: number };

export type Report = {
  project: string;
  author: string;
  summary: string;
  availability: number;
  sloTarget: number;
  errorBudgetTotal: number;
  errorBudgetRemaining: number;
  burnRate: number;
  latencyP95?: number;
  alerts: Alert[];
  metrics: Record<string, number>;
};

const AUTHOR = "zAx4hub";

export function availability(good: number, total: number): number {
  if (total <= 0) return 1;
  return Math.max(0, Math.min(1, good / total));
}

export function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx]!;
}

export function errorBudget(sloTarget: number, totalEvents: number): number {
  const target = Math.max(0, Math.min(1, sloTarget));
  return Math.max(0, (1 - target) * totalEvents);
}

export function consumeBudget(points: SliPoint[]): { good: number; total: number; bad: number } {
  let good = 0;
  let total = 0;
  for (const p of points) {
    good += p.good;
    total += p.total;
  }
  return { good, total, bad: Math.max(0, total - good) };
}

/** Multi-window burn rate: budget burned / budget allowed in window. */
export function burnRate(bad: number, budgetTotal: number, windowFraction = 1): number {
  if (budgetTotal <= 0 || windowFraction <= 0) return bad > 0 ? Infinity : 0;
  const allowed = budgetTotal * windowFraction;
  if (allowed <= 0) return bad > 0 ? Infinity : 0;
  return bad / allowed;
}

export function evaluateAlerts(
  points: SliPoint[],
  sloTarget: number,
  policies: BurnPolicy[],
  now = Date.now(),
): Alert[] {
  const { total, bad } = consumeBudget(points);
  const budget = errorBudget(sloTarget, total);
  const alerts: Alert[] = [];
  for (const pol of policies) {
    const cutoff = now - pol.windowMinutes * 60_000;
    const windowPts = points.filter((p) => p.ts >= cutoff);
    const w = consumeBudget(windowPts);
    const windowFraction = pol.windowMinutes / (30 * 24 * 60); // vs 30d SLO window
    const rate = burnRate(w.bad, budget, Math.max(windowFraction, 1e-9));
    const threshold = 1 / Math.max(pol.budgetFraction, 1e-9);
    if (rate >= threshold) {
      alerts.push({
        severity: pol.severity,
        reason: `burn ${rate.toFixed(2)}x over ${pol.windowMinutes}m (budget frac ${pol.budgetFraction})`,
        burnRate: Math.round(rate * 1000) / 1000,
        windowMinutes: pol.windowMinutes,
      });
    }
  }
  return alerts.sort((a, b) => b.burnRate - a.burnRate);
}

export const DEFAULT_POLICIES: BurnPolicy[] = [
  { windowMinutes: 60, budgetFraction: 0.02, severity: "page" },
  { windowMinutes: 360, budgetFraction: 0.05, severity: "page" },
  { windowMinutes: 1440, budgetFraction: 0.1, severity: "ticket" },
];

export function run(input: {
  points?: SliPoint[];
  sloTarget?: number;
  policies?: BurnPolicy[];
  latencyThresholdMs?: number;
} = {}): Report {
  const sloTarget = input.sloTarget ?? 0.999;
  const points =
    input.points?.length
      ? input.points
      : demoPoints();
  const { good, total, bad } = consumeBudget(points);
  const avail = availability(good, total);
  const budgetTotal = errorBudget(sloTarget, total);
  const remaining = Math.max(0, budgetTotal - bad);
  const rate = burnRate(bad, budgetTotal, 1);
  const latencies = points.map((p) => p.latencyMs).filter((x): x is number => typeof x === "number");
  const latencyP95 = latencies.length ? percentile(latencies, 95) : undefined;
  const alerts = evaluateAlerts(points, sloTarget, input.policies ?? DEFAULT_POLICIES);
  return {
    project: "slo-workshop",
    author: AUTHOR,
    summary: `avail=${(avail * 100).toFixed(3)}% target=${(sloTarget * 100).toFixed(3)}% budget_left=${remaining.toFixed(1)} alerts=${alerts.length}`,
    availability: Math.round(avail * 1e6) / 1e6,
    sloTarget,
    errorBudgetTotal: Math.round(budgetTotal * 1000) / 1000,
    errorBudgetRemaining: Math.round(remaining * 1000) / 1000,
    burnRate: Math.round(rate * 1000) / 1000,
    latencyP95,
    alerts,
    metrics: { good, total, bad, alertCount: alerts.length },
  };
}

function demoPoints(): SliPoint[] {
  const now = Date.now();
  const pts: SliPoint[] = [];
  for (let i = 0; i < 48; i++) {
    const total = 1000;
    const bad = i > 40 ? 40 : i > 30 ? 8 : 1;
    pts.push({
      ts: now - (48 - i) * 3600_000,
      good: total - bad,
      total,
      latencyMs: 80 + (i % 7) * 12 + (i > 42 ? 200 : 0),
    });
  }
  return pts;
}

export function demo(): Report {
  return run({ sloTarget: 0.999, policies: DEFAULT_POLICIES });
}

export function inspect() {
  return {
    name: "slo-workshop",
    author: AUTHOR,
    oneLiner: "SLO/error-budget calculator + alert policies",
    version: "0.1.0",
    features: [
      "availability SLI",
      "error budget remaining",
      "multi-window burn-rate alerts",
      "latency P95",
      "opinionated paging policies",
    ],
    commands: ["demo", "run", "inspect"],
  };
}
