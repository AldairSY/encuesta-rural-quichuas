import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

// Next.js and Vinext both generate `.next/types` using different route type
// formats. Remove that shared generated directory so TypeScript checks source
// files consistently; each production build validates its own generated routes.
rmSync(".next/types", { recursive: true, force: true });

const result = spawnSync(
  process.execPath,
  ["node_modules/typescript/bin/tsc", "--noEmit"],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
