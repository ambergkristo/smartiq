#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const DEFAULT_DATA_DIR = 'data/smart10';
const PIPELINE_VERSION = '1.1.0';

function runNodeScript(scriptName, args = [], verbose = false) {
  const scriptPath = path.resolve(__dirname, scriptName);
  if (verbose) {
    console.log(`[pipeline] node ${path.basename(scriptPath)} ${args.join(' ')}`.trim());
  }
  const proc = spawnSync(process.execPath, [scriptPath, ...args], { stdio: 'inherit' });
  return { status: proc.status ?? 1, stdout: '', stderr: '', error: proc.error || null };
}

function runPythonCheck(verbose = false) {
  const scriptPath = path.resolve(__dirname, 'localize_et_dataset.py');
  const repoRoot = path.resolve(__dirname, '..');
  if (verbose) {
    console.log(`[pipeline] python ${path.basename(scriptPath)} --check`);
  }
  const proc = spawnSync('python', [scriptPath, '--check'], {
    stdio: 'inherit',
    cwd: repoRoot,
  });
  return { status: proc.status ?? 1, stdout: '', stderr: '', error: proc.error || null };
}

function sha256File(targetPath) {
  const abs = path.resolve(process.cwd(), targetPath);
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(abs));
  return hash.digest('hex');
}

function gitValue(args) {
  const proc = spawnSync('git', ['-C', process.cwd(), ...args], { encoding: 'utf8' });
  if ((proc.status ?? 1) !== 0) return null;
  const value = String(proc.stdout || '').trim();
  return value || null;
}

function resolveGitBranch() {
  const envBranch = process.env.GITHUB_REF_NAME || process.env.GITHUB_HEAD_REF || null;
  const gitBranch = gitValue(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (!gitBranch || gitBranch === 'HEAD') {
    return envBranch;
  }
  return gitBranch;
}

function writeJsonAtomic(absPath, payload) {
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const dir = path.dirname(absPath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = path.join(
    dir,
    `.${path.basename(absPath)}.${process.pid}.${Date.now()}.tmp`
  );
  fs.writeFileSync(tmpPath, json, 'utf8');
  try {
    fs.renameSync(tmpPath, absPath);
  } catch (error) {
    if (error && error.code === 'EXDEV') {
      fs.copyFileSync(tmpPath, absPath);
      fs.unlinkSync(tmpPath);
      return;
    }
    throw error;
  }
}

function writeSummaryIfRequested(outPath, payload) {
  if (!outPath) return { outputPath: null, error: null };
  const absOut = path.resolve(process.cwd(), outPath);
  try {
    writeJsonAtomic(absOut, payload);
    return { outputPath: absOut, error: null };
  } catch (error) {
    const message = `Unable to write ET pipeline summary file (${absOut}): ${error.message}`;
    console.error(message);
    return { outputPath: absOut, error: message };
  }
}

function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const asJson = args.includes('--json');
  const quiet = args.includes('--quiet');
  const outArg = args.find((arg) => arg.startsWith('--out='));
  const outPath = outArg ? outArg.slice('--out='.length) : null;
  const dataDirArg = args.find((arg) => !arg.startsWith('--')) || DEFAULT_DATA_DIR;
  const dataDir = dataDirArg.replace(/\\/g, '/');
  const etCards = `${dataDir}/cards.et.json`;
  const overrides = `${dataDir}/et.localization.overrides.json`;
  const hashes = {
    etCardsSha256: sha256File(etCards),
    overridesSha256: sha256File(overrides),
  };
  const meta = {
    pipelineVersion: PIPELINE_VERSION,
    generatedAt: new Date().toISOString(),
    gitSha: gitValue(['rev-parse', 'HEAD']) || process.env.GITHUB_SHA || null,
    gitBranch: resolveGitBranch(),
    runnerCwd: process.cwd(),
    nodeVersion: process.version,
  };

  const checks = [
    { name: 'locale-packs', run: () => runNodeScript('validate_locale_packs.js', [dataDir], verbose) },
    { name: 'et-localization', run: () => runNodeScript('validate_et_localization.js', [etCards], verbose) },
    { name: 'et-glossary', run: () => runNodeScript('validate_et_glossary.js', [etCards], verbose) },
    { name: 'et-overrides', run: () => runNodeScript('validate_et_overrides.js', [overrides], verbose) },
    { name: 'et-idempotence', run: () => runPythonCheck(verbose) },
  ];

  const timings = [];
  const pipelineStartedAt = Date.now();
  let summary = null;
  for (const check of checks) {
    const startedAt = Date.now();
    const result = check.run();
    const status = result.status;
    const durationMs = Date.now() - startedAt;
    timings.push({ name: check.name, status, durationMs });
    if (verbose) {
      console.log(`[pipeline] step=${check.name} status=${status} durationMs=${durationMs}`);
    }
    if (status !== 0) {
      if (result.error) {
        console.error(`ET validation pipeline step=${check.name} spawn error: ${result.error.message}`);
      }
      console.error(`ET validation pipeline failed at step=${check.name} (exit=${status}).`);
      if (asJson) {
        summary = {
          ok: false,
          dataDir,
          meta,
          hashes,
          summaryOutputPath: null,
          summaryWriteError: null,
          failedStep: check.name,
          exitCode: status,
          totalDurationMs: Date.now() - pipelineStartedAt,
          steps: timings,
        };
        const writeInfo = writeSummaryIfRequested(outPath, summary);
        summary.summaryOutputPath = writeInfo.outputPath;
        summary.summaryWriteError = writeInfo.error;
        console.log(JSON.stringify(summary, null, 2));
      }
      process.exit(status);
    }
  }

  if (asJson) {
    summary = {
      ok: true,
      dataDir,
      meta,
      hashes,
      summaryOutputPath: null,
      summaryWriteError: null,
      failedStep: null,
      exitCode: 0,
      totalDurationMs: Date.now() - pipelineStartedAt,
      steps: timings,
    };
    const writeInfo = writeSummaryIfRequested(outPath, summary);
    summary.summaryOutputPath = writeInfo.outputPath;
    summary.summaryWriteError = writeInfo.error;
    console.log(JSON.stringify(summary, null, 2));
  }

  if (verbose) {
    console.log('[pipeline] timings:');
    for (const row of timings) {
      console.log(`- ${row.name}: ${row.durationMs}ms`);
    }
  }

  if (!quiet || !asJson) {
    console.log('\nET validation pipeline passed.');
  }
}

main();
