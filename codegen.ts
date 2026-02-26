import { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: "./graphql.ts",
  documents: [
    "app/**/*.{ts,tsx}",
    "!app/api/toplogger_scrape/queries.ts",
    "!app/api/toplogger_scrape/fragments.ts",
  ],
  // Don't exit with non-zero status when there are no documents
  ignoreNoDocuments: true,
  generates: {
    "./graphql.generated.ts": {
      plugins: [
        "typescript",
        "typescript-operations",
        "typescript-resolvers",
        "typed-document-node",
      ],
      config: {
        avoidOptionals: { field: false, inputValue: false },
        defaultScalarType: "unknown",
        // Apollo Client always includes `__typename` fields
        nonOptionalTypename: true,
        // Apollo Client doesn't add the `__typename` field to root types so
        // don't generate a type for the `__typename` for root operation types.
        skipTypeNameForRoot: true,
        strictScalars: true,
        scalars: {
          Date: "Date",
          JSON: "unknown",
          JSONObject: "Record<string, unknown>",
        },
      },
    },
  },
};
export default config;
