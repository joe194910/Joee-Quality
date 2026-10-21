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

  it("rejects commands outside the allowlist", async () => {
    const result = await codeEvaluator.inspect(
      { id: "code", type: "code", localPath: process.cwd(), metadata: { testCommand: "definitely-unsafe-command", testArgs: [] } },
      { goal: "test", domain: "code" }, { cwd: process.cwd() }
    );
    expect(result.findings[0]).toMatchObject({ blocking: true });
    expect(result.evidence[0].notes).toContain("exit=126");
  });

  it("terminates tests that exceed the configured timeout", async () => {
    const result = await codeEvaluator.inspect(
      { id: "code", type: "code", localPath: process.cwd(), metadata: { testCommand: process.execPath, testArgs: ["-e", "setTimeout(()=>{}, 5000)"], testTimeoutMs: 100 } },
      { goal: "test", domain: "code" }, { cwd: process.cwd() }
    );
    expect(result.findings[0].title).toContain("超时");
    expect(result.evidence[0].notes).toContain("timedOut=true");
  });

  it("caps captured test output", async () => {
    const result = await codeEvaluator.inspect(
      { id: "code", type: "code", localPath: process.cwd(), metadata: { testCommand: process.execPath, testArgs: ["-e", "process.stdout.write('x'.repeat(5000))"], testMaxOutputBytes: 1024 } },
      { goal: "test", domain: "code" }, { cwd: process.cwd() }
    );
    expect(result.evidence[0].notes).toContain("truncated=true");
    expect(result.findings).toHaveLength(0);
  });
});
