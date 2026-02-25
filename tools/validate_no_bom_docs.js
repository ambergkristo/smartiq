#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, execSync } = require('node:child_process');

const defaultRoots = ['docs'];
const roots = process.argv.slice(2);
const scanRoots = roots.length > 0 ? roots : defaultRoots;
const repoRoot = (() => {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  } catch {
    return process.cwd();
  }
})();
const normalizedScanRoots = scanRoots
  .map((root) => path.relative(repoRoot, path.resolve(root)))
  .map((root) => root.replace(/\\/g, '/'))
  .map((root) => root.replace(/\/+$/, ''))
  .filter((root) => root.length > 0 && !root.startsWith('..'));

function collectMarkdownFiles(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }
  const stack = [rootDir];
  const files = [];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      if (path.extname(entry.name).toLowerCase() === '.md') {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function hasUtf8Bom(filePath) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(repoRoot, filePath);
  const fd = fs.openSync(absolutePath, 'r');
  try {
    const header = Buffer.alloc(3);
    const bytesRead = fs.readSync(fd, header, 0, 3, 0);
    if (bytesRead < 3) {
      return false;
    }
    return header[0] === 0xef && header[1] === 0xbb && header[2] === 0xbf;
  } finally {
    fs.closeSync(fd);
  }
}

function trackedMarkdownFiles() {
  try {
    const output = execFileSync('git', ['-C', repoRoot, 'ls-files'], { encoding: 'utf8' });
    const tracked = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    return tracked.filter((filePath) => {
      if (path.extname(filePath).toLowerCase() !== '.md') {
        return false;
      }
      return normalizedScanRoots.some((normalizedRoot) => {
        const normalizedFile = filePath.replace(/\\/g, '/');
        return normalizedFile === normalizedRoot || normalizedFile.startsWith(`${normalizedRoot}/`);
      });
    });
  } catch {
    return [];
  }
}

const markdownFiles = (() => {
  const tracked = trackedMarkdownFiles();
  if (tracked.length > 0) {
    return tracked;
  }
  return scanRoots.flatMap(collectMarkdownFiles);
})();
const filesWithBom = markdownFiles.filter(hasUtf8Bom);

if (filesWithBom.length > 0) {
  process.stderr.write('UTF-8 BOM detected in markdown files:\n');
  for (const file of filesWithBom) {
    process.stderr.write(`- ${file}\n`);
  }
  process.exit(1);
}

process.stdout.write(`BOM check passed for ${markdownFiles.length} markdown files.\n`);
