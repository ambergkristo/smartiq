#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const COPY_DELTA_PATH = 'docs/plans/2026-03-05-m2-copy-delta-register.csv';
const PROVENANCE_PATH = 'docs/plans/2026-03-05-m2-branding-asset-provenance.csv';
const LEGAL_MEMO_PATH = 'docs/plans/2026-03-05-m2-legal-ip-assessment.md';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function resolveAndRead(filePath) {
  const absolute = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolute)) {
    fail(`Missing required file: ${filePath}`);
  }
  return fs.readFileSync(absolute, 'utf8');
}

function parseCsv(raw, expectedHeaders, fileLabel) {
  const normalized = raw.replace(/\r\n/g, '\n').trim();
  const lines = normalized.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    fail(`${fileLabel} must include header and at least one data row`);
  }

  const header = lines[0].split(',').map((part) => part.trim());
  if (header.join(',') !== expectedHeaders.join(',')) {
    fail(
      `${fileLabel} header mismatch. Expected "${expectedHeaders.join(',')}", got "${header.join(',')}"`
    );
  }

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const parts = lines[i].split(',').map((part) => part.trim());
    if (parts.length !== expectedHeaders.length) {
      fail(`${fileLabel} row ${i + 1} has incorrect column count`);
    }
    const row = {};
    expectedHeaders.forEach((key, idx) => {
      row[key] = parts[idx];
    });
    rows.push(row);
  }
  return rows;
}

function parseLegalDecision(raw) {
  const decisionMatch = raw.match(/^Decision:\s*(GO|NO_GO|PENDING)\s*$/m);
  const signoffMatch = raw.match(/^Owner Sign-off:\s*(.+)\s*$/m);

  if (!decisionMatch) {
    fail(`Missing or invalid "Decision:" line in ${LEGAL_MEMO_PATH}`);
  }
  if (!signoffMatch) {
    fail(`Missing "Owner Sign-off:" line in ${LEGAL_MEMO_PATH}`);
  }

  return {
    decision: decisionMatch[1],
    signoff: signoffMatch[1]
  };
}

function main() {
  const copyRows = parseCsv(
    resolveAndRead(COPY_DELTA_PATH),
    ['term_id', 'legacy_term', 'new_term', 'category', 'rationale', 'review_status', 'owner'],
    COPY_DELTA_PATH
  );

  const provenanceRows = parseCsv(
    resolveAndRead(PROVENANCE_PATH),
    [
      'asset_id',
      'asset_type',
      'file_path',
      'source_type',
      'source_reference',
      'license',
      'review_status',
      'owner',
      'notes'
    ],
    PROVENANCE_PATH
  );

  const legal = parseLegalDecision(resolveAndRead(LEGAL_MEMO_PATH));

  const validStatuses = new Set(['approved', 'pending', 'rejected']);

  const invalidCopy = copyRows.filter((row) => !validStatuses.has(row.review_status));
  const invalidProvenance = provenanceRows.filter((row) => !validStatuses.has(row.review_status));

  if (invalidCopy.length > 0) {
    fail(`${COPY_DELTA_PATH} contains invalid review_status values`);
  }
  if (invalidProvenance.length > 0) {
    fail(`${PROVENANCE_PATH} contains invalid review_status values`);
  }

  const copyPendingOrRejected = copyRows.filter((row) => row.review_status !== 'approved').length;
  const provenancePendingOrRejected = provenanceRows.filter((row) => row.review_status !== 'approved').length;

  const signoffTbd = /^TBD/i.test(legal.signoff);
  const legalReady = legal.decision === 'GO' && !signoffTbd;
  const gatePass = copyPendingOrRejected === 0 && provenancePendingOrRejected === 0 && legalReady;

  const output = {
    ok: gatePass,
    files: {
      copyDelta: COPY_DELTA_PATH,
      brandingProvenance: PROVENANCE_PATH,
      legalMemo: LEGAL_MEMO_PATH
    },
    checks: {
      copyPendingOrRejected,
      provenancePendingOrRejected,
      legalDecision: legal.decision,
      legalSignoff: legal.signoff
    }
  };

  console.log(JSON.stringify(output, null, 2));

  if (!gatePass) {
    process.exit(1);
  }
}

main();
