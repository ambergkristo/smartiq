#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function nowIso() {
  return new Date().toISOString();
}

function todayStamp() {
  return nowIso().slice(0, 10);
}

function parseArg(args, prefix) {
  const hit = args.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : '';
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function run(command, args) {
  return spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8'
  });
}

function parsePrometheus(text) {
  const rows = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const cleaned = line.trim();
    if (!cleaned || cleaned.startsWith('#')) {
      continue;
    }

    const match = cleaned.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{[^}]*\})?\s+([0-9eE.+-]+)$/);
    if (!match) {
      continue;
    }

    const name = match[1];
    const labelText = match[2] || '';
    const value = Number.parseFloat(match[3]);
    if (!Number.isFinite(value)) {
      continue;
    }

    const labels = {};
    const labelsRaw = labelText.slice(1, -1).trim();
    if (labelsRaw) {
      for (const part of labelsRaw.split(',')) {
        const [rawKey, rawValue] = part.split('=');
        if (!rawKey || rawValue == null) {
          continue;
        }
        labels[rawKey.trim()] = rawValue.trim().replace(/^"/, '').replace(/"$/, '');
      }
    }

    rows.push({ name, labels, value });
  }

  return rows;
}

function metricSum(rows, metricName, filters = {}) {
  return rows
    .filter((row) => row.name === metricName)
    .filter((row) => Object.entries(filters).every(([key, value]) => row.labels[key] === value))
    .reduce((sum, row) => sum + row.value, 0);
}

function ratio(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return numerator / denominator;
}

function pct(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function num(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return '0.00';
  }
  return value.toFixed(digits);
}

async function fetchPrometheus(baseUrl) {
  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/actuator/prometheus`);
  if (!response.ok) {
    throw new Error(`prometheus_http_${response.status}`);
  }
  return response.text();
}

function buildReport({
  reportDate,
  sourceText,
  branch,
  sha,
  metrics
}) {
  const startedGames = metricSum(metrics, 'smartiq_game_session_started_total');
  const completedGames = metricSum(metrics, 'smartiq_game_session_completed_total');
  const completedRounds = metricSum(metrics, 'smartiq_game_round_completed_total');

  const gameDurationCount = metricSum(metrics, 'smartiq_game_duration_seconds_count');
  const gameDurationSum = metricSum(metrics, 'smartiq_game_duration_seconds_sum');
  const roundDurationCount = metricSum(metrics, 'smartiq_game_round_duration_seconds_count');
  const roundDurationSum = metricSum(metrics, 'smartiq_game_round_duration_seconds_sum');

  const passActions = metricSum(metrics, 'smartiq_game_action_total', { type: 'pass' });
  const answerActions = metricSum(metrics, 'smartiq_game_action_total', { type: 'answer' });
  const totalTurnActions = passActions + answerActions;

  const wrongAnswers = metricSum(metrics, 'smartiq_game_answer_total', { outcome: 'wrong' });
  const correctAnswers = metricSum(metrics, 'smartiq_game_answer_total', { outcome: 'correct' });
  const totalAnswers = wrongAnswers + correctAnswers;

  const rejoinSuccess = metricSum(metrics, 'smartiq_room_rejoin_total', { result: 'success' });
  const rejoinFailure = metricSum(metrics, 'smartiq_room_rejoin_total', { result: 'failure' });
  const rejoinTotal = rejoinSuccess + rejoinFailure;

  const joinSuccess = metricSum(metrics, 'smartiq_room_join_total', { result: 'success' });
  const joinFailure = metricSum(metrics, 'smartiq_room_join_total', { result: 'failure' });
  const joinTotal = joinSuccess + joinFailure;

  const wsConnectSuccess = metricSum(metrics, 'smartiq_room_ws_connect_total', { result: 'success' });
  const wsConnectFailure = metricSum(metrics, 'smartiq_room_ws_connect_total', { result: 'failure' });
  const wsConnectTotal = wsConnectSuccess + wsConnectFailure;

  const avgGameLength = ratio(gameDurationSum, gameDurationCount);
  const avgRoundLength = ratio(roundDurationSum, roundDurationCount);
  const passRate = ratio(passActions, totalTurnActions);
  const wrongAnswerRate = ratio(wrongAnswers, totalAnswers);
  const dropOffRate = ratio(Math.max(0, startedGames - completedGames), startedGames);
  const reconnectSuccessRate = ratio(rejoinSuccess, rejoinTotal);
  const joinFailureRate = ratio(joinFailure, joinTotal);
  const wsConnectFailureRate = ratio(wsConnectFailure, wsConnectTotal);

  return [
    '# Closed Beta Summary',
    '',
    '## Metadata',
    '',
    `- Generated at: ${reportDate}`,
    `- Source: ${sourceText}`,
    `- Branch: ${branch}`,
    `- Commit SHA: ${sha}`,
    '',
    '## KPI Summary',
    '',
    '| KPI | Value |',
    '| --- | --- |',
    `| Average game length | ${num(avgGameLength)} s |`,
    `| Average round length | ${num(avgRoundLength)} s |`,
    `| Pass rate | ${pct(passRate)} |`,
    `| Wrong-answer rate | ${pct(wrongAnswerRate)} |`,
    `| Drop-off rate | ${pct(dropOffRate)} |`,
    `| Reconnect success rate (optional) | ${pct(reconnectSuccessRate)} |`,
    `| Room join failure rate (optional) | ${pct(joinFailureRate)} |`,
    `| WebSocket connect failure rate (optional) | ${pct(wsConnectFailureRate)} |`,
    '',
    '## Raw Totals',
    '',
    '| Metric | Total |',
    '| --- | ---: |',
    `| Games started | ${num(startedGames, 0)} |`,
    `| Games completed | ${num(completedGames, 0)} |`,
    `| Rounds completed | ${num(completedRounds, 0)} |`,
    `| Turn actions (pass) | ${num(passActions, 0)} |`,
    `| Turn actions (answer) | ${num(answerActions, 0)} |`,
    `| Answers (wrong) | ${num(wrongAnswers, 0)} |`,
    `| Answers (correct) | ${num(correctAnswers, 0)} |`,
    `| Rejoin (success) | ${num(rejoinSuccess, 0)} |`,
    `| Rejoin (failure) | ${num(rejoinFailure, 0)} |`,
    `| Join (success) | ${num(joinSuccess, 0)} |`,
    `| Join (failure) | ${num(joinFailure, 0)} |`,
    `| WS connect (success) | ${num(wsConnectSuccess, 0)} |`,
    `| WS connect (failure) | ${num(wsConnectFailure, 0)} |`,
    '',
    '## Findings',
    '',
    '- Top blockers:',
    '- Player confusion points:',
    '- Notable incident IDs:',
    '',
    '## Decision',
    '',
    '- Recommendation: `GO` / `NO-GO`',
    '- Required follow-up tickets (`fix/beta-findings-*`):',
    ''
  ].join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const backendArg = parseArg(args, '--backend-url=');
  const outArg = parseArg(args, '--out=');
  const metricsFileArg = parseArg(args, '--prometheus-file=');

  const backendUrl = backendArg || (process.env.BACKEND_URL || '').trim();
  const outputPath = path.resolve(
    process.cwd(),
    outArg || `docs/reports/beta-summary-${todayStamp()}.md`
  );

  let metricsText = '';
  let sourceText = '';
  if (metricsFileArg) {
    const metricsPath = path.resolve(process.cwd(), metricsFileArg);
    metricsText = fs.readFileSync(metricsPath, 'utf8');
    sourceText = `prometheus file (${metricsPath})`;
  } else {
    if (!backendUrl) {
      console.error('BACKEND_URL is required (or pass --backend-url=...)');
      process.exit(1);
    }
    metricsText = await fetchPrometheus(backendUrl);
    sourceText = `${backendUrl.replace(/\/+$/, '')}/actuator/prometheus`;
  }

  const metrics = parsePrometheus(metricsText);
  const branch = run('git', ['branch', '--show-current']).stdout.trim() || 'unknown';
  const sha = run('git', ['rev-parse', '--short', 'HEAD']).stdout.trim() || 'unknown';
  const report = buildReport({
    reportDate: nowIso(),
    sourceText,
    branch,
    sha,
    metrics
  });

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, report, 'utf8');
  console.log(`Beta summary report written: ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
