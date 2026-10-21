import { describe, expect, it } from "vitest";
import { addMemory } from "../../src/memory/store.js";
describe("memory safety", () => {
  it("rejects self-certified verified memory", async () => await expect(addMemory(".", { category:"verified", statement:"x", source:"model", counterexamples:[], scope:"project", invalidation:"new evidence" })).rejects.toThrow("必须有"));
  it("allows preference without universalizing it", async () => { const root = `.tmp-memory-${Date.now()}`; const x = await addMemory(root, { category:"preference", statement:"喜欢蓝色", source:"user", counterexamples:[], scope:"project", invalidation:"user changes preference" }); expect(x.category).toBe("preference"); });
});
