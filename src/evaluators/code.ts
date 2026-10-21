import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Evaluator } from "./types.js";
import { now } from "../core/utils.js";

const allowedCommands = new Set(["npm", "pnpm", "yarn", "node", "npx", "bun", "deno", "cargo", "mvn", "mvn.cmd", "gradle", "gradlew", "gradlew.bat", "go", "dotnet"]);

function run(command: string, args: string[], cwd: string, timeoutMs: number, maxOutputBytes: number): Promise<{ code: number; output: string; timedOut: boolean; truncated: boolean }> {
  return new Promise(resolve => {
    const normalized = command.replaceAll("\\", "/").split("/").pop()!.toLowerCase();
    const currentNode = command === process.execPath;
    if (!currentNode && !allowedCommands.has(normalized)) return resolve({ code: 126, output: `测试命令不在允许列表中: ${normalized}`, timedOut: false, truncated: false });
    let executable = command; let commandArgs = args;
    if (process.platform === "win32" && command.toLowerCase() === "npm") {
      const npmCli = join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
      if (!existsSync(npmCli)) return resolve({ code: 127, output: `无法定位 npm CLI: ${npmCli}`, timedOut: false, truncated: false });
      executable = process.execPath; commandArgs = [npmCli, ...args];
    }
    const child = spawn(executable, commandArgs, { cwd, shell: false, env: process.env }); let output = ""; let truncated = false; let settled = false; let timedOut = false;
    const append = (chunk: Buffer) => { if (Buffer.byteLength(output) >= maxOutputBytes) return void (truncated = true); const remaining = maxOutputBytes - Buffer.byteLength(output); output += chunk.subarray(0, remaining).toString(); if (chunk.length > remaining) truncated = true; };
    child.stdout.on("data", append); child.stderr.on("data", append);
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
    child.on("error", e => { if (!settled) { settled = true; clearTimeout(timer); resolve({ code: 127, output: e.message, timedOut: false, truncated }); } });
    child.on("close", code => { if (!settled) { settled = true; clearTimeout(timer); resolve({ code: timedOut ? 124 : code ?? 1, output, timedOut, truncated }); } });
  });
}
export const codeEvaluator: Evaluator = {
  name: "code", supports: (_a, _e) => true, requiredEvidence: () => ["real-test-exit-code"], limitations: () => [],
  async inspect(artifact, _brief, environment) {
    const meta = artifact.metadata ?? {}; const command = typeof meta.testCommand === "string" ? meta.testCommand : "npm";
    const args = Array.isArray(meta.testArgs) ? meta.testArgs.map(String) : ["test"];
    const timeoutMs = typeof meta.testTimeoutMs === "number" ? Math.min(Math.max(meta.testTimeoutMs, 100), 600000) : 120000;
    const maxOutputBytes = typeof meta.testMaxOutputBytes === "number" ? Math.min(Math.max(meta.testMaxOutputBytes, 1024), 10485760) : 1048576;
    const cwd = artifact.localPath ?? environment.cwd; const result = await run(command, args, cwd, timeoutMs, maxOutputBytes);
    const evidence = [{ id: "ev-tests", kind: "automated_test" as const, locator: `command:${command} ${args.join(" ")}`, source: "subprocess", observedAt: now(), confidence: 1, tool: command, notes: `exit=${result.code} timeoutMs=${timeoutMs} timedOut=${result.timedOut} truncated=${result.truncated}\n${result.output.slice(-4000)}`, availability: "available" as const }];
    const findings = result.code === 0 ? [] : [{ id: "f-tests", title: result.timedOut ? "真实测试超时" : "真实测试失败", dimension: "reliability", description: result.timedOut ? `测试命令超过 ${timeoutMs}ms 后被终止。` : `测试命令退出码为 ${result.code}。`, severity: "critical" as const, evidenceIds: ["ev-tests"], confidence: 1, impact: "代码交付不满足正确性或可复现性底线", recommendedFix: result.timedOut ? "定位挂起测试或调整经过评审的超时限制。" : "修复失败测试、命令策略或测试环境后重新运行。", verification: "相同命令在限制内完成且退出码为 0。", status: "open" as const, blocking: true }];
    return { evidence, findings, criteria: [{ criterionId: "code.tests-pass", status: result.code === 0 ? "pass" : "fail", score: result.code === 0 ? 10 : 0, reason: result.code === 0 ? "配置的真实测试命令执行成功。" : `测试命令退出码为 ${result.code}。`, evidenceIds: ["ev-tests"] }], limitations: [], applicableCriteria: 1, evaluatedCriteria: 1 };
  }
};
