import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const failures = [];
for (const file of files) {
  if (/(^|\/)\.env($|\.)/.test(file) && !file.endsWith(".env.example"))
    failures.push(`${file}: archivo de entorno rastreado`);
  if (statSync(file).size > 2000000) continue;
  const content = readFileSync(file, "utf8");
  for (const token of content.match(
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  ) || []) {
    try {
      if (
        JSON.parse(Buffer.from(token.split(".")[1], "base64url")).role ===
        "service_role"
      )
        failures.push(`${file}: service role JWT`);
    } catch {}
  }
  if (/sb_secret_[A-Za-z0-9_-]{20,}/.test(content))
    failures.push(`${file}: clave privada Supabase`);
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(
  `${files.length} archivos rastreados revisados; sin claves privadas Supabase ni archivos .env reales.`,
);
