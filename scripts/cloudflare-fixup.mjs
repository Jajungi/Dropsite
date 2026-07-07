// Cloudflare Pages skips any directory literally named `node_modules` when it
// deploys a build output. Expo's web export places vendored fonts (icon fonts,
// Google fonts, expo-router assets) under `dist/assets/node_modules/...`, so on
// Cloudflare those files 404 and fall through to the SPA index.html rewrite —
// which breaks icon glyphs and web fonts.
//
// This script runs AFTER `expo export -p web`. It renames the offending folder
// and rewrites every reference to it in the exported text files.

import { promises as fs } from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(process.cwd(), 'dist');
const OLD_SEGMENT = 'node_modules';
const NEW_SEGMENT = 'vendor-assets';
const OLD_REF = `assets/${OLD_SEGMENT}/`;
const NEW_REF = `assets/${NEW_SEGMENT}/`;
const REWRITE_EXTS = new Set(['.js', '.html', '.json', '.css', '.map', '.txt']);

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, onFile) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, onFile);
    } else if (entry.isFile()) {
      await onFile(full);
    }
  }
}

async function main() {
  if (!(await pathExists(DIST))) {
    console.error(`[cloudflare-fixup] dist folder not found at ${DIST}`);
    process.exit(1);
  }

  const oldDir = path.join(DIST, 'assets', OLD_SEGMENT);
  const newDir = path.join(DIST, 'assets', NEW_SEGMENT);

  if (await pathExists(oldDir)) {
    if (await pathExists(newDir)) {
      await fs.rm(newDir, { recursive: true, force: true });
    }
    await fs.rename(oldDir, newDir);
    console.log(`[cloudflare-fixup] renamed assets/${OLD_SEGMENT} -> assets/${NEW_SEGMENT}`);
  } else {
    console.log('[cloudflare-fixup] no assets/node_modules folder (nothing to rename)');
  }

  let rewritten = 0;
  await walk(DIST, async (file) => {
    if (!REWRITE_EXTS.has(path.extname(file))) return;
    const content = await fs.readFile(file, 'utf8');
    if (!content.includes(OLD_REF)) return;
    await fs.writeFile(file, content.split(OLD_REF).join(NEW_REF));
    rewritten += 1;
  });
  console.log(`[cloudflare-fixup] rewrote references in ${rewritten} file(s)`);

  // Safety check: warn if any node_modules dir still remains under dist.
  const leftovers = [];
  await walk(DIST, async (file) => {
    if (file.split(path.sep).includes('node_modules')) leftovers.push(file);
  });
  if (leftovers.length > 0) {
    console.warn(
      `[cloudflare-fixup] WARNING: ${leftovers.length} file(s) still under a node_modules path and will NOT deploy to Cloudflare.`
    );
  }
}

main().catch((err) => {
  console.error('[cloudflare-fixup] failed', err);
  process.exit(1);
});
