import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { BUDGETS, classify, countLines, type Kind } from './count';

const ROOT = resolve(__dirname, '..', '..');
const SKIP_DIRS = new Set(['node_modules', '.turbo', '.expo', 'dist', 'coverage', '.git']);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

type Totals = Record<string, Record<Kind, number> & { files: number }>;

function collect(root: string): Totals {
  const totals: Totals = {};
  for (const file of walk(root)) {
    const rel = relative(root, file).split('\\').join('/');
    const info = classify(rel);
    if (!info) continue;
    const row = (totals[info.group] ??= { source: 0, test: 0, files: 0 });
    row[info.kind] += countLines(readFileSync(file, 'utf8'));
    row.files += 1;
  }
  return totals;
}

const k = (n: number): string => (n / 1000).toFixed(1).padStart(5);

function print(totals: Totals): void {
  const header = `${'area'.padEnd(18)}${'files'.padStart(6)}${'src'.padStart(8)}${'budget'.padStart(8)}${'test'.padStart(8)}${'budget'.padStart(8)}`;
  console.log(header);
  console.log('-'.repeat(header.length));
  let files = 0;
  let source = 0;
  let test = 0;
  for (const [group, budget] of Object.entries(BUDGETS)) {
    const row = totals[group] ?? { source: 0, test: 0, files: 0 };
    files += row.files;
    source += row.source;
    test += row.test;
    console.log(
      `${budget.label.padEnd(18)}${String(row.files).padStart(6)}${k(row.source).padStart(8)}K${k(budget.source * 1000).padStart(7)}K${k(row.test).padStart(7)}K${k(budget.test * 1000).padStart(7)}K`,
    );
  }
  console.log('-'.repeat(header.length));
  console.log(
    `${'total'.padEnd(18)}${String(files).padStart(6)}${k(source).padStart(8)}K${'31.0'.padStart(8)}K${k(test).padStart(7)}K${'10.0'.padStart(7)}K`,
  );
}

const totals = collect(ROOT);
if (process.argv.includes('--json')) console.log(JSON.stringify(totals, null, 2));
else print(totals);
