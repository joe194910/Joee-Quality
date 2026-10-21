import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { migrateReport } from "../../src/schemas/migrate.js";
import { reportSchema } from "../../src/schemas/report.js";

describe("report migration", () => {
  it("migrates an unversioned report and validates the result", async () => { const legacy = JSON.parse(await readFile("tests/fixtures/report-legacy.json", "utf8")); const result = migrateReport(legacy); expect(result).toMatchObject({ from: "unversioned", to: "1.0.0" }); expect(result.changes).toContain("criteria -> []"); expect(reportSchema.safeParse(result.report).success).toBe(true); });
  it("leaves a current valid report unchanged", async () => { const legacy = JSON.parse(await readFile("tests/fixtures/report-legacy.json", "utf8")); const current = migrateReport(legacy).report; expect(migrateReport(current).changes).toEqual([]); });
  it("rejects legacy reports that cannot satisfy current invariants", () => expect(() => migrateReport({ schemaVersion: "0.1.0" })).toThrow("无法迁移"));
});
