module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "..",
  testEnvironment: "node",
  testRegex: ".e2e-spec.ts$",
  transform: {
    "^.+\\.(t|j)s$": [
      "ts-jest",
      {
        tsconfig: "test/tsconfig.e2e.json",
      },
    ],
  },
  setupFiles: ["<rootDir>/test/e2e/setup-env.ts"],
  maxWorkers: 1,
  verbose: true,
};
