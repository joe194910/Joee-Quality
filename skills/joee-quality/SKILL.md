---
name: joee-quality
description: Evidence-first audit and acceptance for deliverables. Use when users ask for 审片、质量检查、交付验收、评审、复评、quality audit, acceptance review, or verification of motion, design, research, or code artifacts.
---

# Joee-Quality

以可追溯证据判断交付是否符合目标；无法观察的部分必须标记 `not_evaluated`，不得猜测评分。

## 工作流

1. 收集作品路径、目标、受众、领域、约束、验收条件和期望等级。
2. 读取 `references/core.md`、`evidence.md`、`gates.md`，并按领域加载 `references/domains/<domain>.md`。
3. 将目标写为 Brief JSON，运行 `jqs inspect <artifact> --domain <domain> --json`。
4. 运行 `jqs evaluate <artifact> --brief <brief.json> --out <directory>`。
5. 引用报告中的 evidence ID，先处理 blocking/critical，再给 Repair Contract。
6. 修改后运行 `jqs verify <report.json> --artifact <artifact> --out <directory>`；无法执行的验证必须明确为 unverifiable。

## 错误与结束

- 退出码 1 表示质量阻断，2 表示用法错误，3 表示环境或数据错误。
- 不修改用户作品，除非用户明确授权。
- 不上传私有作品，不把审美偏好提升为通用标准。
- 硬门槛通过、目标等级达到、继续收益低于成本/风险，或用户要求停止时结束。
