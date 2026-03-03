#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const rulesPathArg = process.argv[2] || 'ops/prometheus/smartiq-beta-kpi-alert-rules.yml';
const rulesPath = path.resolve(process.cwd(), rulesPathArg);

const requiredAlerts = [
  {
    name: 'SmartIQHighDropOffRate',
    metrics: ['smartiq_game_session_started_total', 'smartiq_game_session_completed_total']
  },
  {
    name: 'SmartIQHighWrongAnswerRate',
    metrics: ['smartiq_game_answer_total']
  },
  {
    name: 'SmartIQLowReconnectSuccessRate',
    metrics: ['smartiq_room_rejoin_total']
  },
  {
    name: 'SmartIQHighJoinFailureRate',
    metrics: ['smartiq_room_join_total']
  },
  {
    name: 'SmartIQHighWsConnectFailureRate',
    metrics: ['smartiq_room_ws_connect_total']
  },
  {
    name: 'SmartIQCapacityEvictionsSpike',
    metrics: ['smartiq_game_session_evicted_total']
  },
  {
    name: 'SmartIQHighActionRejectRate',
    metrics: ['smartiq_game_action_rejected_total', 'smartiq_game_action_total']
  }
];

function parseAlertBlocks(content) {
  const startPattern = /-\s*alert:\s*([A-Za-z0-9_]+)/g;
  const starts = [];
  let match = null;
  while ((match = startPattern.exec(content)) != null) {
    starts.push({ name: match[1], index: match.index });
  }

  const blocks = new Map();
  for (let index = 0; index < starts.length; index += 1) {
    const current = starts[index];
    const next = starts[index + 1];
    const end = next ? next.index : content.length;
    blocks.set(current.name, content.slice(current.index, end));
  }
  return blocks;
}

function hasExpr(block) {
  return /(^|\n)\s*expr:\s*/.test(block);
}

function hasForWindow(block) {
  return /(^|\n)\s*for:\s*[0-9]+[smhd]/.test(block);
}

function hasSeverity(block) {
  return /(^|\n)\s*severity:\s*(warning|critical)/.test(block);
}

function main() {
  if (!fs.existsSync(rulesPath)) {
    console.error(`Alert rules file not found: ${rulesPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(rulesPath, 'utf8');
  const alertBlocks = parseAlertBlocks(content);
  const issues = [];

  for (const required of requiredAlerts) {
    const block = alertBlocks.get(required.name);
    if (!block) {
      issues.push(`Missing required alert: ${required.name}`);
      continue;
    }
    if (!hasExpr(block)) {
      issues.push(`Alert ${required.name} is missing expr`);
    }
    if (!hasForWindow(block)) {
      issues.push(`Alert ${required.name} is missing for window`);
    }
    if (!hasSeverity(block)) {
      issues.push(`Alert ${required.name} is missing severity label`);
    }
    for (const metric of required.metrics) {
      if (!block.includes(metric)) {
        issues.push(`Alert ${required.name} is missing metric reference: ${metric}`);
      }
    }
  }

  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(issue);
    }
    process.exit(1);
  }

  const summary = {
    ok: true,
    path: path.relative(process.cwd(), rulesPath).replace(/\\/g, '/'),
    requiredAlertCount: requiredAlerts.length,
    discoveredAlertCount: alertBlocks.size,
    validatedAlerts: requiredAlerts.map((item) => item.name)
  };
  console.log(JSON.stringify(summary, null, 2));
  console.log('\nBeta KPI alert rules validation passed.');
}

main();
