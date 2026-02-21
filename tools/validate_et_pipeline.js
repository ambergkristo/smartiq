#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_DATA_DIR = 'data/smart10';

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
  if (verbose) {
    console.log(`[pipeline] python ${path.basename(scriptPath)} --check`);
  }
  const proc = spawnSync('python', [scriptPath, '--check'], { stdio: 'inherit' });
  return { status: proc.status ?? 1, stdout: '', stderr: '', error: proc.error || null };
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
          failedStep: check.name,
          exitCode: status,
          totalDurationMs: Date.now() - pipelineStartedAt,
          steps: timings,
        };
        if (outPath) {
          const absOut = path.resolve(process.cwd(), outPath);
          fs.mkdirSync(path.dirname(absOut), { recursive: true });
          fs.writeFileSync(absOut, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
        }
        console.log(JSON.stringify(summary, null, 2));
      }
      process.exit(status);
    }
  }

  if (asJson) {
    summary = {
      ok: true,
      dataDir,
      failedStep: null,
      exitCode: 0,
      totalDurationMs: Date.now() - pipelineStartedAt,
      steps: timings,
    };
    if (outPath) {
      const absOut = path.resolve(process.cwd(), outPath);
      fs.mkdirSync(path.dirname(absOut), { recursive: true });
      fs.writeFileSync(absOut, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    }
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
