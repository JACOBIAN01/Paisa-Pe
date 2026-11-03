import { existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const target = process.argv[2];
if (!target) throw new Error('usage: pnpm checks <student-export-directory>');
const root = resolve(target);
if (!existsSync(root) || !statSync(root).isDirectory()) throw new Error(`not a directory: ${root}`);

const contentPattern = '\\b(v-clean|reference-test)\\b|\\bB(0[1-9]|[12][0-9]|30)\\b';
const pathPattern =
  '(^|/)(private|bugs|manifest|reference-test)(/|$)|\\bB(0[1-9]|[12][0-9]|30)\\b';
const scan = (args: string[], cwd?: string): string => {
  try {
    return execFileSync('rg', args, { encoding: 'utf8', cwd });
  } catch (error: unknown) {
    const result = error as { stdout?: string; status?: number };
    if (result.status === 1) return '';
    throw error;
  }
};

const contents = scan(['-l', '-i', '--hidden', '--glob', '!.git/**', contentPattern, root]);
const names = scan(['--files', '--hidden', '-g', '!.git/**'], root).split('\n').filter((file) =>
  new RegExp(pathPattern, 'i').test(file),
);
if (contents.trim() || names.length > 0) {
  throw new Error(`export leak scan failed\n${contents}${names.join('\n')}`);
}
if (existsSync(resolve(root, '.git'))) {
  throw new Error('export retains repository metadata');
}
console.log('leak scan passed');
