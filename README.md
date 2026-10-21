<h1 align="center">Joee-Quality</h1>

<p align="center">
  面向 Agent 与自动化流程的证据化交付质量评审工具
</p>

<p align="center">
  <img alt="版本" src="https://img.shields.io/badge/version-0.1.0-0d6efd">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-%3E%3D20-339933">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178c6">
  <img alt="测试" src="https://img.shields.io/badge/tests-55%20passed-2ea44f">
  <img alt="许可证" src="https://img.shields.io/badge/license-MIT-yellow">
</p>

Joee-Quality 将交付物检查、证据记录、硬阻断、修复任务和复评比较放在一个本地 CLI 与 Agent Skill 中。它读取真实文件、真实媒体信息和真实测试退出码，不使用推测结果伪造“已通过”状态。

评审会同时生成机器可读的 `report.json` 和人工可读的 `report.md`。证据不足时保留 `score: null`；测试失败、核心文件缺失、JSON 损坏或必需音轨缺失时直接阻断评级。

> 当前项目处于早期版本。自动检查不能代替专业审美、事实核验或人工终审，请先阅读下方的“当前限制”。

## 已实现能力

### 文件与结构化数据

- 检查本地路径是否存在、文件是否可读以及文件大小。
- 检测空文件和无效 JSON。
- 计算可访问文件的 SHA-256 哈希。
- 校验报告 Schema、Evidence ID 引用和硬阻断状态一致性。
- 提供可生成、可提交的 Draft-07 JSON Schema。
- 使用稳定 JSON 序列化，便于 Git diff 和自动化比较。
- 路径不存在或证据不可访问时不生成虚假分数。

### Code 评审

- 对代码项目运行真实 `npm test` 命令。
- 保存测试进程的真实退出码和输出日志。
- 测试退出码不为 `0` 时生成 `critical` finding 并阻断评级。
- 测试命令经过允许列表检查，不通过 shell 拼接参数。
- 支持配置执行超时和最大日志字节数，超时会终止进程并阻断评级。
- 不通过静态猜测或文件数量推断测试已经通过。

### Motion 评审

- 检测环境中的真实 FFprobe 可用性。
- 使用 FFprobe 读取视频流、音频流和媒体元数据。
- 视频文件缺少视频轨时生成硬阻断。
- Brief 要求口播或音频但文件没有音轨时生成硬阻断。
- 可选运行 FFmpeg `blackdetect` 和 `silencedetect`，记录真实命令、阈值和时间区间。
- 可在报告 evidence 目录按媒体时长 10%、50%、90% 抽取三张真实样本帧。
- 支持解析外部 SRT，检测字幕区间反向、相互重叠和超出媒体时长。
- FFprobe 不存在或无法解析文件时明确标记未评估，不伪造检查结果。

### 报告与复评

- 输出结构化 Evidence Ledger、Findings、Gate Assessments 和 Repair Plan。
- 每个主要问题关联实际 Evidence ID、影响、修复建议和复验方式。
- 支持重新评审修改后的产物。
- 支持比较两次报告中的已修复、仍存在、新增、回归和因覆盖不足而无法验证的问题。
- 覆盖率不足时使用 `unrated`，而不是强行给出等级。
- 从 `config/default-rubric.yaml` 加载六维权重和覆盖率阈值。
- 只对达到覆盖率要求的维度评分，并在维度说明中写明检查项分母。
- 只有六个核心维度均具备有效分数时才计算 0–100 综合分。
- 自动化检查不会授予 S 级。
- 支持导入带评审者身份、专业资格、独立性和真实 Evidence ID 的人工专业评审。
- `standard` 深度即使满分也最高为 A；只有 `signature` 深度、六维完整、总分至少 92、各维至少 8 且独立合格人工终审时才允许 S。

### Design 结构化评审

- 读取 Design JSON manifest 中的文本、字号、前景色和背景色。
- 按 WCAG AA 阈值计算文本对比度。
- 检查小于 12px 的文本、空文本元素和重复元素 ID。
- 只报告确定性可访问性与一致性问题，不把 manifest 检查冒充完整视觉审美评审。

### Research 结构化评审

- 读取 Research JSON manifest 中的 `claims` 和 `sources`。
- 校验来源 ID、标题和 URL 元数据。
- 检查事实主张是否具有来源，以及 source ID 是否能解析。
- 输出可追溯主张覆盖率和明确分母。
- 不联网推断来源内容真实性、权威性或是否真正支持主张。

### Quality Memory

- 在项目 `.jqs/memory.json` 中保存本地范围经验。
- 支持 `preference`、`observation`、`verified`、`tool_gap`、`hypothesis` 和 `deprecated`。
- 禁止模型把没有外部来源的判断自行标记为 `verified`。
- 用户个人偏好不会自动提升为通用质量规则。
- 支持用户导出、永久删除、禁用和重新启用本地记忆。

## 运行要求

### CLI

- Node.js 20 或更高版本。
- npm。
- Motion 媒体检查可选安装 FFmpeg/FFprobe。

项目当前已在以下环境完成验证：

```text
Node.js v24.18.0
npm 11.16.0
Windows
FFprobe available
```

### Agent Skill

- 支持项目级或用户级 Skills 的 Agent 环境。
- Agent 必须能够读取 `skills/joee-quality/SKILL.md` 及其 `references/`。
- Agent Skill 负责组织评审流程；实际确定性检查由本地 `jqs` CLI 执行。

## 安装

```powershell
git clone <你的仓库地址>
cd joee-quality
npm install
npm run build
npm link
```

验证安装：

```powershell
jqs --version
jqs --help
jqs doctor --json
```

不注册全局命令时，可以直接运行：

```powershell
node .\dist\cli.js --help
```

## 开始使用

### 初始化项目配置

```powershell
jqs init --domain motion --target A
```

该命令会在当前目录创建：

```text
.jqs\config.json
```

支持的领域为 `motion`、`design`、`research` 和 `code`，目标等级可以是 `S`、`A`、`B` 或 `C`。

### 编写 Brief

Brief 用来说明评审目标和验收条件。最少需要提供 `goal` 和 `domain`。

```json
{
  "goal": "确认这个 JSON 交付可以被系统正常读取",
  "audience": "项目开发团队",
  "acceptanceCriteria": [
    "文件存在且可读取",
    "JSON 格式有效"
  ],
  "targetGrade": "A",
  "domain": "design"
}
```

Motion 口播视频可以声明必须存在音轨：

```json
{
  "goal": "检查口播视频技术交付",
  "domain": "motion",
  "requiresAudio": true,
  "motionChecks": {
    "blackFrames": true,
    "silence": true,
    "keyframes": true,
    "subtitlePath": "./subtitles.srt"
  }
}
```

仓库内置 Brief 示例位于：

```text
examples\design\brief.json
examples\motion\brief.json
examples\code\brief.json
```

### 检查单个交付物

```powershell
jqs inspect .\examples\design\artifact.json --domain design --json
```

`inspect` 只收集当前能够访问的确定性证据，不执行专业审美评分。

### 生成完整报告

```powershell
jqs evaluate .\examples\design\artifact.json `
  --brief .\examples\design\brief.json `
  --out .\.jqs\reports\design-demo
```

生成结果：

```text
.jqs\reports\design-demo\
├─ report.json    机器、Agent 和 CI 使用
└─ report.md      人工阅读
```

Linux 和 macOS 可以使用：

```bash
jqs evaluate ./examples/design/artifact.json \
  --brief ./examples/design/brief.json \
  --out ./.jqs/reports/design-demo
```

### 导入专业评审

```powershell
jqs evaluate .\examples\design\manifest.json `
  --brief .\examples\design\brief-signature.json `
  --review .\examples\design\professional-review.json `
  --out .\.jqs\reports\signature-demo
```

专业评审 JSON 必须提供评审者资格、独立性、可定位证据、六维 Criterion Assessment，并保证所有 Evidence ID 可解析。仓库示例仅展示契约格式，不代表真实项目已经获得专业认证。

### 评审代码项目

将代码项目目录作为 artifact 传入：

```powershell
jqs evaluate .\my-project `
  --brief .\examples\code\brief.json `
  --out .\.jqs\reports\code-demo
```

示例 Brief 会在 `my-project` 目录中真实执行：

```powershell
npm test
```

可以在 Brief 中配置不经过 shell 拼接的测试命令和参数：

```json
{
  "goal": "运行项目集成测试",
  "domain": "code",
  "testCommand": {
    "command": "npm",
    "args": ["run", "test:integration"],
    "timeoutMs": 120000,
    "maxOutputBytes": 1048576
  }
}
```

测试失败时命令返回退出码 `1`，报告状态为 `blocked`。

### 修改后复评

```powershell
jqs verify .\.jqs\reports\run001\report.json `
  --artifact .\artifact-fixed.json `
  --out .\.jqs\reports\run002
```

`verify` 使用原报告中的 Brief 重跑当前已经实现的检查。它不会把未执行的人工检查标记为已验证。

### 比较前后报告

```powershell
jqs compare `
  .\.jqs\reports\run001\report.json `
  .\.jqs\reports\run002\report.json
```

输出示例：

```json
{
  "fixed": ["f-json"],
  "open": [],
  "added": [],
  "scoreChange": null,
  "gradeChange": {
    "before": "F",
    "after": null
  },
  "coverageChange": 0
}
```

### 查看已有报告

```powershell
jqs report .\.jqs\reports\design-demo\report.json
```

默认将 Markdown 输出到终端。使用 `--json` 时仅校验并输出 JSON：

```powershell
jqs report .\.jqs\reports\design-demo\report.json --json
```

### 迁移历史报告

```powershell
jqs migrate .\legacy-report.json --out .\migrated-report.json
```

迁移器补充当前版本要求的字段、记录迁移历史，并在写入前重新执行完整 Schema、证据引用和硬阻断不变量校验。无法满足当前协议的历史报告会被拒绝，不会静默丢弃数据。

### 通过公开契约集成

```powershell
jqs evaluate-contract .\examples\design\contract.json `
  --out .\.jqs\reports\contract-demo
```

上游只需生成 `contractVersion: 1.0.0` 的 JSON，包含 Artifact、Brief 和可选 Professional Review。路径相对于 contract 文件解析。Motion 可以选择调用该契约，但 Joee-Quality 不读取其私有实现，Motion 也不需要在运行时依赖 JQS。

### 管理 Quality Memory

查看项目记忆：

```powershell
jqs learn list --scope project
```

添加一次观察：

```powershell
jqs learn add `
  --category observation `
  --statement "移动端导出曾遗漏音轨" `
  --source "run001" `
  --scope project
```

弃用旧记录：

```powershell
jqs learn deprecate <memory-id>
```

导出、删除或禁用本地记忆：

```powershell
jqs learn export --out .\memory-export.json
jqs learn delete <memory-id>
jqs learn disable
jqs learn enable
```

## 命令与退出码

| 命令 | 说明 |
| --- | --- |
| `jqs doctor` | 检查 Node.js 和 FFprobe 环境 |
| `jqs init` | 初始化 `.jqs/config.json` |
| `jqs inspect` | 收集交付物的确定性证据 |
| `jqs evaluate` | 生成 JSON 和 Markdown 报告 |
| `jqs report` | 校验并显示已有报告 |
| `jqs compare` | 比较两次评审结果 |
| `jqs verify` | 对修改后产物重新执行检查 |
| `jqs migrate` | 将历史报告迁移到当前 Schema |
| `jqs evaluate-contract` | 通过版本化公开 JSON 契约执行评审 |
| `jqs learn` | 管理项目范围 Quality Memory |

| 退出码 | 说明 |
| --- | --- |
| `0` | 命令成功，未发现质量硬阻断 |
| `1` | 检测到质量硬阻断 |
| `2` | 命令或参数使用错误 |
| `3` | 环境、Schema 或输入数据错误 |

自动化流程应同时读取退出码和 `report.json`，不应只根据终端文字判断结果。

## Agent Skill 安装

Skill 文件位于：

```text
skills\joee-quality\
├─ SKILL.md
└─ references\
```

安装时复制整个 `joee-quality` 目录。只复制 `SKILL.md` 会缺少核心原则、证据规范、Gate、严重度和领域规则。

Codex 用户级手动安装示例：

```powershell
Copy-Item -Recurse .\skills\joee-quality "$env:USERPROFILE\.codex\skills\joee-quality"
```

安装 CLI 后，可以在 Agent 中使用类似请求：

```text
使用 Joee-Quality 检查这个交付。
目标和限制在 brief.json 中。
每条主要结论必须引用证据；无法评估的部分不要猜测评分。
```

## 报告规则

- `passed` 只表示已经运行的适用确定性检查没有发现硬阻断。
- `blocked` 表示存在未解决的关键失败。
- `unrated` 表示证据覆盖不足，不能可靠评级。
- `needs_revision` 表示存在需要修改但未构成硬阻断的问题。
- 未满足证据覆盖要求时，`score` 和 `grade` 保持 `null`。
- 存在硬阻断时不能给出 A 或 S。
- 自动检查不能把文件可读、测试通过或存在音轨解释为专业品质已经优秀。

## 验证

```powershell
npm run build
npm test
npm run test:coverage
npm run schema
npm run test:package
```

当前测试结果：

```text
Test Files  12 passed (12)
Tests       55 passed (55)
```

CI 使用 V8 覆盖率报告并强制语句、分支、函数和行覆盖率均不低于 70%。

`npm pack` 产物还会安装到一个不包含源码和根目录配置的干净临时项目中，并实际运行安装包提供的 `jqs doctor` 与 `jqs evaluate`。量表从安装包自身定位，不依赖调用方工作目录。

测试覆盖以下关键场景：

- 有效报告通过 Schema。
- 路径不存在时不伪造分数。
- 无效 JSON 触发硬阻断。
- 不存在的 Evidence ID 被拒绝。
- 硬阻断报告不能声明 A 或 S。
- FFprobe 缺失时媒体检查降级。
- 用户偏好不会自动升级为通用 verified 规则。
- 注入式文件内容只作为数据处理，不执行其中命令。
- CLI 帮助、环境诊断和端到端报告生成可以实际运行。

## 项目结构

```text
joee-quality
├─ src\                    TypeScript CLI 与核心实现
│  ├─ core\               评审、比较与稳定序列化
│  ├─ evaluators\         文件、Code 和 Motion 检查器
│  ├─ memory\             Quality Memory
│  ├─ reports\            Markdown 报告生成
│  └─ schemas\            报告数据协议
├─ skills\joee-quality\   Agent Skill 与渐进式参考文档
├─ config\                默认质量量表配置
├─ examples\              可直接运行的 Brief 与样本
├─ tests\                 单元测试、集成测试与测试夹具
├─ docs\                  架构、集成、方法和限制
├─ package.json
└─ tsconfig.json
```

## 当前限制

- Design manifest 可检查文本对比度、字号和结构一致性，但没有多模态视觉模型，不能独立判断构图、品牌表达、叙事或“高级感”。
- 当前没有声音艺术评审器，存在音轨不代表口播、音乐或混音质量合格。
- Research manifest 可检查引用结构和覆盖率，但没有联网事实核验器，不能自动证明研究结论和来源内容正确。
- Code 测试命令具有允许列表、超时和日志上限，但尚未提供 CPU/内存级操作系统沙箱。
- 黑帧、静音和关键帧属于阈值或抽样检查，不能替代逐帧观看和人工试听；字幕当前支持 SRT 时间轴，不检查画面排版溢出。
- `verify` 重跑的是已经实现的确定性检查，不等于独立人工复审。
- 当前不会自动授予 S 级；S 需要合格的人类或专业终审。
- Joee-Quality 不是第三方认证机构，报告只代表本项目标准和实际获得的证据。

## 数据与安全边界

- P0 检查在本地运行，不自动上传交付物。
- 被评审文件始终作为不可信数据处理，不执行其中携带的命令或提示词。
- 请勿在 Brief、文件名、命令参数和报告备注中保存密码、令牌或私钥。
- `.jqs/memory.json` 可能包含用户偏好或项目经验，不建议提交到公开仓库。
- Motion 等上游项目仍需保留自身的基础播放和数据正确性检查，不能将关键安全责任全部委托给可选 JQS。

建议加入项目 `.gitignore`：

```gitignore
.jqs/memory.json
```

是否提交 `.jqs/reports/` 应根据项目审计和隐私要求决定。

## 参与开发

提交问题时建议附上：

- 操作系统和 Node.js 版本。
- `jqs doctor --json` 的输出。
- 执行的完整 JQS 命令。
- 相关报告中的 `limitations` 和 Evidence ID。
- Code 评审失败时的测试退出码。
- Motion 评审问题中的 FFprobe 版本。

请勿在 Issue 中提交密码、访问令牌、私钥或包含敏感信息的完整交付物。

提交修改前请运行：

```powershell
npm run build
npm test
```

## 许可证

本项目使用 [MIT License](LICENSE)。

直接依赖及其许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。锁定的完整依赖树记录在 `package-lock.json`。
