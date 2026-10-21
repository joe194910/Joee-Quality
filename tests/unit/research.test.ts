import { describe, expect, it } from "vitest";
import { researchEvaluator } from "../../src/evaluators/research.js";

describe("research evaluator", () => {
  it("passes a traceable research manifest", async () => { const result = await researchEvaluator.inspect({ id: "r", type: "research", localPath: "examples/research/manifest.json" }, { goal: "x", domain: "research" }, { cwd: process.cwd() }); expect(result.findings).toHaveLength(0); expect(result.criteria[1]).toMatchObject({ status: "pass", score: 10 }); });
  it("blocks broken references and flags unsupported claims", async () => { const result = await researchEvaluator.inspect({ id: "r", type: "research", localPath: "tests/fixtures/research-invalid.json" }, { goal: "x", domain: "research" }, { cwd: process.cwd() }); expect(result.findings.find(f => f.id === "f-research-refs")?.blocking).toBe(true); expect(result.findings.map(f => f.id)).toContain("f-research-unsupported"); });
});
