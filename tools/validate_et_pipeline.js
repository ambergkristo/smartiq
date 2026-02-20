#!/usr/bin/env node
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_DATA_DIR = 'data/smart10';

function runNodeScript(scriptName, args = []) {
  const scriptPath = path.resolve(__dirname, scriptName);
  const proc = spawnSync(process.execPath, [scriptPath, ...args], { stdio: 'inherit' });
  return proc.status ?? 1;
}

function runPythonCheck() {
  const scriptPath = path.resolve(__dirname, 'localize_et_dataset.py');
  const proc = spawnSync('python', [scriptPath, '--check'], { stdio: 'inherit' });
  return proc.status ?? 1;
}

function main() {
  const dataDirArg = process.argv[2] || DEFAULT_DATA_DIR;
  const dataDir = dataDirArg.replace(/\\/g, '/');
  const etCards = `${dataDir}/cards.et.json`;
  const overrides = `${dataDir}/et.localization.overrides.json`;

  const checks = [
    () => runNodeScript('validate_locale_packs.js', [dataDir]),
    () => runNodeScript('validate_et_localization.js', [etCards]),
    () => runNodeScript('validate_et_glossary.js', [etCards]),
    () => runNodeScript('validate_et_overrides.js', [overrides]),
    () => runPythonCheck(),
  ];

  for (const check of checks) {
    const status = check();
    if (status !== 0) {
      process.exit(status);
    }
  }

  console.log('\nET validation pipeline passed.');
}

main();
