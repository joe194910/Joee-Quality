import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import type { Evaluator } from "./types.js";
import { now } from "../core/utils.js";

function channel(value: number) { const normalized = value / 255; return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4; }
export function contrastRatio(foreground: string, background: string): number {
  const parse = (hex: string) => { const value = hex.replace("#", ""); if (!/^[0-9a-f]{6}$/i.test(value)) throw new Error(`无效颜色: ${hex}`); return [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16)); };
  const luminance = (hex: string) => { const [r, g, b] = parse(hex).map(channel); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const a = luminance(foreground); const b = luminance(background); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export const designEvaluator: Evaluator = {
  name: "design", supports: artifact => Boolean(artifact.localPath), requiredEvidence: () => ["design-manifest"], limitations: () => [],
  async inspect(artifact) {
    if (extname(artifact.localPath!).toLowerCase() !== ".json") return { evidence: [], findings: [], criteria: [{ criterionId: "design.manifest", status: "not_evaluated", score: null, reason: "当前适配器只支持 Design JSON manifest。", evidenceIds: [] }], limitations: ["未提供结构化 Design JSON manifest；视觉审美、布局和图层未评估。"], applicableCriteria: 1, evaluatedCriteria: 0 };
    try {
      const data = JSON.parse(await readFile(artifact.localPath!, "utf8")); const texts = Array.isArray(data.textElements) ? data.textElements : [];
      const ids = texts.map((item: any) => String(item.id ?? "")); const duplicateIds = ids.filter((id: string, index: number) => id && ids.indexOf(id) !== index);
      const empty = texts.filter((item: any) => !String(item.text ?? "").trim()).map((item: any) => item.id);
      const small = texts.filter((item: any) => Number(item.fontSize) < 12).map((item: any) => item.id);
      const contrast: Array<{ id: unknown; ratio: number | null; fontSize: number }> = texts.map((item: any) => { try { return { id: item.id, ratio: contrastRatio(String(item.color), String(item.backgroundColor)), fontSize: Number(item.fontSize) }; } catch { return { id: item.id, ratio: null, fontSize: Number(item.fontSize) }; } });
      const lowContrast = contrast.filter((item: { ratio: number | null; fontSize: number }) => item.ratio !== null && item.ratio < (item.fontSize >= 18 ? 3 : 4.5));
      const evidence = [{ id: "ev-design-manifest", kind: "automated_test" as const, locator: artifact.localPath!, source: "Design JSON manifest", observedAt: now(), confidence: 1, tool: "joee-quality design adapter", notes: JSON.stringify({ textCount: texts.length, duplicateIds, empty, small, contrast }), availability: "available" as const }];
      const findings: any[] = [];
      if (!texts.length) findings.push({ id: "f-design-evidence", title: "Design manifest 缺少文本元素", dimension: "professional_craft", description: "没有可供可读性和对比度检查的 textElements。", severity: "major", evidenceIds: ["ev-design-manifest"], confidence: 1, impact: "无法验证文本可访问性", recommendedFix: "导出包含文本、字号、前景色和背景色的 manifest。", verification: "重新运行 Design 评审。", status: "open" });
      if (duplicateIds.length) findings.push({ id: "f-design-ids", title: "设计元素 ID 重复", dimension: "coherent_experience", description: `重复 ID: ${[...new Set(duplicateIds)].join(", ")}`, severity: "major", evidenceIds: ["ev-design-manifest"], confidence: 1, impact: "图层或组件引用可能不稳定", recommendedFix: "为每个元素分配唯一 ID。", verification: "重新校验 manifest 中的 ID。", status: "open" });
      if (empty.length) findings.push({ id: "f-design-empty-text", title: "存在空文本元素", dimension: "professional_craft", description: `空文本元素: ${empty.join(", ")}`, severity: "minor", evidenceIds: ["ev-design-manifest"], confidence: 1, impact: "可能存在遗留占位图层", recommendedFix: "删除无用途图层或补充真实内容。", verification: "确认 textElements 不含非预期空文本。", status: "open" });
      if (small.length) findings.push({ id: "f-design-small-text", title: "文本字号过小", dimension: "professional_craft", description: `字号低于 12px 的元素: ${small.join(", ")}`, severity: "major", evidenceIds: ["ev-design-manifest"], confidence: 0.9, impact: "影响可读性", recommendedFix: "提高字号，或提供明确的例外和实际设备验证。", verification: "在目标设备复测字号。", status: "open" });
      if (lowContrast.length) findings.push({ id: "f-design-contrast", title: "文本对比度不足", dimension: "professional_craft", description: `未达到 WCAG AA 阈值的元素: ${lowContrast.map((x: { id: unknown; ratio: number | null }) => `${String(x.id)}(${x.ratio?.toFixed(2)})`).join(", ")}`, severity: "major", evidenceIds: ["ev-design-manifest"], confidence: 0.95, impact: "弱视或低对比环境下难以阅读", recommendedFix: "调整前景色或背景色并重新计算对比度。", verification: "普通文本达到 4.5:1，大文本达到 3:1。", status: "open" });
      const failed = findings.length > 0;
      return { evidence, findings, criteria: [
        { criterionId: "design.manifest", status: "pass", score: 10, reason: "Design manifest 可解析。", evidenceIds: ["ev-design-manifest"] },
        { criterionId: "design.accessibility", status: failed ? "fail" : "pass", score: failed ? 4 : 10, reason: failed ? `发现 ${findings.length} 个确定性设计问题。` : "未发现确定性文本可访问性问题。", evidenceIds: ["ev-design-manifest"] }
      ], limitations: ["JSON manifest 检查不评价构图、美感、品牌表达或实际渲染结果。"], applicableCriteria: 2, evaluatedCriteria: 2 };
    } catch (error) { return { evidence: [], findings: [], criteria: [{ criterionId: "design.manifest", status: "not_evaluated", score: null, reason: "Design manifest 无法解析。", evidenceIds: [] }], limitations: [`Design 适配器未评估：${error instanceof Error ? error.message : String(error)}`], applicableCriteria: 1, evaluatedCriteria: 0 }; }
  }
};
