module.exports = {
  root: true,
  extends: 'airbnb-base',
  env: {
    browser: true,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    allowImportExportEverywhere: true,
    sourceType: 'module',
    requireConfigFile: false,
  },
  rules: {
    'import/extensions': ['error', { js: 'always' }], // require js file extensions in imports
    'linebreak-style': ['error', 'unix'], // enforce unix linebreaks
    'no-param-reassign': [2, { props: false }], // allow modifying properties of param
    // DA and other Edge Delivery runtimes serve ES modules straight from https
    // URLs; there is no local file for the resolver to find.
    'import/no-unresolved': ['error', { ignore: ['^https?://'] }],
    // Reserved parameter names we do not control: `__ow_*` come from Adobe I/O
    // Runtime (OpenWhisk) and `_activity` from the Target API payload.
    'no-underscore-dangle': ['error', { allow: ['__ow_method', '__ow_body', '_activity'] }],
  },
};
