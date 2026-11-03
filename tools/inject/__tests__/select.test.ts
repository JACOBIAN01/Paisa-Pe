import { findConflicts, selectBugs, type BugEntry, type Manifest } from '../select';

const bug = (id: string, tier: 1 | 2 | 3, extra: Partial<BugEntry> = {}): BugEntry => ({
  id,
  tier,
  touches: ['core/x'],
  ...extra,
});

const id = (n: number): string => `B${String(n).padStart(2, '0')}`;

const manifest: Manifest = {
  bugs: [
    ...Array.from({ length: 8 }, (_, i) => bug(id(i + 1), 1)),
    ...Array.from({ length: 10 }, (_, i) => bug(id(i + 9), 2)),
    ...Array.from({ length: 12 }, (_, i) => bug(id(i + 19), 3)),
  ],
};
manifest.bugs[9] = { ...(manifest.bugs[9] as BugEntry), conflicts: ['B11'] };
manifest.bugs[20] = { ...(manifest.bugs[20] as BugEntry), chains: ['B30'] };

describe('selectBugs', () => {
  it('picks the 4/5/6 default mix deterministically', () => {
    const a = selectBugs(manifest, { seed: 7 });
    const b = selectBugs(manifest, { seed: 7 });
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
    expect(a).toHaveLength(15);
    expect([1, 2, 3].map((t) => a.filter((x) => x.tier === t).length)).toEqual([4, 5, 6]);
  });

  it('varies by seed', () => {
    const ids = (s: number) =>
      selectBugs(manifest, { seed: s })
        .map((x) => x.id)
        .join();
    expect(new Set([1, 2, 3, 4, 5].map(ids)).size).toBeGreaterThan(1);
  });

  it('never selects conflicting pairs', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const picked = selectBugs(manifest, { seed });
      expect(findConflicts(picked, false)).toEqual([]);
    }
  });

  it('honours only, exclude and count', () => {
    expect(selectBugs(manifest, { only: ['B01', 'B20'] }).map((x) => x.id)).toEqual(['B01', 'B20']);
    expect(selectBugs(manifest, { seed: 3, exclude: ['B01'] }).some((x) => x.id === 'B01')).toBe(
      false,
    );
    expect(selectBugs(manifest, { seed: 3, count: 6 })).toHaveLength(6);
  });

  it('refuses explicit conflicts and unknown ids; chain unlocks chained pairs', () => {
    expect(() => selectBugs(manifest, { only: ['B10', 'B11'] })).toThrow(/conflicting/);
    expect(() => selectBugs(manifest, { only: ['B99'] })).toThrow(/unknown/);
    expect(() => selectBugs(manifest, { only: ['B21', 'B30'] })).toThrow(/conflicting/);
    expect(selectBugs(manifest, { only: ['B21', 'B30'], chain: true })).toHaveLength(2);
  });
});
