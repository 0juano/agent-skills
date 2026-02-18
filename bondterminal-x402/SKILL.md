---
name: bondterminal-x402
description: >
  Query BondTerminal API endpoints using x402 keyless payments via the `btx` CLI.
  Use when users ask for BondTerminal bond data without API keys, mention x402,
  PAYMENT-SIGNATURE, keyless pay-per-call, bond analytics, cashflows, history,
  riesgo país, or ISIN/ticker lookups (for example AL30, GD30, US040114HS26).
  Supports bonds list/detail/analytics/cashflows/history, single-bond calculate,
  and riesgo país endpoints, with automatic 402 -> payment -> retry handling.
metadata:
  author: 0juano
  version: "1.0.0"
---

# BondTerminal x402

Use this skill to fetch BondTerminal data with x402 pay-per-call auth (no Bearer API key).

## Setup

Script location:
- `{baseDir}/scripts/btx`

Make it executable once:

```bash
chmod +x {baseDir}/scripts/btx
```

Run commands from a workspace that has BondTerminal dependencies installed (`@x402/core`, `@x402/evm`, `viem`).

Required env var:

```bash
export X402_PRIVATE_KEY=0x... # EVM private key used to sign x402 payments
```

Optional env var:

```bash
export BT_API_BASE_URL=https://bondterminal.com/api/v1
# Optional module-resolution override:
# export BTX_MODULE_BASE=/path/to/BondTerminal
```

## Commands

```bash
# Public (no payment)
btx treasury

# x402-protected endpoints
btx bonds --search AL30
btx bond US040114HS26
btx analytics AL30 --fields market,yields
btx cashflows GD30D
btx history AL30 --range 1y
btx calculate AL30 --price 80
btx riesgo
btx riesgo-history --range 1m
```

Use `--json` on any command for machine-readable output.

## Operating Notes

- The CLI first calls the endpoint normally.
- If response is `402`, it reads `PAYMENT-REQUIRED`, creates a signed payment, and retries automatically.
- If response is `401`, x402 is likely not enabled on that deployment.
- `POST /calculate/batch` is Bearer-only in BondTerminal and not part of this skill.
- On successful paid calls, the CLI prints settlement metadata (`payer`, `transaction`, `network`) to stderr.

## Troubleshooting

- `X402_PRIVATE_KEY is required`: set `X402_PRIVATE_KEY` in your shell.
- `Invalid X402_PRIVATE_KEY`: ensure 32-byte hex with `0x` prefix.
- `401 Authorization header required`: target env is not accepting x402 for that route.
- `403 Batch requires API key subscription`: use Bearer auth for `/calculate/batch`.
