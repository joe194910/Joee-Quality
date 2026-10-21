import { z } from "zod";

const evidence = z.object({
  id: z.string().min(1), kind: z.enum(["direct_observation", "automated_test", "source_reference", "user_feedback", "expert_judgment", "inference"]),
  locator: z.string().min(1), source: z.string().min(1), observedAt: z.string().datetime(),
  confidence: z.number().min(0).max(1), tool: z.string().optional(), notes: z.string().optional(),
  availability: z.enum(["available", "missing", "invalid"])
});

export const reportSchema = z.object({
  schemaVersion: z.literal("1.0.0"), standardVersion: z.string(),
  artifact: z.object({ id: z.string(), type: z.string(), uri: z.string().optional(), localPath: z.string().optional(), hash: z.string().optional(), ownerScope: z.string().optional(), privacy: z.string().optional(), version: z.string().optional(), metadata: z.record(z.string(), z.unknown()).optional() }),
  brief: z.object({ goal: z.string(), audience: z.string().optional(), deliverables: z.array(z.string()).optional(), constraints: z.array(z.string()).optional(), acceptanceCriteria: z.array(z.string()).optional(), targetGrade: z.enum(["S", "A", "B", "C"]).optional(), domain: z.enum(["motion", "design", "research", "code"]), requiresAudio: z.boolean().optional() }),
  coverage: z.object({ evaluated: z.number().int().nonnegative(), applicable: z.number().int().nonnegative(), ratio: z.number().min(0).max(1), threshold: z.number().min(0).max(1) }),
  overallStatus: z.enum(["passed", "needs_revision", "blocked", "unrated"]), grade: z.enum(["S", "A", "B", "C", "F"]).nullable(), score: z.number().min(0).max(100).nullable(),
  dimensions: z.array(z.object({ dimension: z.string(), score: z.number().min(0).max(10).nullable(), confidence: z.number().min(0).max(1), coverage: z.number().min(0).max(1), criterionIds: z.array(z.string()), reason: z.string(), evidenceIds: z.array(z.string()) })),
  gates: z.array(z.object({ gate: z.enum(["brief", "concept", "craft", "critique", "acceptance"]), status: z.enum(["pass", "needs_revision", "blocked", "not_applicable", "not_evaluated"]), reason: z.string(), evidenceIds: z.array(z.string()), reviewerMode: z.enum(["automated", "human", "same_agent_second_pass"]), reviewedAt: z.string().datetime() })),
  findings: z.array(z.object({ id: z.string(), title: z.string(), dimension: z.string(), description: z.string(), severity: z.enum(["critical", "major", "minor", "suggestion"]), evidenceIds: z.array(z.string()), confidence: z.number().min(0).max(1), impact: z.string(), recommendedFix: z.string(), verification: z.string(), status: z.enum(["open", "fixed", "regressed", "unverifiable"]), blocking: z.boolean().optional() })),
  repairPlan: z.array(z.object({ findingIds: z.array(z.string()), changeScope: z.string(), action: z.string(), owner: z.string(), expectedEffect: z.string(), risk: z.string(), verifyBy: z.string(), priority: z.enum(["P0", "P1", "P2"]), status: z.enum(["open", "done", "deferred"]) })),
  evidence: z.array(evidence), limitations: z.array(z.string()), reviewHistory: z.array(z.object({ at: z.string().datetime(), action: z.string(), reviewer: z.string() }))
}).superRefine((report, ctx) => {
  const ids = new Set(report.evidence.map(e => e.id));
  for (const [path, refs] of [
    ...report.findings.map((x, i) => [["findings", i, "evidenceIds"], x.evidenceIds] as const),
    ...report.dimensions.map((x, i) => [["dimensions", i, "evidenceIds"], x.evidenceIds] as const),
    ...report.gates.map((x, i) => [["gates", i, "evidenceIds"], x.evidenceIds] as const)
  ]) for (const ref of refs) if (!ids.has(ref)) ctx.addIssue({ code: "custom", message: `不存在的证据引用: ${ref}`, path: [...path] });
  if (report.findings.some(f => f.blocking && f.status === "open") && report.overallStatus !== "blocked") ctx.addIssue({ code: "custom", message: "存在未解决硬阻断时 overallStatus 必须为 blocked", path: ["overallStatus"] });
  if (report.overallStatus === "blocked" && report.grade && ["S", "A"].includes(report.grade)) ctx.addIssue({ code: "custom", message: "硬阻断报告不得评级为 S/A", path: ["grade"] });
});

export type ParsedReport = z.infer<typeof reportSchema>;
