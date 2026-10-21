import { access } from "node:fs/promises";
import type { Artifact, Brief, GateAssessment, Report } from "../schemas/types.js";
import type { Environment, Evaluator } from "../evaluators/types.js";
import { fileEvaluator } from "../evaluators/file.js";
import { codeEvaluator } from "../evaluators/code.js";
import { motionEvaluator } from "../evaluators/motion.js";
import { now, sha256 } from "./utils.js";
import { assessDimensions, calculateOverall, loadRubric } from "./rubric.js";

async function commandExists(name: string): Promise<boolean> {
  const { spawn } = await import("node:child_process");
  return new Promise(resolve => { const p = spawn(name, ["-version"], { shell: false }); p.on("error", () => resolve(false)); p.on("close", c => resolve(c === 0)); });
}
export async function environment(cwd = process.cwd()): Promise<Environment> { return { cwd, ffprobe: await commandExists("ffprobe") ? "ffprobe" : undefined }; }
export async function evaluate(artifact: Artifact, brief: Brief, suppliedEnv?: Environment): Promise<Report> {
  const env = suppliedEnv ?? await environment();
  const rubric = await loadRubric();
  if (artifact.localPath) try { await access(artifact.localPath); artifact.hash = await sha256(artifact.localPath); } catch { /* evaluator records it */ }
  const evaluators: Evaluator[] = [fileEvaluator];
  if (brief.domain === "code") evaluators.push(codeEvaluator);
  if (brief.domain === "motion") evaluators.push(motionEvaluator);
  const parts = await Promise.all(evaluators.filter(e => e.supports(artifact, env)).map(e => e.inspect(artifact, brief, env)));
  const evidence = parts.flatMap(x => x.evidence); const findings = parts.flatMap(x => x.findings); const limitations = parts.flatMap(x => x.limitations);
  const criteria = parts.flatMap(x => x.criteria);
  const applicable = parts.reduce((n, x) => n + x.applicableCriteria, 0); const evaluated = parts.reduce((n, x) => n + x.evaluatedCriteria, 0); const ratio = applicable ? evaluated / applicable : 0; const threshold = rubric.coverageThreshold;
  const blocked = findings.some(f => f.blocking && f.status === "open");
  const overallStatus = blocked ? "blocked" : ratio < threshold ? "unrated" : findings.length ? "needs_revision" : "passed";
  const dimensionsOut = assessDimensions(criteria, rubric);
  const overall = calculateOverall(dimensionsOut, rubric, blocked);
  const gates: GateAssessment[] = (["brief", "concept", "craft", "critique", "acceptance"] as const).map(g => ({ gate: g, status: g === "craft" ? (blocked ? "blocked" : ratio ? "pass" : "not_evaluated") : "not_evaluated", reason: g === "craft" ? (blocked ? "检测到硬阻断。" : "已完成可用确定性检查。") : "需要用户或专业评审证据。", evidenceIds: g === "craft" ? evidence.filter(e => e.availability === "available").map(e => e.id) : [], reviewerMode: "automated", reviewedAt: now() }));
  return { schemaVersion: "1.0.0", standardVersion: rubric.version, artifact, brief, coverage: { evaluated, applicable, ratio, threshold }, overallStatus, grade: overall.grade, score: overall.score, criteria, dimensions: dimensionsOut, gates, findings, repairPlan: findings.map((f) => ({ findingIds: [f.id], changeScope: "最小受影响范围", action: f.recommendedFix, owner: "artifact-owner", expectedEffect: f.impact, risk: "修改后需回归相关验收项", verifyBy: f.verification, priority: f.severity === "critical" ? "P0" : f.severity === "major" ? "P1" : "P2", status: "open" })), evidence, limitations: [...new Set(limitations)], reviewHistory: [{ at: now(), action: "evaluate", reviewer: "joee-quality" }] };
}
