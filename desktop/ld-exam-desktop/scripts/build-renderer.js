#!/usr/bin/env node
/**
 * Copies the ld-exam-web Vite build output into renderer/ so that
 * electron-builder can embed it in the production package.
 *
 * Usage (from repo root):  node desktop/ld-exam-desktop/scripts/build-renderer.js
 * Or via package.json:     npm run build:renderer  (inside ld-exam-desktop/)
 */

const fs   = require('fs');
const path = require('path');

const SRC  = path.resolve(__dirname, '..', '..', '..', 'apps', 'ld-exam-web', 'dist');
const DEST = path.resolve(__dirname, '..', 'renderer');

if (!fs.existsSync(SRC)) {
  console.error(`\nERROR: Web build not found at:\n  ${SRC}\n\nRun first:\n  npm run build --workspace=apps/ld-exam-web\n`);
  process.exit(1);
}

// Clean renderer/ except index.html (we keep the electron shell version as fallback)
for (const entry of fs.readdirSync(DEST)) {
  if (entry === 'index.html') continue;
  const full = path.join(DEST, entry);
  fs.rmSync(full, { recursive: true, force: true });
}

// Copy dist/* into renderer/
copyDir(SRC, DEST);

console.log(`\nRenderer built successfully.\n  Source : ${SRC}\n  Output : ${DEST}\n`);

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const srcPath  = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
