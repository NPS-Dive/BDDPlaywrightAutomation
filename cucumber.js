/**
 * Cucumber configuration (CommonJS).
 *
 * Why this file exists:
 * - It makes `npm run bdd` work without passing long CLI flags.
 * - It guarantees that TypeScript support + step definitions + hooks are loaded,
 *   which prevents the common "Undefined step" problem.
 */
module.exports = {
  default: {
    paths: ["features/**/*.feature"],
    requireModule: ["ts-node/register"],
    require: ["src/support/**/*.ts", "src/steps/**/*.ts"],
    format: ["progress", "json:reports/cucumber-report.json"]
    // Avoid using `publishQuiet` because CLI support depends on Cucumber version.
  }
};
