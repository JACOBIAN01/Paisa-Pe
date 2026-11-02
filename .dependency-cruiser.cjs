const { layers, ownPackageOnly, testExtra } = require('./tools/gen/layers.json');

const all = Object.keys(layers);

const TEST_PATH = '(\\.test\\.tsx?$|/__tests__/)';

const layerRules = all.flatMap((layer) => {
  const rule = (suffix, allowed, scope) => ({
    name: `layer-${layer}${suffix}`,
    comment: `${layer} may only depend on: ${allowed.join(', ')}`,
    severity: 'error',
    from: { path: `^${layer}(/|$)`, ...scope },
    to: { path: all.filter((o) => !allowed.includes(o)).map((o) => `^${o}(/|$)`) },
  });
  return [
    rule('', layers[layer], { pathNot: TEST_PATH }),
    rule('-tests', [...layers[layer], ...testExtra], {
      path: [`^${layer}(/|$)`, TEST_PATH].join('.*'),
    }),
  ];
});

const featureRule = ownPackageOnly.includes('features')
  ? [
      {
        name: 'no-cross-feature',
        comment: 'features may not import other features',
        severity: 'error',
        from: { path: '^features/([^/]+)/' },
        to: { path: '^features/([^/]+)/', pathNot: '^features/$1/' },
      },
    ]
  : [];

module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'No import cycles, within or across packages.',
      from: {},
      to: { circular: true },
    },
    ...layerRules,
    ...featureRule,
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)(node_modules|\\.turbo|dist|coverage)(/|$)' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      mainFields: ['main', 'types'],
    },
  },
};
