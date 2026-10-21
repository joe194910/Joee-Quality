import { describe, expect, it } from "vitest";
import { contrastRatio, designEvaluator } from "../../src/evaluators/design.js";

describe("design evaluator", () => {
  it("calculates WCAG contrast", () => expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1));
  it("passes a valid design manifest", async () => { const result = await designEvaluator.inspect({ id: "d", type: "design", localPath: "examples/design/manifest.json" }, { goal: "x", domain: "design" }, { cwd: process.cwd() }); expect(result.findings).toHaveLength(0); expect(result.criteria[1].status).toBe("pass"); });
  it("finds deterministic accessibility and consistency issues", async () => { const result = await designEvaluator.inspect({ id: "d", type: "design", localPath: "tests/fixtures/design-invalid.json" }, { goal: "x", domain: "design" }, { cwd: process.cwd() }); expect(result.findings.map(f => f.id)).toEqual(expect.arrayContaining(["f-design-ids", "f-design-small-text", "f-design-contrast"])); });
});
