import { existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const target = process.argv[2];
if (!target) throw new Error('usage: pnpm checks <student-export-directory>');
const root = resolve(target);
if (!existsSync(root) || !statSync(root).isDirectory()) throw new Error(`not a directory: ${root}`);

const pattern = 'private|bugs|manifest|B(0[1-9]|[12][0-9]|30)|inject|vulnerab|exploit|insecure|reference-test';
const scan = (args: string[]): string => {
  try {
    return execFileSync('rg', args, { encoding: 'utf8' });
  } catch (error: unknown) {
    const result = error as { stdout?: string; status?: number };
    if (result.status === 1) return '';
    throw error;
  }
};

const contents = scan(['-l', '-i', '--hidden', '--glob', '!.git/**', pattern, root]);
const names = scan(['--files', '--hidden', root, '-g', '!.git/**']).split('\n').filter((file) =>
  new RegExp(pattern, 'i').test(file),
);
if (contents.trim() || names.length > 0) {
  throw new Error(`export leak scan failed\n${contents}${names.join('\n')}`);
}
if (existsSync(resolve(root, '.git')) || existsSync(resolve(root, '.gitignore'))) {
  throw new Error('export retains repository metadata');
}
console.log('leak scan passed');
