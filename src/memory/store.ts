import { access, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { now, stable } from "../core/utils.js";
export interface MemoryEntry { id: string; category: "preference" | "observation" | "verified" | "tool_gap" | "hypothesis" | "deprecated"; statement: string; source: string; counterexamples: string[]; scope: string; invalidation: string; history: Array<{ at: string; action: string }>; }
const pathFor = (root: string) => join(root, ".jqs", "memory.json");
const disabledPathFor = (root: string) => join(root, ".jqs", "memory.disabled");
async function load(root: string): Promise<MemoryEntry[]> { try { return JSON.parse(await readFile(pathFor(root), "utf8")); } catch { return []; } }
export async function memoryEnabled(root: string) { try { await access(disabledPathFor(root)); return false; } catch { return true; } }
export async function listMemory(root: string) { return { enabled: await memoryEnabled(root), entries: await load(root) }; }
export async function addMemory(root: string, entry: Omit<MemoryEntry, "id" | "history">) {
  if (!await memoryEnabled(root)) throw new Error("本地 Quality Memory 已禁用");
  if (entry.category === "verified" && (!entry.source || entry.source === "model")) throw new Error("verified 记忆必须有外部或重复验证来源");
  const all = await load(root); const item = { ...entry, id: `mem-${Date.now()}`, history: [{ at: now(), action: "add" }] };
  all.push(item); await mkdir(dirname(pathFor(root)), { recursive: true }); await writeFile(pathFor(root), stable(all), "utf8"); return item;
}
export async function deprecateMemory(root: string, id: string) { const all = await load(root); const item = all.find(x => x.id === id); if (!item) throw new Error(`记忆不存在: ${id}`); item.category = "deprecated"; item.history.push({ at: now(), action: "deprecate" }); await writeFile(pathFor(root), stable(all), "utf8"); return item; }
export async function deleteMemory(root: string, id: string) { const all = await load(root); const next = all.filter(x => x.id !== id); if (next.length === all.length) throw new Error(`记忆不存在: ${id}`); await writeFile(pathFor(root), stable(next), "utf8"); return { deleted: id }; }
export async function exportMemory(root: string, target: string) { const entries = await load(root); await mkdir(dirname(target), { recursive: true }); await writeFile(target, stable({ exportedAt: now(), scope: "project", entries }), "utf8"); return { target, count: entries.length }; }
export async function setMemoryEnabled(root: string, enabled: boolean) { await mkdir(dirname(disabledPathFor(root)), { recursive: true }); if (enabled) { try { await unlink(disabledPathFor(root)); } catch { /* already enabled */ } } else await writeFile(disabledPathFor(root), `disabledAt=${now()}\n`, "utf8"); return { enabled }; }
