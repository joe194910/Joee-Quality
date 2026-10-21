import type { Report } from "../schemas/types.js";
export function markdown(r: Report): string {
  const lines = [`# Joee-Quality 评审报告`, ``, `- 状态：${r.overallStatus}`, `- 等级：${r.grade ?? "未评级"}`, `- 分数：${r.score ?? "未评分"}`, `- 覆盖率：${r.coverage.evaluated}/${r.coverage.applicable} (${Math.round(r.coverage.ratio * 100)}%)`, ``, `## 发现`];
  if (!r.findings.length) lines.push(``, `未发现确定性硬错误；这不等于已通过专业审美或人工验收。`);
  for (const f of r.findings) lines.push(``, `### ${f.severity.toUpperCase()} · ${f.title}`, ``, f.description, ``, `证据：${f.evidenceIds.join(", ")}`, ``, `建议：${f.recommendedFix}`, ``, `复验：${f.verification}`);
  lines.push(``, `## 限制`); for (const x of r.limitations) lines.push(``, `- ${x}`);
  lines.push(``, `## 证据索引`); for (const e of r.evidence) lines.push(``, `- **${e.id}** ${e.kind} · ${e.locator} · ${e.availability}`);
  return lines.join("\n") + "\n";
}
