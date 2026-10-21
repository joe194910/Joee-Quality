import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { reportSchema } from "./report.js";
import { stable } from "../core/utils.js";

const target = resolve(process.argv[2] ?? "config/report.schema.json");
const schema = z.toJSONSchema(reportSchema, { target: "draft-7" });
await mkdir(dirname(target), { recursive: true });
await writeFile(target, stable({ $schema: "http://json-schema.org/draft-07/schema#", title: "Joee-Quality Report", ...schema }), "utf8");
console.log(target);
