import { readFile } from "node:fs/promises";

export interface TimeRange { start: number; end: number; duration: number; }
export interface SubtitleCue { index: number; start: number; end: number; text: string; }

export function parseBlackRanges(output: string): TimeRange[] {
  return [...output.matchAll(/black_start:([\d.]+)\s+black_end:([\d.]+)\s+black_duration:([\d.]+)/g)].map(match => ({ start: Number(match[1]), end: Number(match[2]), duration: Number(match[3]) }));
}

export function parseSilenceRanges(output: string): TimeRange[] {
  const starts = [...output.matchAll(/silence_start:\s*([\d.]+)/g)].map(match => Number(match[1]));
  const ends = [...output.matchAll(/silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/g)].map(match => ({ end: Number(match[1]), duration: Number(match[2]) }));
  return ends.map((item, index) => ({ start: starts[index] ?? Math.max(0, item.end - item.duration), end: item.end, duration: item.duration }));
}

function timestamp(value: string): number {
  const match = value.trim().match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/);
  if (!match) throw new Error(`无效字幕时间码: ${value}`);
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
}

export function parseSrt(content: string): SubtitleCue[] {
  return content.replaceAll("\r\n", "\n").trim().split(/\n{2,}/).filter(Boolean).map((block, position) => {
    const lines = block.split("\n"); const timingIndex = lines.findIndex(line => line.includes("-->"));
    if (timingIndex < 0) throw new Error(`第 ${position + 1} 个字幕块缺少时间码`);
    const [start, end] = lines[timingIndex].split("-->").map(timestamp);
    return { index: Number(lines[0]) || position + 1, start, end, text: lines.slice(timingIndex + 1).join("\n") };
  });
}

export async function inspectSrt(path: string, mediaDuration?: number) {
  const cues = parseSrt(await readFile(path, "utf8"));
  const overlaps = cues.slice(1).filter((cue, index) => cue.start < cues[index].end).map((cue, index) => ({ previous: cues[index].index, current: cue.index }));
  const invalid = cues.filter(cue => cue.end <= cue.start).map(cue => cue.index);
  const overflow = mediaDuration === undefined ? [] : cues.filter(cue => cue.end > mediaDuration).map(cue => cue.index);
  return { cues, overlaps, invalid, overflow };
}
