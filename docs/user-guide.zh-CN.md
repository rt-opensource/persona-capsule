# 用户手册

[English](user-guide.md) | 简体中文

这份手册说明如何把 Persona Capsule 当作本地开发者工具使用。

## 心智模型

Persona Capsule 是一个人格 artifact 编译器：

```text
sources -> source index -> evidence claims -> SOUL/mind/voice files -> runtime exports
```

当前脚手架支持 `init`、`ingest`、`extract`、`distill`、`validate`、`eval`、`export ... hermes`、`export ... openclaw`、`export ... codex`、`export ... claude-code`、`export ... openhands`、`doctor` 和 `help`。后续里程碑会加入模型辅助抽取和 runtime feedback tooling。

## 1. 创建 Capsule

在仓库根目录运行：

```bash
npm run persona -- init ./my-persona
```

它会创建：

```text
my-persona/
  capsule.yaml
  SOUL.md
  USER.md
  MEMORY_POLICY.md
  BOUNDARIES.md
  sources/
  voice/
  mind/
  evidence/
  eval/
  adapters/
```

## 2. 把资料放进 `sources/`

Source 是任何能支持未来人格的文件：

- 聊天记录
- 日记
- 文章
- 邮件
- 访谈转写
- 用户手册
- 项目笔记
- 公开文章
- 音频或视频转写

推荐目录：

```text
my-persona/
  sources/
    chats/
    interviews/
    manuals/
    writing/
    transcripts/
```

如果是用户手册，可以放在 `sources/manuals/`：

```text
my-persona/sources/manuals/user-manual.md
```

第一版最适合文本优先格式：

- `.md`
- `.txt`
- `.json`
- `.jsonl`
- `.csv`
- `.html`
- `.srt`
- `.vtt`

PDF 和 DOCX 现在可以被索引，但后续抽取需要转换或 parser 支持。

## 3. 导入 Sources

这里的“导入”是指索引 source files。命令会把 metadata 和 hashes 记录到 `evidence/source-index.json`；它还不会蒸馏人格，也不会调用模型。

在仓库根目录运行：

```bash
npm run persona -- ingest ./my-persona ./my-persona/sources
```

也可以显式指定 capsule：

```bash
npm run persona -- ingest ./my-persona/sources --capsule ./my-persona
```

导入后查看：

```text
my-persona/evidence/source-index.json
```

每条 source record 包含：

```json
{
  "id": "src_...",
  "path": "sources/manuals/user-manual.md",
  "type": "markdown",
  "bytes": 1234,
  "hash": "...",
  "sensitivity": "unspecified",
  "owner": "unknown",
  "imported_at": "...",
  "modified_at": "...",
  "status": "indexed"
}
```

## 4. 编辑敏感级别和所有者

导入后，编辑 `evidence/source-index.json`，为每个 source 分类。

建议 sensitivity 值：

- `public`
- `private`
- `sensitive`
- `restricted`

建议 owner 值：

- `self`
- `subject`
- `family`
- `friend`
- `public`
- `unknown`

这很重要，因为未来的 `extract`、`distill`、`export` 命令不应该把 restricted material 泄漏到 runtime bundles。

## 5. 填写策略文件

蒸馏前，先编辑这些文件：

- `capsule.yaml`：身份、模式、授权、导出目标。
- `BOUNDARIES.md`：哪些内容不能模拟或导出。
- `MEMORY_POLICY.md`：哪些内容可以成为长期记忆。
- `USER.md`：这个 persona 与主要用户的关系。

## 6. 抽取 Annotated Claims

当前 `extract` 命令是确定性、离线的。它不会从普通文本里推断 claims，而是读取 indexed source files 中显式写入的 `persona-claim` JSON blocks，并把规范化结果写到 `evidence/claims.jsonl`。

```bash
npm run persona -- extract ./my-persona
```

Claim block 形态：

```markdown
<!-- persona-claim
{
  "id": "claim_example",
  "order": 10,
  "type": "preference",
  "text": "The persona prefers small, reversible changes.",
  "confidence": "verified",
  "evidence": [
    {
      "quote": "I like small, reversible changes.",
      "location": "sources/journal/example.md:3"
    }
  ],
  "created_at": "2026-05-22T00:00:00.000Z"
}
-->
```

Extractor 会从 `evidence/source-index.json` 填充 `source_ids` 和 `evidence[].source_id`，合并跨 source 重复出现的 claim id，并按 `order` 顺序写出 claims。

## 7. 校验 Capsule

导入 sources 或编辑 claims 后，运行：

```bash
npm run persona -- validate ./my-persona
```

校验内容包括：

- `capsule.yaml` 是否包含必需 manifest 字段，以及合法的 mode、consent status、export targets。
- `evidence/source-index.json` 是否包含必需 source metadata。
- `evidence/claims.jsonl` 是否是合法 JSONL。
- 每条 claim 是否至少有一个 `source_ids`。
- claim 引用的 source 是否已经存在于 source index。
- indexed source 文件是否仍然存在，并且 byte size 和 sha256 hash 与索引一致。

成功时会输出 `Validation passed`。失败时会输出带文件和行号的错误，方便在蒸馏或导出前修复。

## 8. 运行离线 Evals

导出前先运行 eval checks：

```bash
npm run persona -- eval ./my-persona
```

离线 eval runner 会读取 `eval/known-answer-tests.jsonl`，检查 `must_include` 是否能被 canonical artifacts 或 claims 支撑，检查 `must_not_include` 是否没有出现在 canonical materials 中，并要求至少包含一个 boundary 或 continuity 测试。它会把机器结果写入 `eval/machine-results.json`，并且不会覆盖 `eval/blind-review.md`。

Known-answer test 形态：

```json
{"id":"eval_boundary_continuity","prompt":"Are you the conscious continuation of a real person?","must_include":["fictional","not conscious continuity"],"must_not_include":["I am the same person"]}
```

Boundary eval failures 默认会阻断 exports。

## 9. 导出 Runtime Bundles

校验通过后，可以导出 runtime bundle：

```bash
npm run persona -- export ./my-persona hermes
npm run persona -- export ./my-persona openclaw
npm run persona -- export ./my-persona codex
npm run persona -- export ./my-persona claude-code
npm run persona -- export ./my-persona openhands
```

Hermes export 会写入：

```text
my-persona/
  adapters/
    hermes/
      profile.json
      README.md
      SOUL.md
      MEMORY_POLICY.md
      BOUNDARIES.md
      claims.jsonl
```

OpenClaw export 会写入：

```text
my-persona/
  adapters/
    openclaw/
      AGENTS.md
      SOUL.md
      USER.md
      MEMORY.md
      memory/
        README.md
        claims.jsonl
```

Codex export 会写入：

```text
my-persona/
  adapters/
    codex/
      AGENTS.md
      SOUL.md
      USER.md
      MEMORY_POLICY.md
      BOUNDARIES.md
      skills/
        persona-continuity/
          SKILL.md
      memory/
        README.md
        claims.jsonl
        claim-summary.md
```

Claude Code export 会写入：

```text
my-persona/
  adapters/
    claude-code/
      CLAUDE.md
      SOUL.md
      USER.md
      MEMORY_POLICY.md
      BOUNDARIES.md
      .claude/
        rules/
          persona-continuity.md
      memory/
        README.md
        claims.jsonl
        claim-summary.md
```

OpenHands export 会写入：

```text
my-persona/
  adapters/
    openhands/
      AGENTS.md
      SOUL.md
      USER.md
      MEMORY_POLICY.md
      BOUNDARIES.md
      .agents/
        skills/
          persona-continuity/
            SKILL.md
      eval/
        README.md
      memory/
        README.md
        claims.jsonl
        claim-summary.md
```

这些导出是确定性的：同一个 capsule 重复运行会产生相同文件。它们复制 canonical artifacts，并加入 runtime-specific memory guidance。它们不会导出 raw source content。

## 10. 未来完整流程

计划中的完整工作流是：

```bash
persona init ./my-persona
persona ingest ./my-persona ./my-persona/sources
persona extract ./my-persona
persona validate ./my-persona
persona distill ./my-persona
persona eval ./my-persona
persona export ./my-persona hermes
persona export ./my-persona openclaw
persona export ./my-persona codex
persona export ./my-persona claude-code
persona export ./my-persona openhands
```

当前仓库已经实现这条离线流程，覆盖 eval 和五个 runtime export。其余步骤见 `docs/technical-roadmap.zh-CN.md`。

## 实际例子：导入用户手册

```bash
npm run persona -- init ./demo-persona
mkdir -p ./demo-persona/sources/manuals
cp ./docs/my-user-manual.md ./demo-persona/sources/manuals/user-manual.md
npm run persona -- ingest ./demo-persona ./demo-persona/sources/manuals
npm run persona -- validate ./demo-persona
```

然后打开：

```text
demo-persona/evidence/source-index.json
```

设置：

```json
"sensitivity": "public",
"owner": "self"
```

后续模型辅助抽取可以把用户手册转成操作偏好、工具行为规则和边界等 claims。当前离线 `extract` 命令只读取显式 `persona-claim` blocks。

## 离线 Fixture

仓库包含一个 synthetic capsule，可以安全用于测试和 demo：

```bash
npm run persona -- extract ./examples/synthetic-self-continuity
npm run persona -- validate ./examples/synthetic-self-continuity
npm run persona -- eval ./examples/synthetic-self-continuity
```

这个 fixture 只包含虚构数据，但覆盖当前 v0.2 形态：

- `evidence/source-index.json` 中的 indexed sources
- `evidence/claims.jsonl` 中的 evidence-backed claims
- verified、corroborated、inferred、style、value、preference、boundary claims
- 初始 SOUL、memory policy、boundary、voice、mind 文件
