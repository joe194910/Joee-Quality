import { access, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { extname, resolve } from "node:path";
import type { Evaluator } from "./types.js";
import type { Evidence, Finding } from "../schemas/types.js";
import { now } from "../core/utils.js";

export const fileEvaluator: Evaluator = {
  name: "file",
  supports: a => Boolean(a.localPath), requiredEvidence: () => ["artifact-readable"], limitations: () => [],
  async inspect(artifact) {
    const evidence: Evidence[] = []; const findings: Finding[] = []; const path = resolve(artifact.localPath!);
    try {
      await access(path, constants.R_OK); const info = await stat(path);
      evidence.push({ id: "ev-file", kind: "direct_observation", locator: path, source: "filesystem", observedAt: now(), confidence: 1, tool: "node:fs", notes: `extension=${extname(path)} size=${info.size}`, availability: "available" });
      if (info.size === 0) findings.push({ id: "f-empty", title: "交付文件为空", dimension: "professional_craft", description: "文件大小为零，无法构成交付物。", severity: "critical", evidenceIds: ["ev-file"], confidence: 1, impact: "核心产物缺失", recommendedFix: "重新导出有效产物。", verification: "文件大小大于零并重新评审。", status: "open", blocking: true });
      if (extname(path).toLowerCase() === ".json") {
        try { JSON.parse(await readFile(path, "utf8")); }
        catch { findings.push({ id: "f-json", title: "JSON 无效", dimension: "reliability", description: "JSON 无法解析。", severity: "critical", evidenceIds: ["ev-file"], confidence: 1, impact: "机器契约不可用", recommendedFix: "修复 JSON 语法。", verification: "使用 JSON.parse 或 Schema 校验。", status: "open", blocking: true }); }
      }
      return { evidence, findings, limitations: [], applicableCriteria: 1, evaluatedCriteria: 1 };
    } catch (error) {
      evidence.push({ id: "ev-file", kind: "direct_observation", locator: path, source: "filesystem", observedAt: now(), confidence: 1, tool: "node:fs", notes: error instanceof Error ? error.message : "不可访问", availability: "missing" });
      findings.push({ id: "f-missing", title: "无法访问交付物", dimension: "reliability", description: "指定路径不存在或不可读。", severity: "critical", evidenceIds: ["ev-file"], confidence: 1, impact: "无法开展评审", recommendedFix: "提供存在且可读的路径。", verification: "重新运行 inspect。", status: "open", blocking: true });
      return { evidence, findings, limitations: ["交付物不可访问，未对内容评分。"], applicableCriteria: 1, evaluatedCriteria: 0 };
    }
  }
};
