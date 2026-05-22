# Persona Capsule

[English](README.md) | 简体中文

Persona Capsule 是一个开源工具包，用来把一个人的资料蒸馏成可移植、面向 Agent 运行时的人格胶囊。

它采用 CLI-first 设计，不绑定单一运行时，目标是把同一份人格核心导出到 Hermes、OpenClaw、OpenHands、Codex、Claude Code 等工具中。

## 当前状态

这个仓库目前处于架构和脚手架阶段，还不是完整的 v1 实现。

目前已经完成：

- CLI 脚手架：`init`、`ingest`、`extract`、`distill`、`validate`、`eval`、`export`、`doctor`、`help`。
- 可移植人格胶囊模板。
- 将资料索引到 `evidence/source-index.json`。
- 从 annotated source blocks 确定性离线抽取 claims。
- 从 claims 确定性生成 distill proposals。
- 离线 known-answer 和 boundary eval runner。
- 确定性 Hermes、OpenClaw、Codex、Claude Code、OpenHands runtime exports。
- 针对 adapter export shape 的 golden manifest tests。
- 初版 capsule、source-index、claim、known-answer eval schemas。
- 离线 synthetic fixture capsule。
- 架构、路线图、用户手册、定位文档。

后续计划：

- 模型辅助 claim 抽取。
- 模型辅助 distillation refinements。
- runtime feedback loop。
- 可选 Web Studio。

## 快速开始

```bash
npm run persona -- init ./my-persona
npm run persona -- ingest ./my-persona ./my-persona/sources
npm run persona -- validate ./my-persona
npm run doctor
npm test
```

`init` 命令会创建一份可移植的人格胶囊结构：

```text
my-persona/
  capsule.yaml
  SOUL.md
  USER.md
  MEMORY_POLICY.md
  BOUNDARIES.md
  voice/
  mind/
  evidence/
  eval/
  adapters/
```

## 核心思路

Persona Capsule 不是聊天机器人，也不是角色卡生成器。它是一个人格编译器：

```text
raw sources -> evidence index -> distilled persona capsule -> runtime adapters
```

项目负责 schema、蒸馏流程、证据链、边界和导出格式。它不试图替代各运行时自己的记忆系统。Hermes、OpenClaw、OpenHands、Codex、Claude Code 可以继续使用自己的 memory/session/workspace 机制；Persona Capsule 定义重要记忆和人格变化应该如何被治理。

## 项目结构

```text
packages/
  core/      共享 schema 常量和 capsule 模板
  cli/       开发者 CLI
docs/
  architecture.md
  architecture.zh-CN.md
  technical-roadmap.md
  technical-roadmap.zh-CN.md
  user-guide.md
  user-guide.zh-CN.md
  positioning.md
  positioning.zh-CN.md
schemas/
  capsule.schema.json
  claim.schema.json
  known-answer-test.schema.json
  source-index.schema.json
examples/
  synthetic-self-continuity/
```

未来会加入 runtime feedback tools、更完整的 eval runners，以及可选 Web Studio。

## 设计原则

- 保存连续性，而不是模仿表演。
- 先建模价值观和记忆，再建模表层语气。
- 让证据贴近 claims。
- 把不确定性作为一等状态。
- 导出到已有 Agent 运行时，而不是再造一个封闭运行时。
- 让授权、边界、撤回机制在 artifact 中可见。

## 运行时目标

- Hermes：profile-oriented 的 SOUL 和 memory runtime。
- OpenClaw：聊天网关、workspace memory、daily log runtime。
- OpenHands：带 skills 和项目指令的工程 Agent runtime。
- Codex：带 AGENTS.md、skills、memories 的 coding agent runtime。
- Claude Code：带 CLAUDE.md 和 memory files 的 coding agent runtime。

架构见 [docs/architecture.zh-CN.md](docs/architecture.zh-CN.md)，路线图见 [docs/technical-roadmap.zh-CN.md](docs/technical-roadmap.zh-CN.md)。

使用手册见 [docs/user-guide.zh-CN.md](docs/user-guide.zh-CN.md)。

与相邻人格 skill 项目的定位对比见 [docs/positioning.zh-CN.md](docs/positioning.zh-CN.md)。

## 开源协议

Persona Capsule 使用 [MIT License](LICENSE) 开源。
