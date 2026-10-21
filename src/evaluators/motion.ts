import { spawn } from "node:child_process";
import type { Evaluator } from "./types.js";
import { now } from "../core/utils.js";

const probe = (ffprobe: string, path: string) => new Promise<{ code: number; text: string }>(resolve => {
  const p = spawn(ffprobe, ["-v", "error", "-show_streams", "-show_format", "-of", "json", path], { shell: false }); let text = "";
  p.stdout.on("data", x => text += x); p.stderr.on("data", x => text += x); p.on("error", () => resolve({ code: 127, text: "" })); p.on("close", code => resolve({ code: code ?? 1, text }));
});
export const motionEvaluator: Evaluator = {
  name: "motion", supports: a => Boolean(a.localPath), requiredEvidence: b => b.requiresAudio ? ["video-stream", "audio-stream"] : ["video-stream"],
  limitations: e => e.ffprobe ? [] : ["未检测到 ffprobe：视频流、音频流、时长、分辨率、帧率和像素格式未评估。"],
  async inspect(artifact, brief, environment) {
    if (!environment.ffprobe) return { evidence: [], findings: [], criteria: [
      { criterionId: "motion.video-stream", status: "not_evaluated", score: null, reason: "FFprobe 不可用。", evidenceIds: [] },
      ...(brief.requiresAudio ? [{ criterionId: "motion.required-audio", status: "not_evaluated" as const, score: null, reason: "FFprobe 不可用。", evidenceIds: [] }] : [])
    ], limitations: this.limitations(environment), applicableCriteria: brief.requiresAudio ? 2 : 1, evaluatedCriteria: 0 };
    const result = await probe(environment.ffprobe, artifact.localPath!);
    const evidence = [{ id: "ev-ffprobe", kind: "automated_test" as const, locator: artifact.localPath!, source: "ffprobe", observedAt: now(), confidence: 1, tool: environment.ffprobe, notes: result.text.slice(0, 8000), availability: result.code === 0 ? "available" as const : "invalid" as const }];
    if (result.code !== 0) return { evidence, findings: [], criteria: [{ criterionId: "motion.video-stream", status: "not_evaluated", score: null, reason: "FFprobe 无法解析产物。", evidenceIds: ["ev-ffprobe"] }], limitations: ["ffprobe 无法解析该产物。"], applicableCriteria: 1, evaluatedCriteria: 0 };
    const data = JSON.parse(result.text); const streams = Array.isArray(data.streams) ? data.streams : [];
    const hasVideo = streams.some((s: any) => s.codec_type === "video"); const hasAudio = streams.some((s: any) => s.codec_type === "audio");
    const findings: any[] = [];
    if (!hasVideo) findings.push({ id: "f-video", title: "缺少视频轨", dimension: "reliability", description: "ffprobe 未发现视频流。", severity: "critical", evidenceIds: ["ev-ffprobe"], confidence: 1, impact: "视频不可交付", recommendedFix: "导出含有效视频流的文件。", verification: "ffprobe 显示 video stream。", status: "open", blocking: true });
    if (brief.requiresAudio && !hasAudio) findings.push({ id: "f-audio", title: "口播要求下缺少音轨", dimension: "intent_fidelity", description: "Brief 要求音频，但 ffprobe 未发现音频流。", severity: "critical", evidenceIds: ["ev-ffprobe"], confidence: 1, impact: "无法满足口播目标", recommendedFix: "加入并正确封装音轨。", verification: "ffprobe 显示 audio stream。", status: "open", blocking: true });
    const criteria = [
      { criterionId: "motion.video-stream", status: hasVideo ? "pass" as const : "fail" as const, score: hasVideo ? 10 as const : 0 as const, reason: hasVideo ? "检测到视频流。" : "未检测到视频流。", evidenceIds: ["ev-ffprobe"] },
      ...(brief.requiresAudio ? [{ criterionId: "motion.required-audio", status: hasAudio ? "pass" as const : "fail" as const, score: hasAudio ? 10 as const : 0 as const, reason: hasAudio ? "检测到必需音频流。" : "未检测到必需音频流。", evidenceIds: ["ev-ffprobe"] }] : [])
    ];
    return { evidence, findings, criteria, limitations: ["未进行视觉高级感、叙事或声音美学判断。"], applicableCriteria: brief.requiresAudio ? 2 : 1, evaluatedCriteria: brief.requiresAudio ? 2 : 1 };
  }
};
