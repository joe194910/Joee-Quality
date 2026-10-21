import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("npm_execpath is unavailable; run this script through npm.");
const sandbox = mkdtempSync(join(tmpdir(), "joee-quality-package-"));

const run = (command, args, cwd = root) => execFileSync(command, args, {
  cwd,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
});

try {
  const packed = JSON.parse(run(process.execPath, [npmCli, "pack", "--json", "--pack-destination", sandbox]));
  const tarball = resolve(sandbox, packed[0].filename);
  writeFileSync(join(sandbox, "package.json"), JSON.stringify({ private: true }, null, 2));
  run(process.execPath, [npmCli, "install", "--no-audit", "--no-fund", tarball], sandbox);

  const cli = join(sandbox, "node_modules", "joee-quality", "dist", "cli.js");
  JSON.parse(run(process.execPath, [cli, "doctor", "--json"], sandbox));

  writeFileSync(join(sandbox, "artifact.json"), JSON.stringify({ name: "package smoke test" }));
  writeFileSync(join(sandbox, "brief.json"), JSON.stringify({ goal: "验证安装包可执行", domain: "design" }));
  run(process.execPath, [cli, "evaluate", "artifact.json", "--brief", "brief.json", "--out", "report"], sandbox);
  JSON.parse(readFileSync(join(sandbox, "report", "report.json"), "utf8"));

  console.log("Package smoke test passed.");
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}
