import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { now, stable } from "../core/utils.js";
export interface MemoryEntry { id: string; category: "preference" | "observation" | "verified" | "tool_gap" | "hypothesis" | "deprecated"; statement: string; source: string; counterexamples: string[]; scope: string; invalidation: string; history: Array<{ at: string; action: string }>; }
const pathFor = (root: string) => join(root, ".jqs", "memory.json");
async function load(root: string): Promise<MemoryEntry[]> { try { return JSON.parse(await readFile(pathFor(root), "utf8")); } catch { return []; } }
export async function listMemory(root: string) { return load(root); }
export async function addMemory(root: string, entry: Omit<MemoryEntry, "id" | "history">) {
  if (entry.category === "verified" && (!entry.source || entry.source === "model")) throw new Error("verified 记忆必须有外部或重复验证来源");
  const all = await load(root); const item = { ...entry, id: `mem-${Date.now()}`, history: [{ at: now(), action: "add" }] };
  all.push(item); await mkdir(dirname(pathFor(root)), { recursive: true }); await writeFile(pathFor(root), stable(all), "utf8"); return item;
}
export async function deprecateMemory(root: string, id: string) { const all = await load(root); const item = all.find(x => x.id === id); if (!item) throw new Error(`记忆不存在: ${id}`); item.category = "deprecated"; item.history.push({ at: now(), action: "deprecate" }); await writeFile(pathFor(root), stable(all), "utf8"); return item; }
