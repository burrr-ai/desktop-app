module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true
  },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  ignorePatterns: ["dist", "release", "node_modules"],
  overrides: [
    {
      files: ["*.ts"],
      parserOptions: {
        sourceType: "module"
      }
    },
    {
      files: ["src/renderer/**/*.js"],
      env: {
        browser: true,
        node: true
      },
      rules: {
        "@typescript-eslint/no-var-requires": "off"
      }
    }
  ]
};
