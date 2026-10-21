# 集成

上游可以直接提供 artifact 与 brief 调用 `jqs evaluate`，也可以输出 `contractVersion: 1.0.0` 的公开 JSON 并调用 `jqs evaluate-contract`。契约只包含公开 Artifact、Brief 和可选 Professional Review，不要求 Joee-Quality 知道上游私有实现。Motion 必须保留自身基础播放与数据正确性检查；JQS 仅提供可选深入审查。机器集成应读取 `report.json` 和进程退出码，不解析人类文本。
