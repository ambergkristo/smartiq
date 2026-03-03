#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function parseArg(args, prefix) {
  const hit = args.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : '';
}

function nowIso() {
  return new Date().toISOString();
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function gitShortSha() {
  const result = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    return 'unknown';
  }
  return (result.stdout || '').trim() || 'unknown';
}

function asInt(raw, fallback = 0) {
  const parsed = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

function gateRecommendation(gateExitCode) {
  if (gateExitCode === 0) {
    return 'GO';
  }
  if (gateExitCode === 2) {
    return 'NO-GO';
  }
  return 'ERROR';
}

function parseBetaReport(reportPath) {
  if (!reportPath || !fs.existsSync(reportPath)) {
    return {
      exists: false,
      recommendation: 'n/a',
      failedChecks: 'n/a'
    };
  }

  const content = fs.readFileSync(reportPath, 'utf8');
  const recommendationMatch = content.match(/Recommendation:\s*`([^`]+)`/);
  const failedChecksMatch = content.match(/Failed checks:\s*([0-9]+)/);

  return {
    exists: true,
    recommendation: recommendationMatch ? recommendationMatch[1] : 'n/a',
    failedChecks: failedChecksMatch ? failedChecksMatch[1] : 'n/a'
  };
}

function buildMarkdown({
  generatedAt,
  candidateSha,
  backendUrl,
  workflowRunId,
  workflowRunUrl,
  reportPath,
  smokeExitCode,
  gateExitCode,
  thresholds,
  reportMeta
}) {
  const smokeStatus = smokeExitCode === 0 ? 'PASS' : 'FAIL';
  const gateStatus = gateExitCode === 0 ? 'PASS' : 'FAIL';
  const recommendation = gateRecommendation(gateExitCode);
  const syntheticDryRunStatus = smokeExitCode === 0 && gateExitCode === 0 ? 'PASS' : 'FAIL';
  const normalizedReportPath = reportPath.replace(/\\/g, '/');

  return [
    '# Phase 7 Beta Dry-Run Evidence',
    '',
    '## Metadata',
    '',
    `- Generated at (UTC): ${generatedAt}`,
    `- Candidate commit SHA: ${candidateSha}`,
    `- Backend URL: ${backendUrl || 'n/a'}`,
    `- Workflow run ID: ${workflowRunId || 'n/a'}`,
    `- Workflow run URL: ${workflowRunUrl || 'n/a'}`,
    `- Beta summary report path: ${normalizedReportPath || 'n/a'}`,
    '',
    '## Automated Gate Results',
    '',
    '| Check | Status | Detail |',
    '| --- | --- | --- |',
    `| Public smoke test | ${smokeStatus} | exitCode=${smokeExitCode} |`,
    `| Beta go/no-go gate | ${gateStatus} | exitCode=${gateExitCode}, recommendation=${recommendation} |`,
    `| Synthetic dry-run aggregate | ${syntheticDryRunStatus} | smoke + gate combined |`,
    '',
    '## Beta Summary Extract',
    '',
    `- Report exists: ${reportMeta.exists ? 'yes' : 'no'}`,
    `- Report recommendation: ${reportMeta.recommendation}`,
    `- Report failed checks: ${reportMeta.failedChecks}`,
    '',
    '## Thresholds Used',
    '',
    `- min_started_games: ${thresholds.minStartedGames}`,
    `- min_completed_games: ${thresholds.minCompletedGames}`,
    `- max_dropoff: ${thresholds.maxDropoff}`,
    `- max_wrong_answer: ${thresholds.maxWrongAnswer}`,
    `- min_reconnect_success: ${thresholds.minReconnectSuccess}`,
    `- max_join_failure: ${thresholds.maxJoinFailure}`,
    `- max_ws_failure: ${thresholds.maxWsFailure}`,
    '',
    '## Manual Dry-Run Validation (Fill Manually)',
    '',
    '| Item | Status | Notes |',
    '| --- | --- | --- |',
    '| Room create/join/rejoin flow | PENDING |  |',
    '| Completed game flow | PENDING |  |',
    '| No Sev-1 blockers | PENDING |  |',
    '| No Sev-2 blockers | PENDING |  |',
    '| Rollback rehearsal | PENDING |  |',
    '',
    '## Final Decision',
    '',
    '- Decision (`GO` / `NO-GO`): PENDING',
    '- Decision owner: PENDING',
    '- Decision timestamp (UTC): PENDING'
  ].join('\n');
}

function main() {
  const args = process.argv.slice(2);

  const outArg = parseArg(args, '--out=');
  const backendUrl = parseArg(args, '--backend-url=') || (process.env.BACKEND_URL || '').trim();
  const candidateSha = parseArg(args, '--candidate-sha=') || (process.env.GITHUB_SHA || '').trim() || gitShortSha();
  const workflowRunId = parseArg(args, '--workflow-run-id=') || (process.env.GITHUB_RUN_ID || '').trim();
  const workflowRunUrl = parseArg(args, '--workflow-run-url=')
    || ((process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID)
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : '');
  const reportPathRaw = parseArg(args, '--report-path=');
  const reportPath = reportPathRaw ? path.resolve(process.cwd(), reportPathRaw) : '';

  const smokeExitCode = asInt(parseArg(args, '--smoke-exit-code='), 1);
  const gateExitCode = asInt(parseArg(args, '--gate-exit-code='), 1);

  const thresholds = {
    minStartedGames: parseArg(args, '--min-started-games=') || 'n/a',
    minCompletedGames: parseArg(args, '--min-completed-games=') || 'n/a',
    maxDropoff: parseArg(args, '--max-dropoff=') || 'n/a',
    maxWrongAnswer: parseArg(args, '--max-wrong-answer=') || 'n/a',
    minReconnectSuccess: parseArg(args, '--min-reconnect-success=') || 'n/a',
    maxJoinFailure: parseArg(args, '--max-join-failure=') || 'n/a',
    maxWsFailure: parseArg(args, '--max-ws-failure=') || 'n/a'
  };

  const outputPath = path.resolve(
    process.cwd(),
    outArg || `docs/reports/phase7-dry-run-evidence-${Date.now()}.md`
  );

  const reportMeta = parseBetaReport(reportPath);
  const markdown = buildMarkdown({
    generatedAt: nowIso(),
    candidateSha,
    backendUrl,
    workflowRunId,
    workflowRunUrl,
    reportPath: reportPath || 'n/a',
    smokeExitCode,
    gateExitCode,
    thresholds,
    reportMeta
  });

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, markdown, 'utf8');
  console.log(`Phase 7 dry-run evidence written: ${outputPath}`);
}

main();
