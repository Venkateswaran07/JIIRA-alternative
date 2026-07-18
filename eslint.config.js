import tseslint from "typescript-eslint";

export default [
  { ignores: ["**/dist/**", "**/node_modules/**", "**/.vite/**", "server/uploads/**"] },
  {
    files: ["server/src/**/*.ts", "server/scripts/**/*.ts", "client/src/**/*.ts", "client/src/**/*.tsx", "client/tests/**/*.ts", "client/playwright.config.ts"],
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaVersion: "latest", sourceType: "module" } },
    rules: {
      "no-debugger": "error",
      "no-unreachable": "error",
      "no-constant-condition": "error",
      "no-unsafe-finally": "error",
      "no-unused-vars": "off",
      "no-undef": "off",
    },
  },
];
