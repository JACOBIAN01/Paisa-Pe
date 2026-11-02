import { classify, countLines } from '../count';

describe('countLines', () => {
  it('skips blanks and comments', () => {
    const text = ['// a', '', 'const a = 1;', '/* b', 'c */', '/** d */', 'const b = 2;'].join(
      '\n',
    );
    expect(countLines(text)).toBe(2);
  });
});

describe('classify', () => {
  it('splits source from tests', () => {
    expect(classify('core/di/src/index.ts')).toEqual({ group: 'core', kind: 'source' });
    expect(classify('core/di/src/di.test.ts')).toEqual({ group: 'core', kind: 'test' });
    expect(classify('services/auth/src/__tests__/pin.ts')).toEqual({
      group: 'services',
      kind: 'test',
    });
  });
  it('groups harness and tools, ignores private and non-ts', () => {
    expect(classify('harness/clock/index.ts')?.group).toBe('harness+tools');
    expect(classify('tools/loc/index.ts')?.group).toBe('harness+tools');
    expect(classify('private/grader/x.ts')).toBeNull();
    expect(classify('core/di/README.md')).toBeNull();
  });
});
