module.exports = {
    extends: ["plugin:@typescript-eslint/recommended"],
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint"],
    root: true,
    rules: {
      semi: ["error", "always"],
      quotes: ["error", "double"]      
    }
  };
