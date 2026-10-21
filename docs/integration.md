# 集成

上游先输出 artifact 与 brief，再调用 `jqs evaluate`。Motion 必须保留自身基础播放与数据正确性检查；JQS 仅提供可选深入审查。机器集成应读取 `report.json` 和进程退出码，不解析人类文本。
