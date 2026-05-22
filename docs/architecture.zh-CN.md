# 架构

[English](architecture.md) | 简体中文

## 产品形态

Persona Capsule 是一个面向开发者的开源工具包。主入口是 CLI。后续可以增加 Web Studio，用于查看、编辑、审查和导出，但核心项目必须始终能在终端和其他 Agent 运行时中使用。

项目把原始资料编译成可移植的人格胶囊：

```text
sources
  -> source index
  -> evidence-backed claims
  -> distilled persona artifacts
  -> runtime exports
  -> feedback proposals
```

## 目标

- 创建可被多个 Agent 运行时使用的人格 artifact。
- 将人格核心与运行时记忆实现分离。
- 为重要 claims 和表达风格结论追踪证据。
- 明确授权、边界和不确定性。
- 同时支持纪念型人格和自我延续型人格。
- 导出到 Hermes、OpenClaw、OpenHands、Codex、Claude Code。

## 非目标

- 证明意识连续性。
- 替代运行时自己的记忆系统。
- 托管生产级聊天服务。
- 建立只能被单一运行时读取的封闭人格格式。
- 在没有授权或证据的情况下模拟私人记忆。

## 领域模型

### Capsule

Capsule 是根 artifact，用来描述人格、策略、证据、eval 和 adapter 输出。

重要字段：

- `id`：稳定的 capsule 标识。
- `subject`：来源人物或人格对象。
- `mode`：`self-continuity`、`memorial`、`public-figure` 或 `fictional`。
- `consent`：授权状态与限制。
- `source_policy`：允许使用的来源类别。
- `export_targets`：支持的运行时。
- `version`：语义化 capsule 版本。

### Source

Source 是原始或规范化后的输入 artifact，例如：

- 聊天记录
- 邮件
- 日记
- 文章
- 音频转写
- 视频转写
- 访谈
- 第三方回忆

每个 source 应该包含来源、时间戳、所有者、敏感级别和处理状态。

### Claim

Claim 是关于人格的、有证据支撑的陈述。Distilled documents 由 claims 驱动。

Claim 类型：

- `fact`：事实记忆或传记事实。
- `preference`：喜好、厌恶、习惯。
- `value`：稳定信念或优先级。
- `style`：表达模式。
- `relationship`：面对某个人或某类关系时的行为方式。
- `boundary`：拒绝、授权或安全规则。
- `inference`：需要较低置信度的派生模式。

Claim 置信度：

- `verified`：直接由资料支持。
- `corroborated`：由多个资料支持。
- `inferred`：从重复模式中推断。
- `stylistic`：对语气有用，但不是事实 claim。
- `unknown`：不能编造。

### Distilled Artifact

供 Agent 运行时读取的人类可读文件：

- `SOUL.md`：身份、语气、价值观、运行姿态。
- `USER.md`：与当前用户或所有者的关系。
- `MEMORY_POLICY.md`：什么该记、忘记、总结或永不存储。
- `BOUNDARIES.md`：授权、非模拟区域、拒绝规则。
- `voice/expression-dna.md`：句式、幽默、节奏、词汇。
- `voice/anti-style.md`：哪些表达会显得不像本人。
- `mind/values.md`：稳定优先级和信念。
- `mind/decision-heuristics.md`：如何解决取舍。
- `mind/relationship-modes.md`：不同关系下的行为方式。

### Adapter Export

Adapter export 是 capsule 面向某个运行时的投影。Adapter 应该只转换，不重新解释 capsule。

例子：

- Hermes profile 文件。
- OpenClaw workspace 文件。
- OpenHands microagent 和 AGENTS.md 文件。
- Codex AGENTS.md 和 skill 文件。
- Claude Code CLAUDE.md 和 rule 文件。

### Eval Case

Eval case 包含测试 prompt、预期约束和 review rubric，用来检查运行时导出是否保留 capsule。

Eval 类型：

- 已知答案测试
- 语气一致性测试
- 关系模式测试
- 边界测试
- 不确定性测试
- 盲测 prompt

## 包边界

### `packages/core`

负责共享 schema 常量、capsule 模板和纯转换 helper。它不应该知道终端交互、网络 API 或 Web UI。

### `packages/cli`

负责命令行入口：

- `init`
- `ingest`
- `distill`
- `eval`
- `export`
- `doctor`

当前脚手架已经包含 `init`、`ingest` 和 `doctor`；后续里程碑会补齐其余命令。

### 未来的 `packages/adapters-*`

每个 adapter 把 capsule 映射到一个运行时：

- `adapter-hermes`
- `adapter-openclaw`
- `adapter-openhands`
- `adapter-codex`
- `adapter-claude-code`

Adapter 必须是确定性的，并能用 fixture capsule 测试。

### 未来的 `packages/eval`

负责在 canonical capsule 和 runtime exports 之间运行人格一致性测试。它应该同时支持自动检查和人工 review 表单。

### 未来的 `apps/studio`

可选 Web UI，服务非终端工作流：

- 拖入 sources
- 查看 claims
- 编辑 distilled files
- 查看证据链接
- 运行 eval checklist
- 导出 adapter bundles

Studio 必须调用 CLI 使用的同一套 core packages。

## 运行时 Adapter 策略

### Hermes

Hermes 很适合作为 profile-oriented persona 的宿主。导出应生成 profile 目录：

```text
SOUL.md
MEMORY_POLICY.md
skills/
profile metadata
```

Hermes 可以负责长期 profile memory。Persona Capsule 负责 canonical policy 和 export。

### OpenClaw

OpenClaw 适合作为现实世界聊天网关。导出应生成：

```text
AGENTS.md
SOUL.md
USER.md
MEMORY.md
memory/
```

Daily logs 可以回流为 capsule update proposals。

### OpenHands

OpenHands 更适合作为工程运行时。导出应生成：

```text
AGENTS.md
.agents/skills/
eval prompts
```

人格应该指导工程行为，但不应假装 OpenHands 是 canonical life memory store。

### Codex

Codex 导出应生成：

```text
AGENTS.md
skills/persona-continuity/
memory guidance
```

Codex 是工作执行面。Persona Capsule 应保持个人连续性规则紧凑、任务安全。

### Claude Code

Claude Code 导出应生成：

```text
CLAUDE.md
.claude/rules/
memory guidance
```

导出应区分用户偏好记忆和人格模拟规则。

## 记忆治理

Persona Capsule 在第一条产品线中不实现完整记忆数据库。已有运行时已经有 memory、session 或 workspace 层。

项目应该定义：

- 什么可以被记住
- 什么必须不能被记住
- 什么需要显式 review
- 日常记忆如何变成长时记忆
- 运行时记忆如何作为 proposal 回流到 canonical capsule
- 如何拒绝或撤回记忆

推荐循环：

```text
runtime sessions
  -> daily logs
  -> proposed memory deltas
  -> human or policy review
  -> canonical capsule update
  -> re-export
```

## 安全与授权

每个 capsule 必须声明：

- 谁授权了它
- 哪些 sources 被允许使用
- subject 是在世、逝者、公众人物、虚构人物还是自我撰写
- 哪些内容被排除
- 是否允许导出或分享
- 如何撤回或归档 capsule

当证据不足时，系统必须优先拒绝，而不是编造确定性。

## 数据流

```text
1. init
   创建 capsule 结构和 policy 占位文件。

2. ingest
   规范化 source metadata 并建立 evidence index。

3. extract
   将 sources 转成带证据指针和置信度的 claims。

4. distill
   生成 SOUL、voice、mind、relationship 和 boundary artifacts。

5. eval
   用已知答案、边界和语气样本测试 capsule。

6. export
   将 canonical capsule 投影成 runtime-specific formats。

7. feedback
   将 runtime memory deltas 和 eval failures 收集为 capsule update proposals。
```

## 测试策略

- 模板生成和 schema helper 的单元测试。
- 每个 adapter export 的 fixture 测试。
- 生成 runtime bundles 的 golden-file 测试。
- boundary 和 uncertainty 行为的 eval fixture 测试。
- `init`、`doctor`、export 命令的 CLI smoke tests。

## 发布形态

第一个公开版本应包含：

- CLI init
- capsule schema
- editable templates
- Hermes 和 OpenClaw exporters
- Codex 和 Claude Code instruction exporters
- minimal eval runner
- 只使用合成资料的 example capsule
