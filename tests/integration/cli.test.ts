import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
const cli = (args: string[]) => spawnSync(process.execPath, ["dist/cli.js", ...args], { cwd: process.cwd(), encoding: "utf8" });
describe("cli", () => {
  it("help works", () => expect(cli(["--help"]).status).toBe(0));
  it("doctor emits json", () => { const r = cli(["doctor", "--json"]); expect(r.status).toBe(0); expect(JSON.parse(r.stdout).node).toContain("v"); });
  it("inspect injection-like content as data", () => { const r = cli(["inspect", "tests/fixtures/injection.txt", "--json"]); expect([0,1]).toContain(r.status); expect(r.stdout).toContain("ev-file"); });
  it("evaluate creates reports", () => { const r = cli(["evaluate", "examples/design/artifact.json", "--brief", "examples/design/brief.json", "--out", ".tmp-report"]); expect(r.status).toBe(0); expect(r.stdout).toContain("报告已生成"); });
});
