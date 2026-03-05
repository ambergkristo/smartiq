#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function resolvePath(value) {
  if (!value) {
    return null;
  }
  return path.resolve(process.cwd(), value);
}

function parseArgs(argv) {
  const args = {
    ledger: 'docs/plans/2026-03-05-m1-payment-signal-ledger.json',
    outreach: null,
    discovery: null,
    pilot: null,
    mode: 'merge'
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];

    if (token === '--ledger') {
      args.ledger = next;
      i += 1;
      continue;
    }
    if (token === '--outreach') {
      args.outreach = next;
      i += 1;
      continue;
    }
    if (token === '--discovery') {
      args.discovery = next;
      i += 1;
      continue;
    }
    if (token === '--pilot') {
      args.pilot = next;
      i += 1;
      continue;
    }
    if (token === '--mode') {
      args.mode = next;
      i += 1;
      continue;
    }
    fail(`Unknown argument: ${token}`);
  }

  if (args.mode !== 'merge' && args.mode !== 'replace') {
    fail('Invalid --mode. Use "merge" or "replace".');
  }

  return args;
}

function loadJson(filePath) {
  const absolute = resolvePath(filePath);
  if (!absolute || !fs.existsSync(absolute)) {
    fail(`Missing ledger file: ${filePath}`);
  }
  try {
    return JSON.parse(fs.readFileSync(absolute, 'utf8'));
  } catch (error) {
    fail(`Invalid JSON in ledger file: ${error.message}`);
  }
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = i + 1 < line.length ? line[i + 1] : '';

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseCsv(filePath, expectedHeaders) {
  if (!filePath) {
    return [];
  }
  const absolute = resolvePath(filePath);
  if (!absolute || !fs.existsSync(absolute)) {
    fail(`Missing CSV file: ${filePath}`);
  }

  const raw = fs.readFileSync(absolute, 'utf8').replace(/\r\n/g, '\n');
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const header = parseCsvLine(lines[0]);
  if (header.length !== expectedHeaders.length) {
    fail(`CSV header size mismatch in ${filePath}`);
  }

  for (let i = 0; i < expectedHeaders.length; i += 1) {
    if (header[i] !== expectedHeaders[i]) {
      fail(
        `CSV header mismatch in ${filePath}. Expected "${expectedHeaders.join(',')}", got "${header.join(',')}"`
      );
    }
  }

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    if (values.length !== expectedHeaders.length) {
      fail(`CSV row ${i + 1} size mismatch in ${filePath}`);
    }
    const row = {};
    for (let j = 0; j < expectedHeaders.length; j += 1) {
      row[expectedHeaders[j]] = values[j];
    }
    rows.push(row);
  }

  return rows;
}

function parseBool(raw, fieldName, rowId) {
  const value = String(raw).toLowerCase();
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  fail(`Invalid boolean "${raw}" for ${fieldName} at row ${rowId || 'unknown'}`);
}

function mapOutreach(rows) {
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    organization: row.organization,
    channel: row.channel,
    status: row.status,
    qualified: parseBool(row.qualified, 'qualified', row.id),
    owner: row.owner
  }));
}

function mapDiscovery(rows) {
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    organization: row.organization,
    qualified: parseBool(row.qualified, 'qualified', row.id),
    outcome: row.outcome,
    owner: row.owner
  }));
}

function mapPilot(rows) {
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    organization: row.organization,
    signalType: row.signalType,
    sourceCallId: row.sourceCallId,
    owner: row.owner
  }));
}

function mergeById(existing, incoming) {
  const byId = new Map();
  for (const row of existing) {
    byId.set(row.id, row);
  }
  for (const row of incoming) {
    byId.set(row.id, row);
  }
  return Array.from(byId.values());
}

function countQualified(rows) {
  return rows.filter((row) => row.qualified === true).length;
}

function countPilotReady(rows) {
  return rows.filter((row) => row.signalType === 'paid_pilot_ready').length;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function main() {
  const args = parseArgs(process.argv);
  const ledger = loadJson(args.ledger);

  const outreachRows = mapOutreach(
    parseCsv(args.outreach, ['id', 'date', 'organization', 'channel', 'status', 'qualified', 'owner'])
  );
  const discoveryRows = mapDiscovery(
    parseCsv(args.discovery, ['id', 'date', 'organization', 'qualified', 'outcome', 'owner'])
  );
  const pilotRows = mapPilot(
    parseCsv(args.pilot, ['id', 'date', 'organization', 'signalType', 'sourceCallId', 'owner'])
  );

  if (args.mode === 'replace') {
    if (args.outreach) {
      ledger.outreachAttempts = outreachRows;
    }
    if (args.discovery) {
      ledger.discoveryCalls = discoveryRows;
    }
    if (args.pilot) {
      ledger.pilotIntentSignals = pilotRows;
    }
  } else {
    if (args.outreach) {
      ledger.outreachAttempts = mergeById(ledger.outreachAttempts || [], outreachRows);
    }
    if (args.discovery) {
      ledger.discoveryCalls = mergeById(ledger.discoveryCalls || [], discoveryRows);
    }
    if (args.pilot) {
      ledger.pilotIntentSignals = mergeById(ledger.pilotIntentSignals || [], pilotRows);
    }
  }

  const outreachCount = countQualified(ledger.outreachAttempts || []);
  const discoveryCount = countQualified(ledger.discoveryCalls || []);
  const pilotCount = countPilotReady(ledger.pilotIntentSignals || []);

  const targets = ledger.targets || {};
  const m1Complete =
    outreachCount >= (targets.outreachAttemptsMin || 0) &&
    discoveryCount >= (targets.discoveryCallsMin || 0) &&
    pilotCount >= (targets.paidPilotReadySignalsMin || 0);

  ledger.updatedAt = todayIso();
  ledger.status = m1Complete ? 'ready_for_gate' : 'in_progress';

  const ledgerAbsolute = resolvePath(args.ledger);
  fs.writeFileSync(ledgerAbsolute, JSON.stringify(ledger, null, 2) + '\n', 'utf8');

  console.log(
    JSON.stringify(
      {
        ok: true,
        ledger: args.ledger,
        status: ledger.status,
        counts: {
          qualifiedOutreachAttempts: outreachCount,
          qualifiedDiscoveryCalls: discoveryCount,
          paidPilotReadySignals: pilotCount
        },
        targets: {
          qualifiedOutreachAttempts: targets.outreachAttemptsMin || 0,
          qualifiedDiscoveryCalls: targets.discoveryCallsMin || 0,
          paidPilotReadySignals: targets.paidPilotReadySignalsMin || 0
        }
      },
      null,
      2
    )
  );
}

main();
