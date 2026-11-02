import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  FEATURE_DIRS,
  entryPath,
  packagePath,
  renderClaudeMd,
  renderCodeowners,
  renderPackageJson,
  renderPaths,
  renderReadme,
  renderTsconfig,
} from './render';
import { PACKAGES, type Layer, type PackageSpec } from './registry';

const ROOT = resolve(__dirname, '..', '..');
const STUB = 'export {};\n';
const written: string[] = [];

function write(rel: string, content: string, overwrite: boolean): boolean {
  const file = join(ROOT, rel);
  if (!overwrite && existsSync(file)) return false;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  written.push(rel);
  return true;
}

function scaffold(spec: PackageSpec, force: boolean): void {
  const dir = packagePath(spec);
  write(`${dir}/package.json`, renderPackageJson(spec), true);
  write(`${dir}/tsconfig.json`, renderTsconfig(spec), true);
  write(`${dir}/README.md`, renderReadme(spec), force);
  write(`${dir}/CLAUDE.md`, renderClaudeMd(spec), force);
  write(`${dir}/${entryPath(spec)}`, STUB, false);
  if (spec.layer === 'features') {
    for (const sub of FEATURE_DIRS) write(`${dir}/src/${sub}/.gitkeep`, '', false);
  }
}

function syncRootFiles(): void {
  write('CODEOWNERS', renderCodeowners(PACKAGES), true);
  const basePath = join(ROOT, 'tsconfig.base.json');
  const base = JSON.parse(readFileSync(basePath, 'utf8'));
  base.compilerOptions.paths = renderPaths(PACKAGES);
  writeFileSync(basePath, `${JSON.stringify(base, null, 2)}\n`);
  written.push('tsconfig.base.json');
}

function format(): void {
  const files = written.filter((f) => /\.(json|md|ts)$/.test(f));
  if (files.length === 0) return;
  execFileSync(
    join(ROOT, 'node_modules/.bin/prettier'),
    ['--write', '--log-level', 'warn', ...files],
    {
      cwd: ROOT,
    },
  );
}

function parseFlags(args: string[]): { positional: string[]; flags: Record<string, string> } {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i] as string;
    if (arg.startsWith('--')) {
      const next = args[i + 1];
      if (next === undefined || next.startsWith('--')) flags[arg.slice(2)] = 'true';
      else {
        flags[arg.slice(2)] = next;
        i += 1;
      }
    } else positional.push(arg);
  }
  return { positional, flags };
}

function main(argv: string[]): void {
  const [command, ...rest] = argv;
  const { positional, flags } = parseFlags(rest);
  const force = flags.force === 'true';

  if (command === 'all') {
    for (const spec of PACKAGES) scaffold(spec, force);
    syncRootFiles();
    format();
    console.log(`scaffolded ${PACKAGES.length} packages`);
    return;
  }

  if (command === 'package' || command === 'feature') {
    const layer = (command === 'feature' ? 'features' : positional[0]) as Layer;
    const slug = command === 'feature' ? positional[0] : positional[1];
    if (!layer || !slug) throw new Error('usage: gen package <layer> <slug> | gen feature <slug>');
    const spec: PackageSpec = {
      layer,
      slug,
      team: flags.team ?? 'platform-core',
      description: flags.desc ?? `${slug} package.`,
      owns: [],
    };
    scaffold(spec, force);
    format();
    console.log(
      `scaffolded ${packagePath(spec)}. Add it to tools/gen/registry.ts, then run: gen all`,
    );
    return;
  }

  console.log('usage: gen all [--force] | gen package <layer> <slug> | gen feature <slug>');
}

main(process.argv.slice(2));
