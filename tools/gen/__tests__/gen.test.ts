import layersJson from '../layers.json';
import { PACKAGES } from '../registry';
import {
  entryPath,
  packageName,
  packagePath,
  renderClaudeMd,
  renderCodeowners,
  renderPackageJson,
  renderPaths,
  renderTsconfig,
} from '../render';

describe('registry', () => {
  it('has unique names and paths', () => {
    expect(new Set(PACKAGES.map(packageName)).size).toBe(PACKAGES.length);
    expect(new Set(PACKAGES.map(packagePath)).size).toBe(PACKAGES.length);
  });

  it('only uses known layers and includes every layer', () => {
    const known = Object.keys(layersJson.layers);
    expect(PACKAGES.every((p) => known.includes(p.layer))).toBe(true);
    expect(new Set(PACKAGES.map((p) => p.layer))).toEqual(new Set(known));
  });

  it('has the expected package counts per layer', () => {
    const count = (layer: string) => PACKAGES.filter((p) => p.layer === layer).length;
    expect(count('contracts')).toBe(4);
    expect(count('core')).toBe(13);
    expect(count('platform')).toBe(7);
    expect(count('services')).toBe(12);
    expect(count('features')).toBe(19);
  });
});

describe('render', () => {
  const auth = PACKAGES.find((p) => packageName(p) === '@pp/svc-auth')!;
  const harness = PACKAGES.find((p) => p.layer === 'harness')!;

  it('names and locates packages', () => {
    expect(packagePath(auth)).toBe('services/auth');
    expect(entryPath(auth)).toBe('src/index.ts');
    expect(entryPath(harness)).toBe('index.ts');
  });

  it('renders valid JSON with a relative tsconfig base', () => {
    expect(JSON.parse(renderPackageJson(auth)).name).toBe('@pp/svc-auth');
    expect(JSON.parse(renderTsconfig(auth)).extends).toBe('../../tsconfig.base.json');
    expect(JSON.parse(renderTsconfig(harness)).extends).toBe('../tsconfig.base.json');
  });

  it('lists forbidden layers in CLAUDE.md', () => {
    const md = renderClaudeMd(auth);
    expect(md).toContain('`features/*`');
    expect(md.split('## Must not import')[1]).not.toContain('`core/*`');
  });

  it('generates a path alias and an owner line for every package', () => {
    expect(Object.keys(renderPaths(PACKAGES))).toHaveLength(PACKAGES.length);
    expect(renderCodeowners(PACKAGES)).toContain('/services/auth/');
  });
});
