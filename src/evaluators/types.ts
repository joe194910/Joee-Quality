import type { Artifact, Brief, Evidence, Finding } from "../schemas/types.js";
export interface Environment { cwd: string; ffprobe?: string; }
export interface EvaluationResult { evidence: Evidence[]; findings: Finding[]; limitations: string[]; applicableCriteria: number; evaluatedCriteria: number; }
export interface Evaluator {
  name: string; supports(artifact: Artifact, environment: Environment): boolean;
  requiredEvidence(brief: Brief): string[]; limitations(environment: Environment): string[];
  inspect(artifact: Artifact, brief: Brief, environment: Environment): Promise<EvaluationResult>;
}
