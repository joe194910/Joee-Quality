import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { professionalReviewEvaluator } from "../../src/evaluators/professional-review.js";
import { professionalReviewSchema } from "../../src/schemas/professional-review.js";
import { assessDimensions, calculateOverall, type RubricConfig } from "../../src/core/rubric.js";

const rubric: RubricConfig = { version: "test", coverageThreshold: 0.7, weights: { intent_fidelity: 20, professional_craft: 25, creative_judgment: 10, coherent_experience: 15, reliability: 20, critique_precision: 10 }, anchors: [0,2,4,6,8,10], signatureRequiresHumanReview: true };

describe("professional review", () => {
  it("validates referenced expert evidence", async () => { const review = JSON.parse(await readFile("examples/design/professional-review.json", "utf8")); expect(professionalReviewSchema.safeParse(review).success).toBe(true); });
  it("rejects nonexistent expert evidence references", async () => { const review = JSON.parse(await readFile("examples/design/professional-review.json", "utf8")); review.criteria[0].evidenceIds = ["ghost"]; expect(professionalReviewSchema.safeParse(review).success).toBe(false); });
  it("allows S only with a qualified independent complete review", async () => { const review = JSON.parse(await readFile("examples/design/professional-review.json", "utf8")); const result = await professionalReviewEvaluator.inspect({ id:"a", type:"design", metadata:{ professionalReview: review } }, { goal:"x", domain:"design", reviewDepth:"signature" }, { cwd:process.cwd() }); const dimensions = assessDimensions(result.criteria, rubric); expect(result.signatureEligible).toBe(true); expect(calculateOverall(dimensions, rubric, false, result.signatureEligible)).toEqual({ score: 100, grade: "S" }); });
  it("does not allow S without independent review", async () => { const review = JSON.parse(await readFile("examples/design/professional-review.json", "utf8")); review.reviewer.independent = false; const result = await professionalReviewEvaluator.inspect({ id:"a", type:"design", metadata:{ professionalReview: review } }, { goal:"x", domain:"design", reviewDepth:"signature" }, { cwd:process.cwd() }); expect(result.signatureEligible).toBe(false); });
});
