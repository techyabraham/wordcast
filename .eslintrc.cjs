module.exports = {
  root: true,
  parserOptions: {
    projectService: true,
    tsconfigRootDir: __dirname,
  },
  extends: ['eslint:recommended'],
  ignorePatterns: ['dist', 'coverage', '.next', 'node_modules'],
};
