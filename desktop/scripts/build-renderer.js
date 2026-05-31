#!/usr/bin/env node
const fs   = require('fs');
const path = require('path');

const SRC  = path.resolve(__dirname, '..', '..', 'web', 'dist');
const DEST = path.resolve(__dirname, '..', 'renderer');

if (!fs.existsSync(SRC)) {
  console.error(`Web build not found at: ${SRC}\nRun first: npm run build:web`);
  process.exit(1);
}

for (const e of fs.readdirSync(DEST)) {
  if (e === 'index.html') continue;
  fs.rmSync(path.join(DEST, e), { recursive: true, force: true });
}

copy(SRC, DEST);
console.log(`Renderer built from ${SRC} → ${DEST}`);

function copy(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src)) {
    const sp = path.join(src, e), dp = path.join(dest, e);
    fs.statSync(sp).isDirectory() ? copy(sp, dp) : fs.copyFileSync(sp, dp);
  }
}
