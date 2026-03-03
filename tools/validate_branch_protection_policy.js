#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const policyPathArg = process.argv[2] || 'docs/policies/main-branch-protection-policy.json';
const policyPath = path.resolve(process.cwd(), policyPathArg);
const releaseReadinessDocPath = path.resolve(process.cwd(), 'docs/release-readiness.md');
const workflowsDir = path.resolve(process.cwd(), '.github/workflows');
const canonicalReleaseReadinessCheck = 'release-readiness / release-readiness';

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Policy file not found: ${filePath}`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid JSON in policy file: ${filePath} (${error.message})`);
  }
}

function stripWrappingQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseWorkflow(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const nameMatch = content.match(/^name:\s*(.+)$/m);
  const workflowName = nameMatch ? stripWrappingQuotes(nameMatch[1]) : null;
  const lines = content.split(/\r?\n/);
  const jobIds = [];
  let inJobs = false;

  for (const line of lines) {
    if (!inJobs) {
      if (/^jobs:\s*$/.test(line)) {
        inJobs = true;
      }
      continue;
    }

    if (/^\S/.test(line) && !/^jobs:\s*$/.test(line)) {
      break;
    }

    const jobMatch = line.match(/^  ([A-Za-z0-9_-]+):\s*$/);
    if (jobMatch) {
      jobIds.push(jobMatch[1]);
    }
  }

  return { workflowName, jobIds };
}

function collectWorkflowChecks() {
  if (!fs.existsSync(workflowsDir)) {
    throw new Error(`Workflow directory not found: ${workflowsDir}`);
  }

  const files = fs.readdirSync(workflowsDir)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .sort((a, b) => a.localeCompare(b));

  const checks = new Set();
  const workflows = [];

  for (const fileName of files) {
    const fullPath = path.join(workflowsDir, fileName);
    const parsed = parseWorkflow(fullPath);
    if (!parsed.workflowName) {
      continue;
    }
    const contexts = parsed.jobIds.map((jobId) => `${parsed.workflowName} / ${jobId}`);
    for (const context of contexts) {
      checks.add(context);
    }
    workflows.push({
      file: path.relative(process.cwd(), fullPath).replace(/\\/g, '/'),
      name: parsed.workflowName,
      jobs: parsed.jobIds,
      contexts
    });
  }

  return { checks, workflows };
}

function readReleaseReadinessDoc() {
  if (!fs.existsSync(releaseReadinessDocPath)) {
    throw new Error(`Missing required file: ${releaseReadinessDocPath}`);
  }
  return fs.readFileSync(releaseReadinessDocPath, 'utf8');
}

function main() {
  const policy = readJson(policyPath);
  const issues = [];

  if (policy.branch !== 'main') {
    issues.push(`Policy branch must be "main" (current: ${String(policy.branch)})`);
  }

  const requiredChecks = Array.isArray(policy.required_status_checks)
    ? policy.required_status_checks
    : [];
  if (requiredChecks.length === 0) {
    issues.push('Policy must define non-empty required_status_checks');
  }

  if (!requiredChecks.includes(canonicalReleaseReadinessCheck)) {
    issues.push(`Policy must include canonical required check: ${canonicalReleaseReadinessCheck}`);
  }

  const { checks: discoveredChecks, workflows } = collectWorkflowChecks();
  const missingChecks = requiredChecks.filter((context) => !discoveredChecks.has(context));
  if (missingChecks.length > 0) {
    for (const context of missingChecks) {
      issues.push(`Required check not produced by workflows: ${context}`);
    }
  }

  const releaseReadinessDoc = readReleaseReadinessDoc();
  const normalizedPolicyPath = policyPathArg.replace(/\\/g, '/');
  if (!releaseReadinessDoc.includes(normalizedPolicyPath)) {
    issues.push(`docs/release-readiness.md must reference ${normalizedPolicyPath}`);
  }
  if (!releaseReadinessDoc.includes(canonicalReleaseReadinessCheck)) {
    issues.push(`docs/release-readiness.md must reference ${canonicalReleaseReadinessCheck}`);
  }

  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(issue);
    }
    process.exit(1);
  }

  const summary = {
    ok: true,
    policyPath: normalizedPolicyPath,
    repository: policy.repository,
    branch: policy.branch,
    requiredStatusChecks: requiredChecks,
    discoveredWorkflowContexts: Array.from(discoveredChecks).sort((a, b) => a.localeCompare(b)),
    workflows
  };
  console.log(JSON.stringify(summary, null, 2));
  console.log('\nBranch protection policy validation passed.');
}

main();
