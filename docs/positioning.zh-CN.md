# 定位

[English](positioning.md) | 简体中文

Persona Capsule 位于 persona skills 之下、运行时专用 agent configuration 之上。

它不是成品 persona skills 的画廊，也不只是同事生成器。它是一个可移植的人格编译器：

```text
sources -> evidence claims -> canonical capsule -> runtime exports
```

## 与 `awesome-ai-persona-skills` 的区别

`awesome-ai-persona-skills` 是一个 persona skills 的精选目录，覆盖自我蒸馏、职场、公众人物、亲密关系、虚构角色、玄学/人格系统等类别。

Persona Capsule 的角色不同：

- `awesome-ai-persona-skills` 帮用户发现已有 skills。
- Persona Capsule 帮构建者创建、治理、评估和导出新的 persona capsules。
- `awesome-ai-persona-skills` 是生态导航。
- Persona Capsule 是基础设施和格式。

两者是互补关系。Persona Capsule 的导出结果可以成为 awesome-style gallery 的条目，而 gallery 也可以成为 capsules 或 adapters 的分发渠道。

## 与 `colleague-skill` 的区别

`colleague-skill` 是一个具体的 AgentSkills 项目，用职场数据和主观描述生成 AI colleagues。它关注职场交接、工作风格、同事人格、skill evolution，以及 Claude Code/OpenClaw 风格的使用方式。

Persona Capsule 在范围和架构上不同：

- `colleague-skill` 优化的是一个高价值领域：同事和职场协作。
- Persona Capsule 支持多种 persona modes：self-continuity、memorial、public figure、fictional、colleague、mentor、operator personas。
- `colleague-skill` 直接生成可执行 skills。
- Persona Capsule 先创建 canonical capsule，再导出到 runtime-specific formats。
- `colleague-skill` 有很强的 source collectors 和 generation prompts。
- Persona Capsule 应把 evidence governance、consent policy、uncertainty boundaries、evals、runtime feedback review 作为一等 artifact。

两者也是互补关系。`colleague-skill` 可以被视为专门的 upstream extractor 或 domain adapter。Persona Capsule 可以借鉴它的 Work Skill + Persona 双层模型。

## 战略优势

Persona Capsule 的优势应该是可移植性和治理能力。

大多数 persona 项目停在：

```text
sources -> one skill
```

Persona Capsule 应该支持：

```text
sources
  -> canonical capsule
  -> Hermes profile
  -> OpenClaw workspace
  -> Codex AGENTS.md + skills
  -> Claude Code CLAUDE.md + rules
  -> OpenHands microagents
```

这带来四个长期优势：

1. **Canonical source of truth**：一个 capsule 避免 runtime-specific persona files 互相漂移。
2. **Evidence-backed distillation**：claims 可以指向 sources 和 confidence。
3. **Runtime portability**：同一个 persona 可以运行在聊天、coding 和 automation 环境中。
4. **Governed evolution**：runtime memories 变成 proposed deltas，而不是静默改变 persona。

## 应该借鉴什么

从 `awesome-ai-persona-skills` 借鉴：

- category taxonomy
- community gallery model
- AgentSkills compatibility
- discoverability language

从 `colleague-skill` 借鉴：

- source collection pragmatism
- work/persona split
- incremental correction layer
- version rollback idea
- generated skill command ergonomics

## 应该避免什么

- 只变成链接列表。
- 只变成同事生成器。
- 把风格模仿当成人格连续性。
- 允许 runtime memories 静默覆盖 canonical persona files。
- 默认把 private source material 导出到 runtime bundles。

## 推荐开源叙事

Persona Capsule 是 persona skills 缺少的编译层：

> Existing persona skill projects prove that people want agent personas. Persona Capsule makes those personas portable, evidence-backed, governable, and exportable across runtimes.

