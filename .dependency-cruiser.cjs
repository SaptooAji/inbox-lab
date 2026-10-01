/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "domain-is-pure",
      severity: "error",
      comment: "Domain may not import other layers.",
      from: { path: "^src/domain" },
      to: { path: "^src/(application|infrastructure|presentation|app)/" },
    },
    {
      name: "domain-no-packages",
      severity: "error",
      comment: "Domain stays pure TypeScript: no npm packages, no Node built-ins.",
      from: { path: "^src/domain" },
      to: {
        dependencyTypes: ["npm", "npm-dev", "npm-optional", "npm-peer", "npm-unknown", "core"],
      },
    },
    {
      name: "application-only-on-domain",
      severity: "error",
      comment: "Application may depend on domain only.",
      from: { path: "^src/application" },
      to: { path: "^src/(infrastructure|presentation|app)/" },
    },
    {
      name: "infrastructure-not-on-presentation",
      severity: "error",
      from: { path: "^src/infrastructure" },
      to: { path: "^src/(presentation|app)/" },
    },
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
  ],
  options: {
    tsConfig: { fileName: "tsconfig.json" },
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
  },
};
