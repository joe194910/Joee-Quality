import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { Evaluator } from "./types.js";
import { now } from "../core/utils.js";
import { inspectSrt, parseBlackRanges, parseSilenceRanges } from "./motion-analysis.js";

const probe = (ffprobe: string, path: string) => new Promise<{ code: number; text: string }>(resolve => {
  const p = spawn(ffprobe, ["-v", "error", "-show_streams", "-show_format", "-of", "json", path], { shell: false }); let text = "";
  p.stdout.on("data", x => text += x); p.stderr.on("data", x => text += x); p.on("error", () => resolve({ code: 127, text: "" })); p.on("close", code => resolve({ code: code ?? 1, text }));
});
const run = (command: string, args: string[]) => new Promise<{ code: number; text: string }>(resolve => {
  const p = spawn(command, args, { shell: false }); let text = "";
  p.stdout.on("data", x => text += x); p.stderr.on("data", x => text += x);
  p.on("error", error => resolve({ code: 127, text: error.message })); p.on("close", code => resolve({ code: code ?? 1, text }));
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
    const findings: any[] = []; const extraEvidence: any[] = []; const extraCriteria: any[] = []; const extraLimitations: string[] = [];
    if (!hasVideo) findings.push({ id: "f-video", title: "缺少视频轨", dimension: "reliability", description: "ffprobe 未发现视频流。", severity: "critical", evidenceIds: ["ev-ffprobe"], confidence: 1, impact: "视频不可交付", recommendedFix: "导出含有效视频流的文件。", verification: "ffprobe 显示 video stream。", status: "open", blocking: true });
    if (brief.requiresAudio && !hasAudio) findings.push({ id: "f-audio", title: "口播要求下缺少音轨", dimension: "intent_fidelity", description: "Brief 要求音频，但 ffprobe 未发现音频流。", severity: "critical", evidenceIds: ["ev-ffprobe"], confidence: 1, impact: "无法满足口播目标", recommendedFix: "加入并正确封装音轨。", verification: "ffprobe 显示 audio stream。", status: "open", blocking: true });
    const criteria = [
      { criterionId: "motion.video-stream", status: hasVideo ? "pass" as const : "fail" as const, score: hasVideo ? 10 as const : 0 as const, reason: hasVideo ? "检测到视频流。" : "未检测到视频流。", evidenceIds: ["ev-ffprobe"] },
      ...(brief.requiresAudio ? [{ criterionId: "motion.required-audio", status: hasAudio ? "pass" as const : "fail" as const, score: hasAudio ? 10 as const : 0 as const, reason: hasAudio ? "检测到必需音频流。" : "未检测到必需音频流。", evidenceIds: ["ev-ffprobe"] }] : [])
    ];
    const duration = Number(data.format?.duration);
    const checks = brief.motionChecks ?? {};
    if ((checks.blackFrames || checks.silence || checks.keyframes) && !environment.ffmpeg) extraLimitations.push("FFmpeg 不可用：黑帧、静音和关键帧抽样未评估。");
    if (checks.blackFrames && environment.ffmpeg) {
      const args = ["-hide_banner", "-nostats", "-i", artifact.localPath!, "-vf", "blackdetect=d=0.5:pix_th=0.10", "-an", "-f", "null", "-"];
      const analysis = await run(environment.ffmpeg, args); const ranges = parseBlackRanges(analysis.text);
      extraEvidence.push({ id: "ev-blackdetect", kind: "automated_test", locator: artifact.localPath!, source: "ffmpeg blackdetect", observedAt: now(), confidence: 0.9, tool: environment.ffmpeg, notes: `command=ffmpeg ${args.join(" ")}\nranges=${JSON.stringify(ranges)}\nexit=${analysis.code}`, availability: analysis.code === 0 ? "available" : "invalid" });
      extraCriteria.push({ criterionId: "motion.black-frames", status: analysis.code !== 0 ? "not_evaluated" : ranges.length ? "fail" : "pass", score: analysis.code !== 0 ? null : ranges.length ? 4 : 10, reason: analysis.code !== 0 ? "FFmpeg blackdetect 执行失败。" : ranges.length ? `发现 ${ranges.length} 个持续至少 0.5 秒的黑帧区间。` : "未发现达到阈值的黑帧区间。", evidenceIds: ["ev-blackdetect"] });
      if (ranges.length) findings.push({ id: "f-black", title: "检测到黑帧区间", dimension: "professional_craft", description: `发现 ${ranges.length} 个持续至少 0.5 秒的黑帧区间。`, severity: "major", evidenceIds: ["ev-blackdetect"], confidence: 0.9, impact: "可能造成播放中断或错误导出观感", recommendedFix: "检查对应时间段素材、转场和导出设置。", verification: "重新运行 blackdetect，确认预期外黑帧消失。", status: "open" });
    }
    if (checks.silence && environment.ffmpeg) {
      const args = ["-hide_banner", "-nostats", "-i", artifact.localPath!, "-af", "silencedetect=n=-50dB:d=2", "-vn", "-f", "null", "-"];
      const analysis = await run(environment.ffmpeg, args); const ranges = parseSilenceRanges(analysis.text);
      extraEvidence.push({ id: "ev-silencedetect", kind: "automated_test", locator: artifact.localPath!, source: "ffmpeg silencedetect", observedAt: now(), confidence: 0.85, tool: environment.ffmpeg, notes: `command=ffmpeg ${args.join(" ")}\nranges=${JSON.stringify(ranges)}\nexit=${analysis.code}`, availability: analysis.code === 0 ? "available" : "invalid" });
      extraCriteria.push({ criterionId: "motion.silence", status: analysis.code !== 0 ? "not_evaluated" : ranges.length ? "fail" : "pass", score: analysis.code !== 0 ? null : ranges.length ? 6 : 10, reason: analysis.code !== 0 ? "FFmpeg silencedetect 执行失败。" : ranges.length ? `发现 ${ranges.length} 个持续至少 2 秒的静音区间。` : "未发现达到阈值的静音区间。", evidenceIds: ["ev-silencedetect"] });
      if (ranges.length) findings.push({ id: "f-silence", title: "检测到长静音区间", dimension: "professional_craft", description: `发现 ${ranges.length} 个持续至少 2 秒的静音区间；工具无法判断静音是否为创作意图。`, severity: brief.requiresAudio ? "major" : "minor", evidenceIds: ["ev-silencedetect"], confidence: 0.85, impact: "可能存在音轨缺口或异常停顿", recommendedFix: "人工试听对应区间，确认是设计留白还是音频缺失。", verification: "试听并重新运行 silencedetect。", status: "open" });
    }
    if (checks.keyframes && environment.ffmpeg && Number.isFinite(duration) && duration > 0) {
      const evidenceDir = typeof artifact.metadata?.evidenceDir === "string" ? artifact.metadata.evidenceDir : undefined;
      if (!evidenceDir) extraLimitations.push("未提供 evidenceDir，未执行关键帧图片抽样。");
      else {
        await mkdir(evidenceDir, { recursive: true }); const timestamps = [duration * 0.1, duration * 0.5, duration * 0.9]; const files: string[] = []; const commands: string[] = [];
        for (let index = 0; index < timestamps.length; index++) { const file = join(evidenceDir, `frame-${index + 1}.jpg`); const args = ["-y", "-ss", timestamps[index].toFixed(3), "-i", artifact.localPath!, "-frames:v", "1", "-q:v", "2", file]; const extracted = await run(environment.ffmpeg, args); commands.push(`ffmpeg ${args.join(" ")} exit=${extracted.code}`); if (extracted.code === 0) files.push(file); }
        extraEvidence.push({ id: "ev-keyframes", kind: "automated_test", locator: evidenceDir, source: "ffmpeg frame sampling", observedAt: now(), confidence: 0.8, tool: environment.ffmpeg, notes: `strategy=10%,50%,90% duration=${duration}\nfiles=${JSON.stringify(files)}\n${commands.join("\n")}`, availability: files.length === 3 ? "available" : "invalid" });
        extraCriteria.push({ criterionId: "motion.keyframe-samples", status: files.length === 3 ? "pass" : "not_evaluated", score: files.length === 3 ? 10 : null, reason: files.length === 3 ? "已按时长 10%、50%、90% 抽取三张样本帧；抽样不能代表全部画面。" : "关键帧样本未完整生成。", evidenceIds: ["ev-keyframes"] });
      }
    }
    if (checks.subtitlePath) {
      try {
        const subtitle = await inspectSrt(checks.subtitlePath, Number.isFinite(duration) ? duration : undefined);
        extraEvidence.push({ id: "ev-subtitles", kind: "automated_test", locator: checks.subtitlePath, source: "SRT parser", observedAt: now(), confidence: 1, tool: "joee-quality", notes: JSON.stringify({ cueCount: subtitle.cues.length, overlaps: subtitle.overlaps, invalid: subtitle.invalid, overflow: subtitle.overflow }), availability: "available" });
        const failed = subtitle.overlaps.length || subtitle.invalid.length || subtitle.overflow.length;
        extraCriteria.push({ criterionId: "motion.subtitle-timeline", status: failed ? "fail" : "pass", score: failed ? 4 : 10, reason: failed ? `字幕存在 overlap=${subtitle.overlaps.length} invalid=${subtitle.invalid.length} overflow=${subtitle.overflow.length}。` : "字幕时间轴未发现重叠、反向区间或超出媒体时长。", evidenceIds: ["ev-subtitles"] });
        if (failed) findings.push({ id: "f-subtitles", title: "字幕时间轴异常", dimension: "professional_craft", description: `重叠 ${subtitle.overlaps.length} 处，无效区间 ${subtitle.invalid.length} 处，超出媒体时长 ${subtitle.overflow.length} 处。`, severity: subtitle.invalid.length ? "critical" : "major", evidenceIds: ["ev-subtitles"], confidence: 1, impact: "字幕可能错位、冲突或无法完整显示", recommendedFix: "修正报告中列出的字幕序号和时间码。", verification: "重新解析 SRT 并复核媒体末尾时间。", status: "open", blocking: Boolean(subtitle.invalid.length) });
      } catch (error) { extraLimitations.push(`字幕未评估：${error instanceof Error ? error.message : String(error)}`); }
    }
    const allCriteria = [...criteria, ...extraCriteria];
    return { evidence: [...evidence, ...extraEvidence], findings, criteria: allCriteria, limitations: ["黑帧、静音和关键帧均为抽样或阈值检测，不能替代逐帧观看与人工试听。", "未进行视觉高级感、叙事或声音美学判断。", ...extraLimitations], applicableCriteria: allCriteria.length, evaluatedCriteria: allCriteria.filter(c => c.status === "pass" || c.status === "fail").length };
  }
};
