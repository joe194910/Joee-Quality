import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import YAML from "yaml";
import type { Criterion, CriterionAssessment, DimensionAssessment } from "../schemas/types.js";

export const criterionCatalog: Criterion[] = [
  { id: "core.artifact-readable", description: "交付物存在且可读取", domain: "core", dimension: "reliability", importance: "required", blocking: true, verificationMethod: "filesystem", applicability: "具有本地路径的交付物" },
  { id: "code.tests-pass", description: "配置的真实测试命令通过", domain: "code", dimension: "reliability", importance: "required", blocking: true, verificationMethod: "subprocess exit code", applicability: "Code 项目" },
  { id: "motion.video-stream", description: "视频交付包含有效视频流", domain: "motion", dimension: "reliability", importance: "required", blocking: true, verificationMethod: "ffprobe", applicability: "Motion 视频" },
  { id: "motion.required-audio", description: "要求音频时包含有效音频流", domain: "motion", dimension: "intent_fidelity", importance: "required", blocking: true, verificationMethod: "ffprobe", applicability: "Brief requiresAudio=true" },
  { id: "review.intent", description: "作品忠实回应 Brief、受众与成功条件", domain: "core", dimension: "intent_fidelity", importance: "important", blocking: false, verificationMethod: "expert judgment", applicability: "具有完整 Brief 和可审阅作品" },
  { id: "review.craft", description: "执行细节达到目标领域的专业工艺要求", domain: "core", dimension: "professional_craft", importance: "important", blocking: false, verificationMethod: "expert judgment", applicability: "具有可审阅作品" },
  { id: "review.creativity", description: "创造性选择具有表达目的且不模板化", domain: "core", dimension: "creative_judgment", importance: "important", blocking: false, verificationMethod: "expert judgment", applicability: "需要创造性判断的作品" },
  { id: "review.coherence", description: "局部决策形成一致的整体体验", domain: "core", dimension: "coherent_experience", importance: "important", blocking: false, verificationMethod: "expert judgment", applicability: "多元素或多段落作品" },
  { id: "review.reliability", description: "事实、权利、隐私和交付真实性可靠", domain: "core", dimension: "reliability", importance: "required", blocking: true, verificationMethod: "expert judgment and source review", applicability: "所有专业交付" },
  { id: "review.critique", description: "审查覆盖关键风险并准确区分事实、推断和未知", domain: "core", dimension: "critique_precision", importance: "important", blocking: false, verificationMethod: "independent review", applicability: "Standard 或 Signature 评审" }
];

export interface RubricConfig {
  version: string;
  coverageThreshold: number;
  weights: Record<string, number>;
  anchors: number[];
  signatureRequiresHumanReview: boolean;
}

export async function loadRubric(path = resolve("config/default-rubric.yaml")): Promise<RubricConfig> {
  const parsed = YAML.parse(await readFile(path, "utf8")) as RubricConfig;
  const total = Object.values(parsed.weights).reduce((sum, value) => sum + value, 0);
  if (total !== 100) throw new Error(`量表权重总和必须为 100，当前为 ${total}`);
  if (parsed.coverageThreshold < 0 || parsed.coverageThreshold > 1) throw new Error("coverageThreshold 必须位于 0 到 1 之间");
  return parsed;
}

export function assessDimensions(assessments: CriterionAssessment[], rubric: RubricConfig): DimensionAssessment[] {
  return Object.keys(rubric.weights).map(dimension => {
    const definitions = criterionCatalog.filter(c => c.dimension === dimension);
    const items = definitions.map(definition => assessments.find(a => a.criterionId === definition.id)).filter((x): x is CriterionAssessment => Boolean(x));
    const applicable = items.filter(item => item.status !== "not_applicable");
    const evaluated = applicable.filter(item => item.status === "pass" || item.status === "fail");
    const coverage = applicable.length ? evaluated.length / applicable.length : 0;
    const evidenceIds = [...new Set(evaluated.flatMap(item => item.evidenceIds))];
    if (!applicable.length) return { dimension, score: null, confidence: 0, coverage: 0, criterionIds: [], reason: "当前评审没有该维度的适用检查项。", evidenceIds: [] };
    if (coverage < rubric.coverageThreshold) return { dimension, score: null, confidence: coverage, coverage, criterionIds: applicable.map(item => item.criterionId), reason: `证据覆盖率 ${Math.round(coverage * 100)}% 低于阈值 ${Math.round(rubric.coverageThreshold * 100)}%。`, evidenceIds };
    const scored = evaluated.filter(item => item.score !== null);
    const score = scored.length ? scored.reduce((sum, item) => sum + item.score!, 0) / scored.length : null;
    return { dimension, score, confidence: coverage, coverage, criterionIds: applicable.map(item => item.criterionId), reason: score === null ? "检查项没有可用分数。" : `按 ${scored.length} 个已评估检查项计算，分母为 ${scored.length}。`, evidenceIds };
  });
}

export function calculateOverall(dimensions: DimensionAssessment[], rubric: RubricConfig, blocked: boolean): { score: number | null; grade: "S" | "A" | "B" | "C" | "F" | null } {
  if (blocked) return { score: null, grade: "F" };
  const required = Object.keys(rubric.weights);
  if (!required.every(name => dimensions.find(d => d.dimension === name)?.score !== null)) return { score: null, grade: null };
  const weightedTotal = required.reduce((sum, name) => sum + dimensions.find(d => d.dimension === name)!.score! * rubric.weights[name], 0);
  const score = Math.round(weightedTotal) / 10;
  const minimum = Math.min(...required.map(name => dimensions.find(d => d.dimension === name)!.score!));
  const grade = score >= 90 && minimum >= 8 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : "F";
  return { score, grade };
}
