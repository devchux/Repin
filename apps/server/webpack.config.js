const nodeExternals = require("webpack-node-externals");

const WORKSPACE_RUNTIME_PACKAGES = [
  /^@repo\/contracts(?:\/.*)?$/,
  /^@repo\/observability(?:\/.*)?$/,
];

/** @type {import('webpack').ConfigurationFactory} */
module.exports = (options) => ({
  ...options,
  externals: [
    nodeExternals({
      allowlist: WORKSPACE_RUNTIME_PACKAGES,
    }),
  ],
});
