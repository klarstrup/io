import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  ...nextVitals,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  ...nextTs,
  prettier,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },

  // Override default ignores of eslint-config-next.
  {
    rules: {
      // "@typescript-eslint/no-unnecessary-condition": "error",
      // copied from typescript-eslint/recommended-type-checked
      // "@typescript-eslint/await-thenable": "error",
      // "@typescript-eslint/ban-ts-comment": "error",
      // "no-array-constructor": "off",
      // "@typescript-eslint/no-array-constructor": "error",
      // "@typescript-eslint/no-array-delete": "error",
      // "@typescript-eslint/no-base-to-string": "error",
      // "@typescript-eslint/no-duplicate-enum-values": "error",
      // "@typescript-eslint/no-duplicate-type-constituents": "error",
      // "@typescript-eslint/no-empty-object-type": "error",
      // "@typescript-eslint/no-explicit-any": "error",
      // "@typescript-eslint/no-extra-non-null-assertion": "error",
      // "@typescript-eslint/no-floating-promises": "error",
      // "@typescript-eslint/no-for-in-array": "error",
      // "no-implied-eval": "off",
      // "@typescript-eslint/no-implied-eval": "error",
      // "@typescript-eslint/no-misused-new": "error",
      // "@typescript-eslint/no-misused-promises": "error",
      // "@typescript-eslint/no-namespace": "error",
      // "@typescript-eslint/no-non-null-asserted-optional-chain": "error",
      // "@typescript-eslint/no-redundant-type-constituents": "error",
      // "@typescript-eslint/no-require-imports": "error",
      // "@typescript-eslint/no-this-alias": "error",
      // "@typescript-eslint/no-unnecessary-type-assertion": "error",
      // "@typescript-eslint/no-unnecessary-type-constraint": "error",
      // "@typescript-eslint/no-unsafe-argument": "error",
      // "@typescript-eslint/no-unsafe-assignment": "error",
      // "@typescript-eslint/no-unsafe-call": "error",
      // "@typescript-eslint/no-unsafe-declaration-merging": "error",
      // "@typescript-eslint/no-unsafe-enum-comparison": "error",
      // "@typescript-eslint/no-unsafe-function-type": "error",
      // "@typescript-eslint/no-unsafe-member-access": "error",
      // "@typescript-eslint/no-unsafe-return": "error",
      // "@typescript-eslint/no-unsafe-unary-minus": "error",
      // "no-unused-expressions": "off",
      // "@typescript-eslint/no-unused-expressions": "error",
      // "no-unused-vars": "off",
      // "@typescript-eslint/no-unused-vars": "error",
      // "@typescript-eslint/no-wrapper-object-types": "error",
      // "no-throw-literal": "off",
      // "@typescript-eslint/only-throw-error": "error",
      // "@typescript-eslint/prefer-as-const": "error",
      // "@typescript-eslint/prefer-namespace-keyword": "error",
      // "prefer-promise-reject-errors": "off",
      // "@typescript-eslint/prefer-promise-reject-errors": "error",
      // "require-await": "off",
      // "@typescript-eslint/require-await": "error",
      // "@typescript-eslint/restrict-plus-operands": "error",
      // "@typescript-eslint/restrict-template-expressions": "error",
      // "@typescript-eslint/triple-slash-reference": "error",
      // "@typescript-eslint/unbound-method": "error",
      // rules i want to have on but are currently disabled due to too many errors, will enable gradually as i fix them
      "@typescript-eslint/no-explicit-any": "off",
      "import/no-anonymous-default-export": "off",
      "@typescript-eslint/no-unused-expressions": "off",

      // actual rules i dont like
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "graphql.generated.ts",
  ]),
]);

export default eslintConfig;
