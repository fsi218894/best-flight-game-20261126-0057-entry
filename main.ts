// Ridge Runner — the hand-in program (Node 22, standard library only).
// It gathers the game and its screenshots into the output directory and
// writes the dossier the judge reads, using the kit's vendored library.
// Run it outside the grader with MAKEFUN_OUTPUT_DIR set:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const rootDir = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function copyTree(from, to) {
  if (!existsSync(from)) return;
  cpSync(from, to, { recursive: true });
}

function shotCount(dir) {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((name) => {
    const p = join(dir, name);
    return statSync(p).isFile() && !name.startsWith('.');
  }).length;
}

ensureDir(outDir);
copyTree(join(rootDir, 'game'), join(outDir, 'game'));
ensureDir(join(outDir, 'screenshots'));
copyTree(join(rootDir, 'screenshots'), join(outDir, 'screenshots'));

// Keep a copy of this program's own source beside the output for reference.
copyFileSync(join(rootDir, 'main.ts'), join(outDir, 'main.ts'));

const shots = shotCount(join(outDir, 'screenshots'));
if (shots < 3 || shots > 4) {
  throw new Error(`expected 3 or 4 screenshots, found ${shots}`);
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`handed in Ridge Runner: ${shots} screenshots, dossier ${dossier.length} bytes`);
