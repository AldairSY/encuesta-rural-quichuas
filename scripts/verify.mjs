import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const checks = [
  [
    "lint",
    [
      "node_modules/eslint/bin/eslint.js",
      "app",
      "components",
      "lib",
      "hooks",
      "supabase/functions",
      "tests",
    ],
  ],
  ["typecheck", ["scripts/typecheck.mjs"]],
  ["unit", ["--experimental-strip-types", "--test", "tests/unit.test.mjs"]],
  ["http", ["--test", "tests/http.test.mjs"]],
  ["build-sites", ["node_modules/vinext/dist/cli.js", "build"]],
  ["build-vercel", ["node_modules/next/dist/bin/next", "build"]],
];
mkdirSync("docs/verification", { recursive: true });
const summary = [];
for (const [name, args] of checks) {
  process.stdout.write(`Validando ${name}...\n`);
  const result = spawnSync(process.execPath, args, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  const log = (result.stdout || "") + (result.stderr || "");
  writeFileSync(
    `docs/verification/${name}.log`,
    log
      .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, "")
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .join("\n")
      .trimEnd() + (log.trim() ? "\n" : ""),
  );
  summary.push({
    check: name,
    exitCode: result.status,
    passed: result.status === 0,
  });
  if (result.status !== 0) {
    process.stdout.write(log);
    writeFileSync(
      "docs/verification/summary.json",
      JSON.stringify(summary, null, 2),
    );
    process.exit(result.status || 1);
  }
  process.stdout.write(`${name}: OK\n`);
}
writeFileSync(
  "docs/verification/summary.json",
  JSON.stringify(summary, null, 2),
);
