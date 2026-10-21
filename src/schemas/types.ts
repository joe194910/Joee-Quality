export type Domain = "motion" | "design" | "research" | "code";
export type GateName = "brief" | "concept" | "craft" | "critique" | "acceptance";
export type GateStatus = "pass" | "needs_revision" | "blocked" | "not_applicable" | "not_evaluated";
export type Severity = "critical" | "major" | "minor" | "suggestion";
export type Availability = "available" | "missing" | "invalid";

export interface Artifact {
  id: string; type: string; uri?: string; localPath?: string; hash?: string;
  ownerScope?: string; privacy?: string; version?: string; metadata?: Record<string, unknown>;
}
export interface Brief {
  goal: string; audience?: string; deliverables?: string[]; constraints?: string[];
  acceptanceCriteria?: string[]; targetGrade?: "S" | "A" | "B" | "C"; domain: Domain;
  requiresAudio?: boolean;
}
export interface Evidence {
  id: string;
  kind: "direct_observation" | "automated_test" | "source_reference" | "user_feedback" | "expert_judgment" | "inference";
  locator: string; source: string; observedAt: string; confidence: number; tool?: string;
  notes?: string; availability: Availability;
}
export interface Finding {
  id: string; title: string; dimension: string; description: string; severity: Severity;
  evidenceIds: string[]; confidence: number; impact: string; recommendedFix: string;
  verification: string; status: "open" | "fixed" | "regressed" | "unverifiable";
  blocking?: boolean;
}
export interface DimensionAssessment {
  dimension: string; score: number | null; confidence: number; coverage: number;
  criterionIds: string[]; reason: string; evidenceIds: string[];
}
export interface GateAssessment {
  gate: GateName; status: GateStatus; reason: string; evidenceIds: string[];
  reviewerMode: "automated" | "human" | "same_agent_second_pass"; reviewedAt: string;
}
export interface RepairTask {
  findingIds: string[]; changeScope: string; action: string; owner: string;
  expectedEffect: string; risk: string; verifyBy: string; priority: "P0" | "P1" | "P2";
  status: "open" | "done" | "deferred";
}
export interface Report {
  schemaVersion: "1.0.0"; standardVersion: string; artifact: Artifact; brief: Brief;
  coverage: { evaluated: number; applicable: number; ratio: number; threshold: number };
  overallStatus: "passed" | "needs_revision" | "blocked" | "unrated";
  grade: "S" | "A" | "B" | "C" | "F" | null; score: number | null;
  dimensions: DimensionAssessment[]; gates: GateAssessment[]; findings: Finding[];
  repairPlan: RepairTask[]; evidence: Evidence[]; limitations: string[];
  reviewHistory: Array<{ at: string; action: string; reviewer: string }>;
}
