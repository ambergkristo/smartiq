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

function hasFlag(args, flag) {
  return args.includes(flag);
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

function parseNumberOption({
  args,
  prefix,
  envKey,
  defaultValue,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY
}) {
  const argValue = parseArg(args, prefix);
  const raw = argValue !== '' ? argValue : (envKey ? (process.env[envKey] || '') : '');
  if (raw === '') {
    return defaultValue;
  }

  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value for ${prefix}: ${raw}`);
  }
  if (parsed < min || parsed > max) {
    throw new Error(`Value out of range for ${prefix}: ${raw} (expected ${min}..${max})`);
  }
  return parsed;
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
    return null;
  }
  return numerator / denominator;
}

function pct(value) {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }
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

function computeKpis(metrics) {
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

  return {
    startedGames,
    completedGames,
    completedRounds,
    gameDurationCount,
    gameDurationSum,
    roundDurationCount,
    roundDurationSum,
    passActions,
    answerActions,
    totalTurnActions,
    wrongAnswers,
    correctAnswers,
    totalAnswers,
    rejoinSuccess,
    rejoinFailure,
    rejoinTotal,
    joinSuccess,
    joinFailure,
    joinTotal,
    wsConnectSuccess,
    wsConnectFailure,
    wsConnectTotal,
    avgGameLength,
    avgRoundLength,
    passRate,
    wrongAnswerRate,
    dropOffRate,
    reconnectSuccessRate,
    joinFailureRate,
    wsConnectFailureRate
  };
}

function evaluateDecision(kpis, thresholds) {
  const checks = [];

  function addCheck({ label, actual, comparator, threshold, format = num }) {
    const hasActual = Number.isFinite(actual);
    const pass = hasActual
      ? (comparator === '<=' ? actual <= threshold : actual >= threshold)
      : false;
    checks.push({
      label,
      pass,
      actualText: hasActual ? format(actual) : 'n/a',
      thresholdText: `${comparator} ${format(threshold)}`
    });
  }

  addCheck({
    label: 'Games started',
    actual: kpis.startedGames,
    comparator: '>=',
    threshold: thresholds.minStartedGames,
    format: (value) => num(value, 0)
  });
  addCheck({
    label: 'Games completed',
    actual: kpis.completedGames,
    comparator: '>=',
    threshold: thresholds.minCompletedGames,
    format: (value) => num(value, 0)
  });
  addCheck({
    label: 'Drop-off rate',
    actual: kpis.dropOffRate,
    comparator: '<=',
    threshold: thresholds.maxDropOffRate,
    format: pct
  });
  addCheck({
    label: 'Wrong-answer rate',
    actual: kpis.wrongAnswerRate,
    comparator: '<=',
    threshold: thresholds.maxWrongAnswerRate,
    format: pct
  });

  if (thresholds.minReconnectSuccessRate != null) {
    addCheck({
      label: 'Reconnect success rate',
      actual: kpis.reconnectSuccessRate,
      comparator: '>=',
      threshold: thresholds.minReconnectSuccessRate,
      format: pct
    });
  }
  if (thresholds.maxJoinFailureRate != null) {
    addCheck({
      label: 'Room join failure rate',
      actual: kpis.joinFailureRate,
      comparator: '<=',
      threshold: thresholds.maxJoinFailureRate,
      format: pct
    });
  }
  if (thresholds.maxWsConnectFailureRate != null) {
    addCheck({
      label: 'WS connect failure rate',
      actual: kpis.wsConnectFailureRate,
      comparator: '<=',
      threshold: thresholds.maxWsConnectFailureRate,
      format: pct
    });
  }

  const failed = checks.filter((check) => !check.pass);
  return {
    checks,
    recommendation: failed.length === 0 ? 'GO' : 'NO-GO',
    failedCount: failed.length
  };
}

function buildReport({
  reportDate,
  sourceText,
  branch,
  sha,
  kpis,
  thresholds,
  decision
}) {
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
    `| Average game length | ${num(kpis.avgGameLength)} s |`,
    `| Average round length | ${num(kpis.avgRoundLength)} s |`,
    `| Pass rate | ${pct(kpis.passRate)} |`,
    `| Wrong-answer rate | ${pct(kpis.wrongAnswerRate)} |`,
    `| Drop-off rate | ${pct(kpis.dropOffRate)} |`,
    `| Reconnect success rate (optional) | ${pct(kpis.reconnectSuccessRate)} |`,
    `| Room join failure rate (optional) | ${pct(kpis.joinFailureRate)} |`,
    `| WebSocket connect failure rate (optional) | ${pct(kpis.wsConnectFailureRate)} |`,
    '',
    '## Raw Totals',
    '',
    '| Metric | Total |',
    '| --- | ---: |',
    `| Games started | ${num(kpis.startedGames, 0)} |`,
    `| Games completed | ${num(kpis.completedGames, 0)} |`,
    `| Rounds completed | ${num(kpis.completedRounds, 0)} |`,
    `| Turn actions (pass) | ${num(kpis.passActions, 0)} |`,
    `| Turn actions (answer) | ${num(kpis.answerActions, 0)} |`,
    `| Answers (wrong) | ${num(kpis.wrongAnswers, 0)} |`,
    `| Answers (correct) | ${num(kpis.correctAnswers, 0)} |`,
    `| Rejoin (success) | ${num(kpis.rejoinSuccess, 0)} |`,
    `| Rejoin (failure) | ${num(kpis.rejoinFailure, 0)} |`,
    `| Join (success) | ${num(kpis.joinSuccess, 0)} |`,
    `| Join (failure) | ${num(kpis.joinFailure, 0)} |`,
    `| WS connect (success) | ${num(kpis.wsConnectSuccess, 0)} |`,
    `| WS connect (failure) | ${num(kpis.wsConnectFailure, 0)} |`,
    '',
    '## Decision Inputs',
    '',
    `- Min games started: ${num(thresholds.minStartedGames, 0)}`,
    `- Min games completed: ${num(thresholds.minCompletedGames, 0)}`,
    `- Max drop-off rate: ${pct(thresholds.maxDropOffRate)}`,
    `- Max wrong-answer rate: ${pct(thresholds.maxWrongAnswerRate)}`,
    `- Min reconnect success rate (optional): ${thresholds.minReconnectSuccessRate == null ? 'disabled' : pct(thresholds.minReconnectSuccessRate)}`,
    `- Max room join failure rate (optional): ${thresholds.maxJoinFailureRate == null ? 'disabled' : pct(thresholds.maxJoinFailureRate)}`,
    `- Max WS connect failure rate (optional): ${thresholds.maxWsConnectFailureRate == null ? 'disabled' : pct(thresholds.maxWsConnectFailureRate)}`,
    '',
    '## Decision',
    '',
    `- Recommendation: \`${decision.recommendation}\``,
    `- Failed checks: ${decision.failedCount}`,
    '',
    '| Check | Result | Actual | Threshold |',
    '| --- | --- | --- | --- |',
    ...decision.checks.map((check) => `| ${check.label} | ${check.pass ? 'PASS' : 'FAIL'} | ${check.actualText} | ${check.thresholdText} |`),
    '',
    '## Findings',
    '',
    '- Top blockers:',
    '- Player confusion points:',
    '- Notable incident IDs:',
    '',
    '- Required follow-up tickets (`fix/beta-findings-*`):',
    ''
  ].join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const backendArg = parseArg(args, '--backend-url=');
  const outArg = parseArg(args, '--out=');
  const metricsFileArg = parseArg(args, '--prometheus-file=');
  const failOnNoGo = hasFlag(args, '--fail-on-no-go')
    || String(process.env.BETA_FAIL_ON_NO_GO || '').toLowerCase() === 'true';

  const thresholds = {
    minStartedGames: Math.floor(parseNumberOption({
      args,
      prefix: '--min-started-games=',
      envKey: 'BETA_MIN_STARTED_GAMES',
      defaultValue: 1,
      min: 0
    })),
    minCompletedGames: Math.floor(parseNumberOption({
      args,
      prefix: '--min-completed-games=',
      envKey: 'BETA_MIN_COMPLETED_GAMES',
      defaultValue: 1,
      min: 0
    })),
    maxDropOffRate: parseNumberOption({
      args,
      prefix: '--max-dropoff=',
      envKey: 'BETA_MAX_DROPOFF_RATE',
      defaultValue: 0.40,
      min: 0,
      max: 1
    }),
    maxWrongAnswerRate: parseNumberOption({
      args,
      prefix: '--max-wrong-answer=',
      envKey: 'BETA_MAX_WRONG_ANSWER_RATE',
      defaultValue: 0.50,
      min: 0,
      max: 1
    }),
    minReconnectSuccessRate: parseNumberOption({
      args,
      prefix: '--min-reconnect-success=',
      envKey: 'BETA_MIN_RECONNECT_SUCCESS_RATE',
      defaultValue: null,
      min: 0,
      max: 1
    }),
    maxJoinFailureRate: parseNumberOption({
      args,
      prefix: '--max-join-failure=',
      envKey: 'BETA_MAX_JOIN_FAILURE_RATE',
      defaultValue: null,
      min: 0,
      max: 1
    }),
    maxWsConnectFailureRate: parseNumberOption({
      args,
      prefix: '--max-ws-failure=',
      envKey: 'BETA_MAX_WS_CONNECT_FAILURE_RATE',
      defaultValue: null,
      min: 0,
      max: 1
    })
  };

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
  const kpis = computeKpis(metrics);
  const decision = evaluateDecision(kpis, thresholds);

  const branch = run('git', ['branch', '--show-current']).stdout.trim() || 'unknown';
  const sha = run('git', ['rev-parse', '--short', 'HEAD']).stdout.trim() || 'unknown';

  const report = buildReport({
    reportDate: nowIso(),
    sourceText,
    branch,
    sha,
    kpis,
    thresholds,
    decision
  });

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, report, 'utf8');
  console.log(`Beta summary report written: ${outputPath}`);
  console.log(`Recommendation: ${decision.recommendation} (failed checks: ${decision.failedCount})`);

  if (failOnNoGo && decision.recommendation === 'NO-GO') {
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
