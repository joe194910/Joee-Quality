import { access } from "node:fs/promises";
import type { Artifact, Brief, GateAssessment, Report } from "../schemas/types.js";
import type { Environment, Evaluator } from "../evaluators/types.js";
import { fileEvaluator } from "../evaluators/file.js";
import { codeEvaluator } from "../evaluators/code.js";
import { motionEvaluator } from "../evaluators/motion.js";
import { designEvaluator } from "../evaluators/design.js";
import { researchEvaluator } from "../evaluators/research.js";
import { professionalReviewEvaluator } from "../evaluators/professional-review.js";
import { now, sha256 } from "./utils.js";
import { assessDimensions, calculateOverall, loadRubric } from "./rubric.js";

async function commandExists(name: string): Promise<boolean> {
  const { spawn } = await import("node:child_process");
  return new Promise(resolve => { const p = spawn(name, ["-version"], { shell: false }); p.on("error", () => resolve(false)); p.on("close", c => resolve(c === 0)); });
}
export async function environment(cwd = process.cwd()): Promise<Environment> { return { cwd, ffprobe: await commandExists("ffprobe") ? "ffprobe" : undefined, ffmpeg: await commandExists("ffmpeg") ? "ffmpeg" : undefined }; }
export async function evaluate(artifact: Artifact, brief: Brief, suppliedEnv?: Environment): Promise<Report> {
  const env = suppliedEnv ?? await environment();
  const rubric = await loadRubric();
  if (artifact.localPath) try { await access(artifact.localPath); artifact.hash = await sha256(artifact.localPath); } catch { /* evaluator records it */ }
  const evaluators: Evaluator[] = [fileEvaluator];
  if (brief.domain === "code") evaluators.push(codeEvaluator);
  if (brief.domain === "motion") evaluators.push(motionEvaluator);
  if (brief.domain === "design") evaluators.push(designEvaluator);
  if (brief.domain === "research") evaluators.push(researchEvaluator);
  if (professionalReviewEvaluator.supports(artifact, env)) evaluators.push(professionalReviewEvaluator);
  const parts = await Promise.all(evaluators.filter(e => e.supports(artifact, env)).map(e => e.inspect(artifact, brief, env)));
  const evidence = parts.flatMap(x => x.evidence); const findings = parts.flatMap(x => x.findings); const limitations = parts.flatMap(x => x.limitations);
  const criteria = parts.flatMap(x => x.criteria);
  const applicable = parts.reduce((n, x) => n + x.applicableCriteria, 0); const evaluated = parts.reduce((n, x) => n + x.evaluatedCriteria, 0); const ratio = applicable ? evaluated / applicable : 0; const threshold = rubric.coverageThreshold;
  const blocked = findings.some(f => f.blocking && f.status === "open");
  const overallStatus = blocked ? "blocked" : ratio < threshold ? "unrated" : findings.length ? "needs_revision" : "passed";
  const dimensionsOut = assessDimensions(criteria, rubric);
  const depth = brief.reviewDepth ?? "standard";
  const signatureEligible = depth === "signature" && parts.some(part => part.signatureEligible);
  const overall = calculateOverall(dimensionsOut, rubric, blocked, signatureEligible);
  const humanReview = artifact.metadata?.professionalReview as any;
  const humanGates = new Map((Array.isArray(humanReview?.gates) ? humanReview.gates : []).map((gate: any) => [gate.gate, gate]));
  const gates: GateAssessment[] = (["brief", "concept", "craft", "critique", "acceptance"] as const).map(g => {
    const supplied = humanGates.get(g) as GateAssessment | undefined; if (supplied) return supplied;
    if (depth === "quick" && (g === "concept" || g === "critique")) return { gate: g, status: "not_applicable", reason: "Quick 深度不强制执行该 Gate。", evidenceIds: [], reviewerMode: "automated", reviewedAt: now() };
    if (g === "craft") return { gate: g, status: blocked ? "blocked" : ratio ? "pass" : "not_evaluated", reason: blocked ? "检测到硬阻断。" : "已完成可用确定性检查。", evidenceIds: evidence.filter(e => e.availability === "available").map(e => e.id), reviewerMode: "automated", reviewedAt: now() };
    if (g === "critique" && depth === "standard") return { gate: g, status: "not_evaluated", reason: "未提供独立评审，标记为同一 Agent 二次检查模式。", evidenceIds: [], reviewerMode: "same_agent_second_pass", reviewedAt: now() };
    return { gate: g, status: "not_evaluated", reason: depth === "signature" ? "Signature 深度需要合格专业评审证据。" : "需要用户或专业评审证据。", evidenceIds: [], reviewerMode: "automated", reviewedAt: now() };
  });
  return { schemaVersion: "1.0.0", standardVersion: rubric.version, artifact, brief, coverage: { evaluated, applicable, ratio, threshold }, overallStatus, grade: overall.grade, score: overall.score, criteria, dimensions: dimensionsOut, gates, findings, repairPlan: findings.map((f) => ({ findingIds: [f.id], changeScope: "最小受影响范围", action: f.recommendedFix, owner: "artifact-owner", expectedEffect: f.impact, risk: "修改后需回归相关验收项", verifyBy: f.verification, priority: f.severity === "critical" ? "P0" : f.severity === "major" ? "P1" : "P2", status: "open" })), evidence, limitations: [...new Set(limitations)], reviewHistory: [{ at: now(), action: "evaluate", reviewer: "joee-quality" }] };
}
