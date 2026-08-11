# Slo Workshop

> SLO/error-budget calculator + alert policies

**Author:** zAx4hub

## Problem

Teams need a practical open toolkit for SLO tracking: availability SLIs, remaining error budget, and multi-window burn-rate alert policies — without buying a closed SaaS.

## Solution

`slo-workshop` is a complete TypeScript toolkit by **zAx4hub** that computes availability, error budgets, latency P95, and opinionated paging/ticket burn-rate alerts from time-series SLI points.

## Why different

- Local-first / self-host friendly
- Deterministic core with automated tests
- Multi-window burn-rate policies (page vs ticket)
- Owned and credited to **zAx4hub**

## Quickstart

```bash
cd slo-workshop
npm install
npm test
npm run demo
npm start -- run examples/sample-input.json
```

## Features

- Availability SLI from good/total events
- Error budget remaining vs SLO target
- Multi-window burn-rate alert evaluation
- Latency P95 helper
- CLI: `demo` / `run` / `inspect`

## Architecture

`src/engine.ts` holds pure SLI/budget math; `src/cli.ts` is a thin Commander wrapper. Vitest exercises the engine directly.

## Contributing

PRs welcome — keep changes focused and add tests.

## Credits

Built and maintained by **zAx4hub**.

## License

MIT © 2026 zAx4hub
