import { now } from "../core/utils.js";
import { reportSchema, type ParsedReport } from "./report.js";

export interface MigrationResult { from: string; to: "1.0.0"; report: ParsedReport; changes: string[]; }

export function migrateReport(input: unknown): MigrationResult {
  const current = reportSchema.safeParse(input);
  if (current.success) return { from: "1.0.0", to: "1.0.0", report: current.data, changes: [] };
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("报告必须是 JSON 对象");
  const legacy = structuredClone(input) as Record<string, any>; const from = String(legacy.schemaVersion ?? "unversioned"); const changes: string[] = [];
  if (!legacy.schemaVersion || legacy.schemaVersion === "0.1.0") { legacy.schemaVersion = "1.0.0"; changes.push("schemaVersion -> 1.0.0"); }
  if (!Array.isArray(legacy.criteria)) { legacy.criteria = []; changes.push("criteria -> []"); }
  if (!Array.isArray(legacy.limitations)) { legacy.limitations = []; changes.push("limitations -> []"); }
  if (!Array.isArray(legacy.reviewHistory)) { legacy.reviewHistory = []; changes.push("reviewHistory -> []"); }
  legacy.reviewHistory.push({ at: now(), action: `migrate:${from}->1.0.0`, reviewer: "joee-quality" });
  const migrated = reportSchema.safeParse(legacy);
  if (!migrated.success) throw new Error(`报告无法迁移到 1.0.0: ${migrated.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  return { from, to: "1.0.0", report: migrated.data, changes };
}
