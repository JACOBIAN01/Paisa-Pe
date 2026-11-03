import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import { findConflicts, selectBugs, type BugEntry, type Manifest } from './select';

const ROOT = resolve(__dirname, '..', '..');
const MANIFEST = join(ROOT, 'private/bugs/manifest.yaml');
const PATCH_DIR = join(ROOT, 'private/bugs/patches');
const FIX_DIR = join(ROOT, 'private/fixes');

interface Args {
  seed?: number;
  count?: number;
  only?: string[];
  exclude?: string[];
  chain: boolean;
  revert: boolean;
  dryRun: boolean;
  target: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { chain: false, revert: false, dryRun: false, target: ROOT };
  const list = (v: string | undefined): string[] => (v ?? '').split(',').filter(Boolean);
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = argv[i + 1];
    if (flag === '--seed') args.seed = Number(argv[(i += 1)]);
    else if (flag === '--count') args.count = Number(argv[(i += 1)]);
    else if (flag === '--only') {
      args.only = list(next);
      i += 1;
    } else if (flag === '--exclude') {
      args.exclude = list(next);
      i += 1;
    } else if (flag === '--target') args.target = resolve(String(argv[(i += 1)]));
    else if (flag === '--chain') args.chain = true;
    else if (flag === '--revert') args.revert = true;
    else if (flag === '--dry-run') args.dryRun = true;
    else throw new Error(`unknown argument: ${flag}`);
  }
  return args;
}

const insideGit = (dir: string): boolean => existsSync(join(dir, '.git'));

function git(target: string, args: string[]): void {
  execFileSync('git', args, { cwd: target, stdio: 'pipe' });
}

export function applyPatch(target: string, patchFile: string): void {
  if (!existsSync(patchFile)) throw new Error(`missing patch: ${patchFile}`);
  git(target, ['apply', ...(insideGit(target) ? ['--3way'] : []), '--check', patchFile]);
  git(target, ['apply', ...(insideGit(target) ? ['--3way'] : []), patchFile]);
}

function loadManifest(): Manifest {
  return parse(readFileSync(MANIFEST, 'utf8')) as Manifest;
}

function report(bugs: BugEntry[]): void {
  const touched = new Set(bugs.flatMap((b) => b.touches));
  console.log(`selected ${bugs.length}: ${bugs.map((b) => b.id).join(' ')}`);
  console.log(`packages touched (${touched.size}): ${[...touched].sort().join(', ')}`);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const manifest = loadManifest();
  const bugs = selectBugs(manifest, args);
  if (findConflicts(bugs, args.chain).length > 0) throw new Error('selection has conflicts');
  report(bugs);
  if (args.dryRun) return;
  const ordered = args.revert ? bugs.slice().reverse() : bugs;
  for (const bug of ordered) {
    const patch = join(args.revert ? FIX_DIR : PATCH_DIR, `${bug.id}.patch`);
    applyPatch(args.target, patch);
    console.log(`${args.revert ? 'reverted' : 'applied'} ${bug.id}`);
  }
}

if (require.main === module) main();
