# BondTerminal x402 Endpoint Notes

Base URL (default):

- `https://bondterminal.com/api/v1`
- Cost on paid routes: `$0.01 USDC per request` (Base mainnet)

Documentation references:

- Human docs (primary): `https://bondterminal.com/developers`
- Markdown mirror: `https://bondterminal.com/developers.md`
- Interactive Swagger UI: `https://bondterminal.com/api/v1/docs/`

x402-supported endpoints:

- `GET /bonds`
- `GET /bonds/:identifier`
- `GET /bonds/:identifier/analytics`
- `GET /bonds/:identifier/cashflows`
- `GET /bonds/:identifier/history`
- `POST /calculate`
- `GET /riesgo-pais`
- `GET /riesgo-pais/history`

Bearer-only endpoint:

- `POST /calculate/batch`

Auth behavior:

- If x402 is enabled on target deployment, keyless protected requests return `402` with `PAYMENT-REQUIRED`.
- Client must send payment in `PAYMENT-SIGNATURE` (legacy `X-PAYMENT` also accepted).
- Successful settle response is returned in `PAYMENT-RESPONSE`.

Examples:

```bash
btx bonds --search AL30
btx analytics GD30D --fields market,yields
btx calculate AL30 --price 80
btx history AL30 --range 1y
```
