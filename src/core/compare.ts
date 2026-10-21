import type { Report } from "../schemas/types.js";
export function compareReports(before: Report, after: Report) {
  const a = new Map(before.findings.map(f => [f.id, f])); const b = new Map(after.findings.map(f => [f.id, f]));
  return {
    fixed: [...a.keys()].filter(id => !b.has(id)),
    open: [...a.keys()].filter(id => b.has(id)),
    added: [...b.keys()].filter(id => !a.has(id)),
    scoreChange: before.score === null || after.score === null ? null : after.score - before.score,
    gradeChange: { before: before.grade, after: after.grade },
    coverageChange: after.coverage.ratio - before.coverage.ratio
  };
}
