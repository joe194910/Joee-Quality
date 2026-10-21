import type { Report } from "../schemas/types.js";
export function compareReports(before: Report, after: Report) {
  const a = new Map(before.findings.map(f => [f.id, f])); const b = new Map(after.findings.map(f => [f.id, f]));
  const verifiable = after.overallStatus !== "unrated" && after.coverage.ratio >= after.coverage.threshold;
  const fixed = [...a.entries()].filter(([id, finding]) => finding.status !== "fixed" && !b.has(id) && verifiable).map(([id]) => id);
  const unverifiable = [...a.entries()].filter(([id, finding]) => finding.status !== "fixed" && !b.has(id) && !verifiable).map(([id]) => id);
  const regressed = [...a.entries()].filter(([id, finding]) => finding.status === "fixed" && b.has(id)).map(([id]) => id);
  const open = [...a.entries()].filter(([id, finding]) => finding.status !== "fixed" && b.has(id)).map(([id]) => id);
  return {
    fixed,
    open,
    regressed,
    unverifiable,
    added: [...b.keys()].filter(id => !a.has(id)),
    scoreChange: before.score === null || after.score === null ? null : after.score - before.score,
    gradeChange: { before: before.grade, after: after.grade },
    coverageChange: after.coverage.ratio - before.coverage.ratio
  };
}
