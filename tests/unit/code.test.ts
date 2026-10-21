import { describe, expect, it } from "vitest";
import { codeEvaluator } from "../../src/evaluators/code.js";

describe("configurable code tests", () => {
  it("runs the configured command and records a passing criterion", async () => {
    const result = await codeEvaluator.inspect(
      { id: "code", type: "code", localPath: process.cwd(), metadata: { testCommand: process.execPath, testArgs: ["-e", "process.exit(0)"] } },
      { goal: "test", domain: "code" },
      { cwd: process.cwd() }
    );
    expect(result.findings).toHaveLength(0);
    expect(result.criteria[0]).toMatchObject({ criterionId: "code.tests-pass", status: "pass", score: 10 });
  });

  it("blocks when the configured command really fails", async () => {
    const result = await codeEvaluator.inspect(
      { id: "code", type: "code", localPath: process.cwd(), metadata: { testCommand: process.execPath, testArgs: ["-e", "process.exit(7)"] } },
      { goal: "test", domain: "code" },
      { cwd: process.cwd() }
    );
    expect(result.findings[0]).toMatchObject({ id: "f-tests", blocking: true });
    expect(result.criteria[0]).toMatchObject({ status: "fail", score: 0 });
    expect(result.evidence[0].notes).toContain("exit=7");
  });
});
