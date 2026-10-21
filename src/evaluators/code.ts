import { spawn } from "node:child_process";
import type { Evaluator } from "./types.js";
import { now } from "../core/utils.js";

function run(command: string, args: string[], cwd: string): Promise<{ code: number; output: string }> {
  return new Promise(resolve => {
    const child = spawn(command, args, { cwd, shell: process.platform === "win32", env: process.env }); let output = "";
    child.stdout.on("data", x => output += x); child.stderr.on("data", x => output += x);
    child.on("error", e => resolve({ code: 127, output: e.message })); child.on("close", code => resolve({ code: code ?? 1, output }));
  });
}
export const codeEvaluator: Evaluator = {
  name: "code", supports: (_a, _e) => true, requiredEvidence: () => ["real-test-exit-code"], limitations: () => [],
  async inspect(artifact, _brief, environment) {
    const meta = artifact.metadata ?? {}; const command = typeof meta.testCommand === "string" ? meta.testCommand : "npm";
    const args = Array.isArray(meta.testArgs) ? meta.testArgs.map(String) : ["test"];
    const cwd = artifact.localPath ?? environment.cwd; const result = await run(command, args, cwd);
    const evidence = [{ id: "ev-tests", kind: "automated_test" as const, locator: `command:${command} ${args.join(" ")}`, source: "subprocess", observedAt: now(), confidence: 1, tool: command, notes: `exit=${result.code}\n${result.output.slice(-4000)}`, availability: "available" as const }];
    const findings = result.code === 0 ? [] : [{ id: "f-tests", title: "真实测试失败", dimension: "reliability", description: `测试命令退出码为 ${result.code}。`, severity: "critical" as const, evidenceIds: ["ev-tests"], confidence: 1, impact: "代码交付不满足正确性底线", recommendedFix: "修复失败测试或测试环境后重新运行。", verification: "相同命令退出码为 0。", status: "open" as const, blocking: true }];
    return { evidence, findings, limitations: [], applicableCriteria: 1, evaluatedCriteria: 1 };
  }
};
