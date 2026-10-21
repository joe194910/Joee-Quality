# 架构

CLI 只负责参数与稳定退出码；Engine 组合领域 Evaluator；Evaluator 产生证据、Criterion Assessment、发现和限制；Zod Schema 校验引用及阻断不变量，并可导出 Draft-07 JSON Schema；Migration 在保留 reviewHistory 的前提下升级历史报告，迁移后必须再次通过完整校验；Reporter 生成稳定 JSON 与 Markdown。Motion 等上游通过公开 JSON、文件和扩展适配器调用，既不依赖私有实现，也不成为 Motion 的强制运行依赖。
