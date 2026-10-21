import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { integrationContractSchema } from "../../src/integration/contract.js";

describe("public integration contract", () => {
  it("accepts the standalone design contract", async () => expect(integrationContractSchema.safeParse(JSON.parse(await readFile("examples/design/contract.json", "utf8"))).success).toBe(true));
  it("accepts the optional Motion contract without requiring Motion runtime code", async () => expect(integrationContractSchema.safeParse(JSON.parse(await readFile("examples/motion/contract.json", "utf8"))).success).toBe(true));
  it("rejects unsupported contract versions", async () => { const value = JSON.parse(await readFile("examples/design/contract.json", "utf8")); value.contractVersion = "2.0.0"; expect(integrationContractSchema.safeParse(value).success).toBe(false); });
  it("requires an artifact location", async () => { const value = JSON.parse(await readFile("examples/design/contract.json", "utf8")); delete value.artifact.localPath; expect(integrationContractSchema.safeParse(value).success).toBe(false); });
});
