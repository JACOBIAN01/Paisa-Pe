export type Kind = 'source' | 'test';

export interface Budget {
  label: string;
  source: number;
  test: number;
}

/** Budgets in thousands of lines, keyed by the first path segment (or segment group). */
export const BUDGETS: Record<string, Budget> = {
  contracts: { label: 'contracts', source: 1.5, test: 0.3 },
  core: { label: 'core', source: 5, test: 2 },
  platform: { label: 'platform', source: 2.5, test: 1 },
  mockplatform: { label: 'mockplatform', source: 4, test: 1 },
  services: { label: 'services', source: 7, test: 3 },
  features: { label: 'features', source: 7, test: 1.5 },
  'design-system': { label: 'design-system', source: 1.5, test: 0.5 },
  apps: { label: 'apps', source: 1, test: 0.2 },
  'harness+tools': { label: 'harness + tools', source: 2, test: 0.5 },
};

const TEST_FILE = /(\.test\.tsx?$)|(\/__tests__\/)/;

export function classify(path: string): { group: string; kind: Kind } | null {
  if (!/\.tsx?$/.test(path) || path.endsWith('.d.ts')) return null;
  const top = path.split('/')[0] as string;
  if (top === 'private') return null;
  const group = top === 'harness' || top === 'tools' ? 'harness+tools' : top;
  if (!(group in BUDGETS)) return null;
  return { group, kind: TEST_FILE.test(`/${path}`) ? 'test' : 'source' };
}

/** Counts lines that are neither blank nor comment-only. */
export function countLines(text: string): number {
  let count = 0;
  let inBlock = false;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (inBlock) {
      if (line.includes('*/')) inBlock = false;
      continue;
    }
    if (line === '' || line.startsWith('//')) continue;
    if (line.startsWith('/*')) {
      if (!line.includes('*/')) inBlock = true;
      continue;
    }
    count += 1;
  }
  return count;
}
