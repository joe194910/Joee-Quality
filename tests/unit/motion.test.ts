import { describe, expect, it } from "vitest";
import { motionEvaluator } from "../../src/evaluators/motion.js";

describe("motion degradation", () => {
  it("records tool gap when ffprobe unavailable", async () => { const r = await motionEvaluator.inspect({ id:"v", type:"mp4", localPath:"x.mp4" }, { goal:"x", domain:"motion", requiresAudio:true }, { cwd:process.cwd() }); expect(r.evaluatedCriteria).toBe(0); expect(r.limitations.join(" ")).toContain("ffprobe"); });
  it("does not fabricate findings without inspectable media", async () => { const r = await motionEvaluator.inspect({ id:"v", type:"mp4", localPath:"x.mp4" }, { goal:"x", domain:"motion" }, { cwd:process.cwd() }); expect(r.findings).toHaveLength(0); });
});
