import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import type { Evaluator } from "./types.js";
import { now } from "../core/utils.js";

export const researchEvaluator: Evaluator = {
  name: "research", supports: artifact => Boolean(artifact.localPath), requiredEvidence: () => ["claims", "sources"], limitations: () => [],
  async inspect(artifact) {
    if (extname(artifact.localPath!).toLowerCase() !== ".json") return { evidence: [], findings: [], criteria: [{ criterionId: "research.manifest", status: "not_evaluated", score: null, reason: "当前适配器只支持 Research JSON manifest。", evidenceIds: [] }], limitations: ["未提供结构化 Research JSON manifest；事实和来源未评估。"], applicableCriteria: 1, evaluatedCriteria: 0 };
    try {
      const data = JSON.parse(await readFile(artifact.localPath!, "utf8")); const claims = Array.isArray(data.claims) ? data.claims : []; const sources = Array.isArray(data.sources) ? data.sources : [];
      const sourceIds = new Set(sources.map((source: any) => String(source.id)));
      const invalidSources = sources.filter((source: any) => !source.id || !source.title || !source.url || (() => { try { new URL(source.url); return false; } catch { return true; } })()).map((source: any) => source.id ?? "unknown");
      const brokenRefs = claims.flatMap((claim: any) => (Array.isArray(claim.sourceIds) ? claim.sourceIds : []).filter((id: unknown) => !sourceIds.has(String(id))).map((id: unknown) => ({ claim: claim.id, sourceId: String(id) })));
      const unsupported = claims.filter((claim: any) => claim.kind !== "opinion" && (!Array.isArray(claim.sourceIds) || claim.sourceIds.length === 0)).map((claim: any) => claim.id);
      const coverage = claims.length ? claims.filter((claim: any) => claim.kind === "opinion" || (Array.isArray(claim.sourceIds) && claim.sourceIds.length && claim.sourceIds.every((id: unknown) => sourceIds.has(String(id))))).length / claims.length : 0;
      const evidence = [{ id: "ev-research-manifest", kind: "automated_test" as const, locator: artifact.localPath!, source: "Research JSON manifest", observedAt: now(), confidence: 1, tool: "joee-quality research adapter", notes: JSON.stringify({ claimCount: claims.length, sourceCount: sources.length, invalidSources, brokenRefs, unsupported, coverage }), availability: "available" as const }];
      const findings: any[] = [];
      if (!claims.length) findings.push({ id: "f-research-claims", title: "没有可评估的研究主张", dimension: "intent_fidelity", description: "manifest 的 claims 为空。", severity: "major", evidenceIds: ["ev-research-manifest"], confidence: 1, impact: "无法建立研究结论与证据关系", recommendedFix: "列出需要验证的主张。", verification: "重新运行 Research 评审。", status: "open" });
      if (invalidSources.length) findings.push({ id: "f-research-sources", title: "来源元数据无效", dimension: "reliability", description: `无效来源: ${invalidSources.join(", ")}`, severity: "major", evidenceIds: ["ev-research-manifest"], confidence: 1, impact: "来源不可复查", recommendedFix: "补充来源 ID、标题和有效 URL。", verification: "所有来源元数据可解析。", status: "open" });
      if (brokenRefs.length) findings.push({ id: "f-research-refs", title: "主张引用不存在的来源", dimension: "reliability", description: JSON.stringify(brokenRefs), severity: "critical", evidenceIds: ["ev-research-manifest"], confidence: 1, impact: "证据链断裂", recommendedFix: "修正 sourceIds 或补充对应来源。", verification: "所有引用都能解析到 sources。", status: "open", blocking: true });
      if (unsupported.length) findings.push({ id: "f-research-unsupported", title: "事实主张缺少来源", dimension: "reliability", description: `无来源主张: ${unsupported.join(", ")}`, severity: "major", evidenceIds: ["ev-research-manifest"], confidence: 1, impact: "结论无法追溯", recommendedFix: "为事实主张补充来源，或明确标记为观点/假设。", verification: "事实主张具有可解析 sourceIds。", status: "open" });
      return { evidence, findings, criteria: [
        { criterionId: "research.manifest", status: "pass", score: 10, reason: "Research manifest 可解析。", evidenceIds: ["ev-research-manifest"] },
        { criterionId: "research.traceability", status: brokenRefs.length || unsupported.length || invalidSources.length ? "fail" : "pass", score: (Math.round(coverage * 5) * 2) as 0 | 2 | 4 | 6 | 8 | 10, reason: `可追溯主张覆盖率 ${Math.round(coverage * 100)}%，分母为 ${claims.length}。`, evidenceIds: ["ev-research-manifest"] }
      ], limitations: ["该适配器验证引用结构和可追溯性，不联网判断来源内容是否真实、权威或支持主张。"], applicableCriteria: 2, evaluatedCriteria: 2 };
    } catch (error) { return { evidence: [], findings: [], criteria: [{ criterionId: "research.manifest", status: "not_evaluated", score: null, reason: "Research manifest 无法解析。", evidenceIds: [] }], limitations: [`Research 适配器未评估：${error instanceof Error ? error.message : String(error)}`], applicableCriteria: 1, evaluatedCriteria: 0 }; }
  }
};
