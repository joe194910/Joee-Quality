import type { Evaluator } from "./types.js";
import { professionalReviewSchema } from "../schemas/professional-review.js";

export const professionalReviewEvaluator: Evaluator = {
  name: "professional-review", supports: artifact => Boolean(artifact.metadata?.professionalReview), requiredEvidence: () => ["qualified-human-review"], limitations: () => [],
  async inspect(artifact) {
    const review = professionalReviewSchema.parse(artifact.metadata?.professionalReview);
    const complete = ["review.intent", "review.craft", "review.creativity", "review.coherence", "review.reliability", "review.critique"].every(id => review.criteria.some(item => item.criterionId === id && item.score !== null));
    return { evidence: review.evidence, findings: [], criteria: review.criteria, limitations: review.reviewer.independent ? [] : ["专业评审者未声明独立性，不满足 Signature/S 终审条件。"], applicableCriteria: review.criteria.filter(item => item.status !== "not_applicable").length, evaluatedCriteria: review.criteria.filter(item => item.status === "pass" || item.status === "fail").length, signatureEligible: review.reviewer.independent && Boolean(review.reviewer.qualification) && complete };
  }
};
