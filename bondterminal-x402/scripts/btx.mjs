#!/usr/bin/env node

import process from 'node:process';
import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const DEFAULT_BASE_URL = process.env.BT_API_BASE_URL || 'https://bondterminal.com/api/v1';
const PRIMARY_PRIVATE_KEY_ENV = 'X402_PRIVATE_KEY';
const FALLBACK_PRIVATE_KEY_ENV = 'EVM_PRIVATE_KEY';

let cachedPaymentClient = null;

async function importFromWorkspace(specifier) {
  const candidates = [process.cwd(), process.env.BTX_MODULE_BASE].filter(Boolean);

  for (const base of candidates) {
    try {
      const requireFromBase = createRequire(`${base}/package.json`);
      const resolvedPath = requireFromBase.resolve(specifier);
      return await import(pathToFileURL(resolvedPath).href);
    } catch {
      // Try next candidate.
    }
  }

  throw new Error(
    `Missing dependency '${specifier}'. Run this from a workspace with BondTerminal dependencies installed.`,
  );
}

function printHelp() {
  console.log(`BondTerminal x402 CLI

Usage:
  btx <command> [options]

Commands:
  treasury
  bonds [--search TEXT] [--country AR] [--type sovereign|corporate] [--limit N] [--offset N]
  bond <identifier>
  analytics <identifier> [--fields market,yields,...]
  cashflows <identifier> [--settlement YYYY-MM-DD]
  history <identifier> [--range 1w|1m|3m|1y|2y|ytd] [--start YYYY-MM-DD --end YYYY-MM-DD]
  calculate <identifier> (--price N | --ytm N | --gspread N | --zspread N) [--settlement YYYY-MM-DD]
  riesgo
  riesgo-history [--range 1w|1m|3m|1y|2y|ytd] [--start YYYY-MM-DD --end YYYY-MM-DD]

Global options:
  --base-url URL   Override API base URL (default: ${DEFAULT_BASE_URL})
  --json           Print machine-readable output
  --help           Show help
`);
}

function encodeIdentifier(value) {
  return encodeURIComponent(value.trim());
}

function buildUrl(baseUrl, path, query = {}) {
  const cleanedBaseUrl = baseUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${cleanedBaseUrl}${normalizedPath}`);

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

function parseNumber(raw, flagName) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${flagName} must be a valid number`);
  }
  return parsed;
}

function getBaseUrl(values) {
  return values['base-url'] || DEFAULT_BASE_URL;
}

async function getPaymentClient() {
  if (cachedPaymentClient) return cachedPaymentClient;

  const privateKey = process.env[PRIMARY_PRIVATE_KEY_ENV]?.trim()
    || process.env[FALLBACK_PRIVATE_KEY_ENV]?.trim();
  if (!privateKey) {
    throw new Error(`${PRIMARY_PRIVATE_KEY_ENV} or ${FALLBACK_PRIVATE_KEY_ENV} is required for paid endpoints`);
  }

  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error('Invalid private key format. Expected 32-byte hex with 0x prefix');
  }

  const [{ x402Client }, { x402HTTPClient }, evmModule, viemAccountsModule] = await Promise.all([
    importFromWorkspace('@x402/core/client'),
    importFromWorkspace('@x402/core/http'),
    importFromWorkspace('@x402/evm'),
    importFromWorkspace('viem/accounts'),
  ]);

  const { ExactEvmScheme, toClientEvmSigner } = evmModule;
  const { privateKeyToAccount } = viemAccountsModule;
  const account = privateKeyToAccount(privateKey);
  const coreClient = new x402Client().register(
    'eip155:*',
    new ExactEvmScheme(toClientEvmSigner(account)),
  );
  cachedPaymentClient = new x402HTTPClient(coreClient);
  return cachedPaymentClient;
}

async function parseResponseBody(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function requestWithOptionalX402({ method, url, body }) {
  const requestHeaders = {
    Accept: 'application/json',
  };

  const firstRequest = {
    method,
    headers: requestHeaders,
  };

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
    firstRequest.body = JSON.stringify(body);
  }

  const firstResponse = await fetch(url, firstRequest);
  if (firstResponse.status !== 402) {
    return {
      status: firstResponse.status,
      paid: false,
      settlement: null,
      data: await parseResponseBody(firstResponse),
    };
  }

  const paymentRequiredBody = await parseResponseBody(firstResponse);
  const paymentClient = await getPaymentClient();
  const paymentRequired = paymentClient.getPaymentRequiredResponse(
    (headerName) => firstResponse.headers.get(headerName),
    paymentRequiredBody ?? {},
  );

  const paymentPayload = await paymentClient.createPaymentPayload(paymentRequired);
  const paymentHeaders = {
    ...requestHeaders,
    ...paymentClient.encodePaymentSignatureHeader(paymentPayload),
  };

  const paidResponse = await fetch(url, {
    method,
    headers: paymentHeaders,
    body: firstRequest.body,
  });

  let settlement = null;
  try {
    settlement = paymentClient.getPaymentSettleResponse((headerName) => paidResponse.headers.get(headerName));
  } catch {
    settlement = null;
  }

  return {
    status: paidResponse.status,
    paid: true,
    settlement,
    data: await parseResponseBody(paidResponse),
  };
}

function parseCommand(argv) {
  const [command, ...rest] = argv;

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    return { help: true };
  }

  if (command === 'treasury') {
    const { values } = parseArgs({
      args: rest,
      options: {
        'base-url': { type: 'string' },
        json: { type: 'boolean', default: false },
      },
    });

    return {
      help: false,
      json: values.json,
      method: 'GET',
      url: buildUrl(getBaseUrl(values), '/treasury-curve'),
    };
  }

  if (command === 'bonds') {
    const { values } = parseArgs({
      args: rest,
      options: {
        search: { type: 'string' },
        country: { type: 'string' },
        type: { type: 'string' },
        limit: { type: 'string' },
        offset: { type: 'string' },
        'base-url': { type: 'string' },
        json: { type: 'boolean', default: false },
      },
    });

    const query = {
      search: values.search,
      country: values.country,
      type: values.type,
      limit: values.limit,
      offset: values.offset,
    };

    return {
      help: false,
      json: values.json,
      method: 'GET',
      url: buildUrl(getBaseUrl(values), '/bonds', query),
    };
  }

  if (command === 'bond') {
    const { values, positionals } = parseArgs({
      args: rest,
      allowPositionals: true,
      options: {
        'base-url': { type: 'string' },
        json: { type: 'boolean', default: false },
      },
    });

    const identifier = positionals[0];
    if (!identifier) throw new Error('bond requires <identifier>');

    return {
      help: false,
      json: values.json,
      method: 'GET',
      url: buildUrl(getBaseUrl(values), `/bonds/${encodeIdentifier(identifier)}`),
    };
  }

  if (command === 'analytics') {
    const { values, positionals } = parseArgs({
      args: rest,
      allowPositionals: true,
      options: {
        fields: { type: 'string' },
        'base-url': { type: 'string' },
        json: { type: 'boolean', default: false },
      },
    });

    const identifier = positionals[0];
    if (!identifier) throw new Error('analytics requires <identifier>');

    return {
      help: false,
      json: values.json,
      method: 'GET',
      url: buildUrl(getBaseUrl(values), `/bonds/${encodeIdentifier(identifier)}/analytics`, {
        fields: values.fields,
      }),
    };
  }

  if (command === 'cashflows') {
    const { values, positionals } = parseArgs({
      args: rest,
      allowPositionals: true,
      options: {
        settlement: { type: 'string' },
        'base-url': { type: 'string' },
        json: { type: 'boolean', default: false },
      },
    });

    const identifier = positionals[0];
    if (!identifier) throw new Error('cashflows requires <identifier>');

    return {
      help: false,
      json: values.json,
      method: 'GET',
      url: buildUrl(getBaseUrl(values), `/bonds/${encodeIdentifier(identifier)}/cashflows`, {
        settlement: values.settlement,
      }),
    };
  }

  if (command === 'history') {
    const { values, positionals } = parseArgs({
      args: rest,
      allowPositionals: true,
      options: {
        range: { type: 'string' },
        start: { type: 'string' },
        end: { type: 'string' },
        'base-url': { type: 'string' },
        json: { type: 'boolean', default: false },
      },
    });

    const identifier = positionals[0];
    if (!identifier) throw new Error('history requires <identifier>');

    return {
      help: false,
      json: values.json,
      method: 'GET',
      url: buildUrl(getBaseUrl(values), `/bonds/${encodeIdentifier(identifier)}/history`, {
        range: values.range,
        start: values.start,
        end: values.end,
      }),
    };
  }

  if (command === 'calculate') {
    const { values, positionals } = parseArgs({
      args: rest,
      allowPositionals: true,
      options: {
        price: { type: 'string' },
        ytm: { type: 'string' },
        gspread: { type: 'string' },
        zspread: { type: 'string' },
        settlement: { type: 'string' },
        'base-url': { type: 'string' },
        json: { type: 'boolean', default: false },
      },
    });

    const identifier = positionals[0];
    if (!identifier) throw new Error('calculate requires <identifier>');

    const provided = [
      ['price', values.price],
      ['ytm', values.ytm],
      ['gSpread', values.gspread],
      ['zSpread', values.zspread],
    ].filter(([, value]) => value !== undefined);

    if (provided.length !== 1) {
      throw new Error('calculate requires exactly one of --price, --ytm, --gspread, --zspread');
    }

    const [metricName, metricRaw] = provided[0];
    const body = {
      isin: identifier,
      [metricName]: parseNumber(metricRaw, `--${metricName.toLowerCase()}`),
    };

    if (values.settlement) {
      body.settlement = values.settlement;
    }

    return {
      help: false,
      json: values.json,
      method: 'POST',
      url: buildUrl(getBaseUrl(values), '/calculate'),
      body,
    };
  }

  if (command === 'riesgo') {
    const { values } = parseArgs({
      args: rest,
      options: {
        'base-url': { type: 'string' },
        json: { type: 'boolean', default: false },
      },
    });

    return {
      help: false,
      json: values.json,
      method: 'GET',
      url: buildUrl(getBaseUrl(values), '/riesgo-pais'),
    };
  }

  if (command === 'riesgo-history') {
    const { values } = parseArgs({
      args: rest,
      options: {
        range: { type: 'string' },
        start: { type: 'string' },
        end: { type: 'string' },
        'base-url': { type: 'string' },
        json: { type: 'boolean', default: false },
      },
    });

    return {
      help: false,
      json: values.json,
      method: 'GET',
      url: buildUrl(getBaseUrl(values), '/riesgo-pais/history', {
        range: values.range,
        start: values.start,
        end: values.end,
      }),
    };
  }

  throw new Error(`Unknown command: ${command}`);
}

function printResult(result, jsonMode) {
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (typeof result.data === 'string') {
    console.log(result.data);
  } else {
    console.log(JSON.stringify(result.data, null, 2));
  }

  if (result.paid && result.settlement) {
    const payer = result.settlement.payer || 'unknown';
    const tx = result.settlement.transaction || 'unknown';
    const network = result.settlement.network || 'unknown';
    console.error(`[x402] payer=${payer} transaction=${tx} network=${network}`);
  }

  if (result.status >= 400) {
    console.error(`HTTP ${result.status}`);
    if (result.status === 401) {
      console.error('Tip: this deployment may be in Bearer-only mode. x402 might not be enabled.');
    }
    if (result.status === 403) {
      console.error('Tip: /calculate/batch is API-key/Bearer only.');
    }
  }
}

async function main() {
  const parsed = parseCommand(process.argv.slice(2));

  if (parsed.help) {
    printHelp();
    return;
  }

  const result = await requestWithOptionalX402({
    method: parsed.method,
    url: parsed.url,
    body: parsed.body,
  });

  const output = {
    command: parsed.method,
    url: parsed.url,
    status: result.status,
    paid: result.paid,
    settlement: result.settlement,
    data: result.data,
  };

  printResult(output, parsed.json);

  if (result.status >= 400) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
