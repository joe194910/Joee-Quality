import { describe, expect, it } from "vitest";
import { assessDimensions, calculateOverall, loadRubric, type RubricConfig } from "../../src/core/rubric.js";
import type { CriterionAssessment } from "../../src/schemas/types.js";

const rubric: RubricConfig = {
  version: "test", coverageThreshold: 0.7,
  weights: { intent_fidelity: 20, professional_craft: 25, creative_judgment: 10, coherent_experience: 15, reliability: 20, critique_precision: 10 },
  anchors: [0, 2, 4, 6, 8, 10], signatureRequiresHumanReview: true
};

describe("rubric scoring", () => {
  it("loads the bundled rubric independently of the caller working directory", async () => { const previous = process.cwd(); try { process.chdir(process.env.TEMP ?? previous); expect((await loadRubric()).version).toBe("0.1.0"); } finally { process.chdir(previous); } });
  it("keeps uncovered dimensions unscored", () => {
    const dimensions = assessDimensions([{ criterionId: "review.intent", status: "not_evaluated", score: null, reason: "missing", evidenceIds: [] }], rubric);
    expect(dimensions.find(d => d.dimension === "intent_fidelity")?.score).toBeNull();
    expect(calculateOverall(dimensions, rubric, false)).toEqual({ score: null, grade: null });
  });

  it("uses explicit applicable criterion denominators", () => {
    const items: CriterionAssessment[] = [
      ["review.intent", 8], ["review.craft", 8], ["review.creativity", 8],
      ["review.coherence", 8], ["review.reliability", 8], ["review.critique", 8]
    ].map(([criterionId, score]) => ({ criterionId: String(criterionId), status: "pass", score: score as 8, reason: "expert evidence", evidenceIds: ["expert"] }));
    const dimensions = assessDimensions(items, rubric);
    expect(dimensions.every(d => d.score === 8)).toBe(true);
    expect(dimensions.every(d => d.reason.includes("分母为 1"))).toBe(true);
    expect(calculateOverall(dimensions, rubric, false)).toEqual({ score: 80, grade: "B" });
  });

  it("hard blockers override a complete high score", () => {
    const dimensions = Object.keys(rubric.weights).map(dimension => ({ dimension, score: 10, confidence: 1, coverage: 1, criterionIds: [dimension], reason: "complete", evidenceIds: ["expert"] }));
    expect(calculateOverall(dimensions, rubric, true)).toEqual({ score: null, grade: "F" });
  });
  it("never awards S without signature eligibility", () => { const dimensions = Object.keys(rubric.weights).map(dimension => ({ dimension, score: 10, confidence: 1, coverage: 1, criterionIds: [dimension], reason: "complete", evidenceIds: ["expert"] })); expect(calculateOverall(dimensions, rubric, false, false).grade).toBe("A"); expect(calculateOverall(dimensions, rubric, false, true).grade).toBe("S"); });
});
