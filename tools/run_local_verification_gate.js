#!/usr/bin/env node

const { execSync } = require('node:child_process');

try {
  execSync('node tools/run_release_readiness_check.js', { stdio: 'inherit' });
} catch (error) {
  if (typeof error.status === 'number') {
    process.exit(error.status);
  }
  process.exit(1);
}

console.log('\nLocal Verification Gate: PASS');
