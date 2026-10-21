import { describe, expect, it } from "vitest";
import { inspectSrt, parseBlackRanges, parseSilenceRanges, parseSrt } from "../../src/evaluators/motion-analysis.js";

describe("motion analysis parsers", () => {
  it("parses FFmpeg blackdetect ranges", () => expect(parseBlackRanges("black_start:1.2 black_end:2.5 black_duration:1.3")).toEqual([{ start: 1.2, end: 2.5, duration: 1.3 }]));
  it("parses FFmpeg silencedetect ranges", () => expect(parseSilenceRanges("silence_start: 3.0\nsilence_end: 6.5 | silence_duration: 3.5")).toEqual([{ start: 3, end: 6.5, duration: 3.5 }]));
  it("parses SRT cues", () => expect(parseSrt("1\n00:00:00,000 --> 00:00:01,500\nHello")[0]).toMatchObject({ index: 1, start: 0, end: 1.5, text: "Hello" }));
  it("finds subtitle overlap and duration overflow", async () => { const result = await inspectSrt("tests/fixtures/subtitles-overlap.srt", 5); expect(result.overlaps).toHaveLength(1); expect(result.overflow).toEqual([3]); });
  it("rejects malformed subtitle timing", () => expect(() => parseSrt("1\nnot-a-time\nHello")).toThrow("缺少时间码"));
});
