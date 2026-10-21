import { describe, expect, it } from "vitest";
import { reportSchema } from "../../src/schemas/report.js";
import { evaluate } from "../../src/core/engine.js";
import { stable } from "../../src/core/utils.js";
import { compareReports } from "../../src/core/compare.js";
import type { Report } from "../../src/schemas/types.js";

const brief = { goal: "test", domain: "design" as const };
describe("report contract", () => {
  it("valid sample passes schema", async () => expect(reportSchema.safeParse(await evaluate({ id: "a", type: "json", localPath: "examples/design/artifact.json" }, brief, { cwd: process.cwd() })).success).toBe(true));
  it("default score is null", async () => expect((await evaluate({ id: "a", type: "json", localPath: "examples/design/artifact.json" }, brief, { cwd: process.cwd() })).score).toBeNull());
  it("missing path blocks without fabricated score", async () => { const r = await evaluate({ id: "a", type: "file", localPath: "missing-never-exists" }, brief, { cwd: process.cwd() }); expect(r.overallStatus).toBe("blocked"); expect(r.score).toBeNull(); });
  it("does not treat a project directory as an empty file", async () => { const r = await evaluate({ id: "a", type: "code", localPath: ".", metadata: { testCommand: process.execPath, testArgs: ["-e", "process.exit(0)"] } }, { goal: "test", domain: "code" }, { cwd: process.cwd() }); expect(r.findings.some(f => f.id === "f-empty")).toBe(false); expect(r.criteria.find(c => c.criterionId === "core.artifact-readable")?.status).toBe("pass"); });
  it("invalid evidence reference is rejected", async () => { const r: any = await evaluate({ id: "a", type: "json", localPath: "examples/design/artifact.json" }, brief, { cwd: process.cwd() }); r.findings.push({ id:"x",title:"x",dimension:"x",description:"x",severity:"minor",evidenceIds:["ghost"],confidence:1,impact:"x",recommendedFix:"x",verification:"x",status:"open" }); expect(reportSchema.safeParse(r).success).toBe(false); });
  it("criterion evidence references are validated", async () => { const r: any = await evaluate({ id: "a", type: "json", localPath: "examples/design/artifact.json" }, brief, { cwd: process.cwd() }); r.criteria[0].evidenceIds = ["ghost"]; expect(reportSchema.safeParse(r).success).toBe(false); });
  it("blocking report cannot claim A", async () => { const r: any = await evaluate({ id: "a", type: "file", localPath: "missing-never-exists" }, brief, { cwd: process.cwd() }); r.grade = "A"; expect(reportSchema.safeParse(r).success).toBe(false); });
  it("stable serialization sorts keys", () => expect(stable({ b: 1, a: 2 }).indexOf('"a"')).toBeLessThan(stable({ b: 1, a: 2 }).indexOf('"b"')));
  it("compare identifies fixed and added", () => { const base = { findings: [{ id: "old" }], score: null, grade: null, coverage: { ratio: .5 } } as unknown as Report; const next = { findings: [{ id: "new" }], score: null, grade: null, coverage: { ratio: 1 } } as unknown as Report; expect(compareReports(base, next)).toMatchObject({ fixed: ["old"], added: ["new"], scoreChange: null }); });
});
