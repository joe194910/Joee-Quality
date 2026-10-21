#!/usr/bin/env node
import { Command } from "commander";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { spawnSync } from "node:child_process";
import { evaluate, environment } from "./core/engine.js";
import { stable } from "./core/utils.js";
import { markdown } from "./reports/markdown.js";
import { reportSchema } from "./schemas/report.js";
import type { Artifact, Brief, Report } from "./schemas/types.js";
import { compareReports } from "./core/compare.js";
import { addMemory, deleteMemory, deprecateMemory, exportMemory, listMemory, setMemoryEnabled } from "./memory/store.js";

const EXIT = { OK: 0, FAILED: 1, USAGE: 2, ENVIRONMENT: 3 } as const;
const program = new Command().name("jqs").description("Joee-Quality evidence-first quality evaluator").version("0.1.0");
const output = (value: unknown, json = false) => console.log(json ? stable(value).trimEnd() : value);
const readJson = async <T>(path: string): Promise<T> => JSON.parse(await readFile(resolve(path), "utf8"));
function artifact(path: string, domain?: string): Artifact { return { id: "artifact-1", type: domain ?? (extname(path).slice(1) || "unknown"), localPath: resolve(path), ownerScope: "user", privacy: "local" }; }

program.command("doctor").description("检查运行环境").option("--json", "JSON 输出").action(async opts => {
  const env = await environment(); const result = { node: process.version, platform: process.platform, ffprobe: env.ffprobe ?? null, ffmpeg: env.ffmpeg ?? null, cwd: env.cwd, status: "ok", limitations: [...(env.ffprobe ? [] : ["motion 媒体元数据检查将降级"]), ...(env.ffmpeg ? [] : ["motion 黑帧、静音和关键帧抽样将降级"])] }; output(result, opts.json); process.exitCode = EXIT.OK;
});
program.command("init").description("初始化本地 JQS 配置").requiredOption("--domain <domain>", "motion|design|research|code").option("--target <grade>", "S|A|B|C", "A").action(async o => {
  const config = { domain: o.domain, targetGrade: o.target, coverageThreshold: 0.7, memoryEnabled: true }; await mkdir(".jqs", { recursive: true }); await writeFile(".jqs/config.json", stable(config)); output("已创建 .jqs/config.json");
});
program.command("inspect").description("仅收集可接触的确定性证据").argument("<artifact>").option("--domain <domain>", "评审领域", "design").option("--json", "JSON 输出").action(async (path, o) => {
  const brief: Brief = { goal: "检查交付物可访问性", domain: o.domain }; const r = await evaluate(artifact(path, o.domain), brief); output({ artifact: r.artifact, evidence: r.evidence, findings: r.findings, limitations: r.limitations }, o.json); process.exitCode = r.overallStatus === "blocked" ? EXIT.FAILED : EXIT.OK;
});
program.command("evaluate").description("生成 JSON 与 Markdown 评审报告").argument("<artifact>").requiredOption("--brief <path>", "Brief JSON").requiredOption("--out <directory>", "输出目录").option("--json", "JSON 输出摘要").action(async (path, o) => {
  const brief = await readJson<Brief>(o.brief); const a = artifact(path, brief.domain); if (brief.domain === "code") a.metadata = { testCommand: brief.testCommand?.command ?? "npm", testArgs: brief.testCommand?.args ?? ["test"], testTimeoutMs: brief.testCommand?.timeoutMs ?? 120000, testMaxOutputBytes: brief.testCommand?.maxOutputBytes ?? 1048576 }; if (brief.domain === "motion") a.metadata = { evidenceDir: resolve(o.out, "evidence") };
  const r = await evaluate(a, brief); reportSchema.parse(r); const dir = resolve(o.out); await mkdir(dir, { recursive: true }); await writeFile(resolve(dir, "report.json"), stable(r)); await writeFile(resolve(dir, "report.md"), markdown(r)); output(o.json ? { status: r.overallStatus, grade: r.grade, score: r.score, report: resolve(dir, "report.json") } : `报告已生成：${dir}`, o.json); process.exitCode = r.overallStatus === "blocked" ? EXIT.FAILED : EXIT.OK;
});
program.command("report").description("渲染 JSON 报告为 Markdown").argument("<report>").option("--json", "仅校验并输出 JSON").action(async (path, o) => { const r = reportSchema.parse(await readJson(path)); output(o.json ? r : markdown(r), o.json); });
program.command("compare").description("比较两次评审结果").argument("<before>").argument("<after>").option("--json", "JSON 输出", true).action(async (a, b, o) => output(compareReports(reportSchema.parse(await readJson(a)) as Report, reportSchema.parse(await readJson(b)) as Report), o.json));
program.command("verify").description("重新评审受影响项；不会伪装成人工验证").argument("<report>").requiredOption("--artifact <path>").option("--out <directory>", "输出目录").action(async (reportPath, o) => {
  const previous = reportSchema.parse(await readJson(reportPath)) as Report; const next = await evaluate({ ...artifact(o.artifact, previous.brief.domain), metadata: previous.artifact.metadata }, previous.brief); const diff = compareReports(previous, next); if (o.out) { await mkdir(o.out, { recursive: true }); await writeFile(resolve(o.out, "report.json"), stable(next)); await writeFile(resolve(o.out, "report.md"), markdown(next)); } output({ verification: diff, status: next.overallStatus }, true); process.exitCode = next.overallStatus === "blocked" ? EXIT.FAILED : EXIT.OK;
});
const learn = program.command("learn").description("管理本地范围 Quality Memory");
learn.command("list").option("--scope <scope>", "作用域", "project").action(async () => output(await listMemory(process.cwd()), true));
learn.command("add").requiredOption("--category <category>").requiredOption("--statement <text>").requiredOption("--source <source>").option("--scope <scope>", "作用域", "project").action(async o => output(await addMemory(process.cwd(), { category: o.category, statement: o.statement, source: o.source, counterexamples: [], scope: o.scope, invalidation: "新证据推翻或适用范围变化" }), true));
learn.command("deprecate").argument("<id>").action(async id => output(await deprecateMemory(process.cwd(), id), true));
learn.command("delete").argument("<id>").description("永久删除一条本地记忆").action(async id => output(await deleteMemory(process.cwd(), id), true));
learn.command("export").requiredOption("--out <path>", "导出 JSON 路径").action(async o => output(await exportMemory(process.cwd(), resolve(o.out)), true));
learn.command("disable").description("禁用本地记忆写入").action(async () => output(await setMemoryEnabled(process.cwd(), false), true));
learn.command("enable").description("重新启用本地记忆写入").action(async () => output(await setMemoryEnabled(process.cwd(), true), true));

program.exitOverride();
try { await program.parseAsync(); } catch (error: any) {
  if (error?.code === "commander.helpDisplayed" || error?.code === "commander.version") process.exitCode = EXIT.OK;
  else { const usage = error?.code?.startsWith("commander."); console.error(usage ? error.message : `错误：${error instanceof Error ? error.message : String(error)}`); process.exitCode = usage ? EXIT.USAGE : EXIT.ENVIRONMENT; }
}
