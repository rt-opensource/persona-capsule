# 技术路线图

[English](technical-roadmap.md) | 简体中文

## 路线 A：CLI-First 工具包

这是主路线。它能让项目在没有任何 Web 产品之前，就先成为有用的开源开发者工具。

### Phase 0：仓库脚手架

交付物：

- workspace package 结构
- 最小 CLI
- capsule templates
- 架构文档
- smoke tests

验收标准：

- `npm run persona -- init ./example` 可以创建 capsule
- `npm run doctor` 可以检查本地运行时
- `npm test` 通过

### Phase 1：Capsule Schema 和 Source Index

交付物：

- 稳定的 `capsule.yaml` 字段
- 用于机器校验的 JSON Schema
- `source-index.json` 格式
- `persona ingest <capsule> <sources...>` 命令
- source metadata 规范化

验收标准：

- 可以在不发送内容给模型的情况下索引 sources
- 每个 source 都有 id、path、type、sensitivity、owner、timestamps
- schema 错误可读、可操作

### Phase 2：Evidence 和 Claim 抽取

交付物：

- `claims.jsonl` schema
- claim confidence model
- 抽取 prompts 和确定性的 review rules
- 可选 OpenAI-compatible 模型 provider 集成

验收标准：

- 生成的 claims 始终指向 sources
- 不充分支持的 claims 标为 inferred 或 unknown
- 默认不导出 sensitive sources

### Phase 3：人格蒸馏

交付物：

- `persona distill`
- `SOUL.md`、`USER.md`、`MEMORY_POLICY.md`、`BOUNDARIES.md` 生成器
- voice 和 mind artifact 生成
- 保留人工编辑的再生成策略

验收标准：

- 蒸馏结果区分 fact、inference 和 style
- 再生成文件时保留用户编辑，或产生 conflict proposals
- 缺少证据时使用不确定性表达，而不是编造

### Phase 4：运行时 Adapters

交付物：

- `persona export hermes`
- `persona export openclaw`
- `persona export codex`
- `persona export claude-code`
- `persona export openhands`
- golden-file adapter tests

验收标准：

- 每个 export 都是确定性的
- exports 不泄漏被排除的 source content
- adapters 包含 runtime-specific memory guidance

### Phase 5：Eval Runner

交付物：

- `persona eval`
- 已知答案测试 runner
- boundary test runner
- blind-review templates
- persona drift checklist

验收标准：

- eval failures 给出可检查的具体文件和位置
- boundary failures 默认阻断 release exports
- 人工 review 可以被记录，且不覆盖机器结果

### Phase 6：Runtime Feedback Loop

交付物：

- memory delta 格式
- 导入 runtime daily logs
- proposed memory changes 的 review workflow
- capsule version bump rules

验收标准：

- runtime memories 不会被静默合并
- rejected memories 可审计
- re-export 生成更新后的 runtime bundles

## 路线 B：可选 Web Studio

这条路线应在 CLI schemas 和 adapters 稳定后开始。

### Studio MVP

能力：

- 创建或打开 capsule
- 上传或指向本地 sources
- 查看 source index
- 编辑 distilled artifacts
- 查看 claim evidence
- 运行 eval checklists
- 导出 runtime bundles

建议技术栈：

- Vite 或 Next.js 作为 app shell
- 使用与 CLI 相同的 `packages/core` 和 adapter packages
- 开发阶段采用 local-first file access
- 第一版不要求 hosted service

Studio 不能成为 canonical implementation。它只是 CLI 和 core packages 之上的可视化表层。

## 技术方向

### 当前脚手架

初始脚手架使用 Node.js ESM 和内置模块，不引入外部依赖。这样 clone 后可以立刻运行。

### 近期新增

只有在形态被验证后才添加依赖：

- TypeScript，用于 package APIs。
- schema validator，用于 capsule 和 claim files。
- YAML parser，用于 `capsule.yaml`。
- 如果 Node 内置 test runner 不够，再引入测试框架。
- 在离线 ingest 和 export formats 稳定后，再加模型 provider adapters。

### 长期结构

稳定 workspace 可能长这样：

```text
packages/
  core/
  schema/
  cli/
  eval/
  adapter-hermes/
  adapter-openclaw/
  adapter-openhands/
  adapter-codex/
  adapter-claude-code/
apps/
  studio/
examples/
  synthetic-self-continuity/
  synthetic-memorial/
```

## 开源里程碑

### v0.1

- init
- schema
- docs
- templates
- smoke tests

### v0.2

- source index
- claims format
- offline fixture pipeline

### v0.3

- Hermes 和 OpenClaw exporters
- synthetic example capsule

### v0.4

- Codex、Claude Code、OpenHands exporters
- adapter golden tests

### v0.5

- eval runner
- boundary tests
- blind-review forms

### v1.0

- stable capsule format
- stable adapter contracts
- feedback proposal workflow
- documented consent and governance model
