#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i];
    if (!part.startsWith('--')) {
      continue;
    }
    const eqIndex = part.indexOf('=');
    if (eqIndex > -1) {
      const key = part.slice(2, eqIndex);
      const value = part.slice(eqIndex + 1);
      args[key] = value;
      continue;
    }
    const key = part.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function run(command, allowFailure = false) {
  try {
    const stdout = execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, stdout: stdout.trim() };
  } catch (error) {
    if (allowFailure) {
      return {
        ok: false,
        stdout: (error.stdout || '').toString().trim(),
        stderr: (error.stderr || '').toString().trim()
      };
    }
    throw error;
  }
}

function toInt(value) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortByUpdatedDesc(rows) {
  return rows.sort((a, b) => {
    const aTs = Date.parse(a.updated);
    const bTs = Date.parse(b.updated);
    return bTs - aTs;
  });
}

function classifyRoute(row) {
  if (row.prState === 'OPEN') {
    return { route: 'Skip', reason: 'Open PR exists; not consolidated in this pass' };
  }
  if (row.ahead === 0) {
    return { route: 'No action', reason: 'No commits ahead of base branch' };
  }
  if (row.prState === 'MERGED') {
    return { route: 'Skip', reason: 'Already merged via PR (squash/rebase lineage allowed)' };
  }
  if (row.plusCount === 0) {
    return { route: 'Skip', reason: 'No unique patch left against base (git cherry + count = 0)' };
  }
  if (row.prState === 'CLOSED') {
    return { route: 'Investigate', reason: 'Closed PR and unique commits remain' };
  }
  return { route: 'Investigate', reason: 'Ahead commits exist with no merged PR evidence' };
}

function toTableRow(cells) {
  return `| ${cells.join(' | ')} |`;
}

function buildMarkdown({
  repo,
  base,
  rows,
  maxBranches,
  outputPath,
  ghAvailable
}) {
  const scanned = rows.length;
  const aheadCount = rows.filter((row) => row.ahead > 0).length;
  const mergedPr = rows.filter((row) => row.prState === 'MERGED').length;
  const openPr = rows.filter((row) => row.prState === 'OPEN').length;
  const closedPr = rows.filter((row) => row.prState === 'CLOSED').length;
  const nonePr = rows.filter((row) => row.prState === 'NONE').length;
  const investigate = rows.filter((row) => row.route === 'Investigate');

  const lines = [];
  lines.push('# Branch Consolidation Audit (Generated)');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push(`- Repo: \`${repo}\``);
  lines.push(`- Base branch: \`${base}\``);
  lines.push(`- Branches scanned: \`${scanned}\``);
  lines.push(`- Max branches setting: \`${maxBranches > 0 ? maxBranches : 'all'}\``);
  lines.push(`- GitHub PR metadata: \`${ghAvailable ? 'available' : 'unavailable (gh command failed)'}\``);
  lines.push(`- Output file: \`${outputPath}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Branches with ahead > 0: **${aheadCount}**`);
  lines.push(`- PR state distribution: merged=${mergedPr}, open=${openPr}, closed=${closedPr}, none=${nonePr}`);
  lines.push(`- Branches requiring manual review: **${investigate.length}**`);
  lines.push('');
  lines.push('## Manual Review Candidates');
  lines.push('');
  if (investigate.length === 0) {
    lines.push('- None.');
  } else {
    lines.push(toTableRow(['Branch', 'Ahead', 'Behind', 'PR State', 'PR', 'Reason']));
    lines.push(toTableRow(['---', '---:', '---:', '---', '---', '---']));
    for (const row of investigate) {
      const prCell = row.prNumber ? `[#${row.prNumber}](${row.prUrl})` : '-';
      lines.push(toTableRow([
        `\`${row.branch}\``,
        String(row.ahead),
        String(row.behind),
        row.prState,
        prCell,
        row.reason
      ]));
    }
  }
  lines.push('');
  lines.push('## Branch Table');
  lines.push('');
  lines.push(toTableRow(['Branch', 'Updated', 'Ahead', 'Behind', 'Plus', 'PR State', 'Route']));
  lines.push(toTableRow(['---', '---', '---:', '---:', '---:', '---', '---']));
  for (const row of rows) {
    lines.push(toTableRow([
      `\`${row.branch}\``,
      row.updated,
      String(row.ahead),
      String(row.behind),
      String(row.plusCount),
      row.prState,
      row.route
    ]));
  }
  lines.push('');
  lines.push('## Commands Used');
  lines.push('');
  lines.push('```bash');
  lines.push('git for-each-ref refs/remotes/origin --format="%(refname:short)|%(committerdate:iso8601-strict)"');
  lines.push('git rev-list --count <base>..<branch>');
  lines.push('git rev-list --count <branch>..<base>');
  lines.push('git merge-base --is-ancestor <branch> <base>');
  lines.push('git cherry <base> <branch>');
  lines.push('gh pr list --repo <repo> --state all --limit <n> --json ...');
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = args.repo || 'ambergkristo/smartiq';
  const base = args.base || 'origin/main';
  const output = args.output || 'docs/branch-consolidation-audit-latest.md';
  const maxBranches = toInt(args['max-branches'] || '0');
  const prLimit = toInt(args['pr-limit'] || '1200');

  const branchResult = run(
    'git for-each-ref refs/remotes/origin --format="%(refname:short)|%(committerdate:iso8601-strict)"'
  );
  const branchRows = branchResult.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const split = line.split('|');
      return { ref: split[0], updated: split[1] };
    })
    .filter((entry) => entry.ref && entry.ref.startsWith('origin/'))
    .filter((entry) => entry.ref !== 'origin/main')
    .filter((entry) => entry.ref !== 'origin/HEAD')
    .filter((entry) => entry.ref !== 'origin')
    .map((entry) => ({
      branch: entry.ref.replace(/^origin\//, ''),
      updated: entry.updated
    }));

  const sortedBranches = sortByUpdatedDesc(branchRows);
  const branches = maxBranches > 0 ? sortedBranches.slice(0, maxBranches) : sortedBranches;

  let prByHead = new Map();
  const prResult = run(
    `gh pr list --repo ${repo} --state all --limit ${prLimit} --json number,title,headRefName,state,url,mergedAt,closedAt`,
    true
  );
  const ghAvailable = prResult.ok;
  if (prResult.ok && prResult.stdout) {
    const prList = JSON.parse(prResult.stdout);
    for (const pr of prList) {
      const existing = prByHead.get(pr.headRefName);
      if (!existing || pr.number > existing.number) {
        prByHead.set(pr.headRefName, pr);
      }
    }
  }

  const rows = [];
  for (const entry of branches) {
    const branchRef = `origin/${entry.branch}`;
    const ahead = toInt(run(`git rev-list --count ${base}..${branchRef}`, true).stdout);
    const behind = toInt(run(`git rev-list --count ${branchRef}..${base}`, true).stdout);
    const ancestorResult = run(`git merge-base --is-ancestor ${branchRef} ${base}`, true);
    const contained = ancestorResult.ok;

    const cherryResult = run(`git cherry ${base} ${branchRef}`, true);
    const plusCount = (cherryResult.stdout || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith('+ '))
      .length;

    const pr = prByHead.get(entry.branch);
    const prState = pr ? pr.state : 'NONE';
    const prNumber = pr ? String(pr.number) : '';
    const prUrl = pr ? pr.url : '';

    const row = {
      branch: entry.branch,
      updated: entry.updated,
      ahead,
      behind,
      contained,
      plusCount,
      prState,
      prNumber,
      prUrl
    };
    const routing = classifyRoute(row);
    row.route = routing.route;
    row.reason = routing.reason;
    rows.push(row);
  }

  const markdown = buildMarkdown({
    repo,
    base,
    rows,
    maxBranches,
    outputPath: output,
    ghAvailable
  });

  const outputPath = path.resolve(output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, markdown, 'utf8');

  const investigateCount = rows.filter((row) => row.route === 'Investigate').length;
  const aheadCount = rows.filter((row) => row.ahead > 0).length;
  console.log(`Wrote ${outputPath}`);
  console.log(`Branches scanned=${rows.length}, ahead>0=${aheadCount}, investigate=${investigateCount}`);
}

main();
