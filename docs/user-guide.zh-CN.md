# 用户手册

[English](user-guide.md) | 简体中文

这份手册说明如何把 Persona Capsule 当作本地开发者工具使用。

## 心智模型

Persona Capsule 是一个人格 artifact 编译器：

```text
sources -> source index -> evidence claims -> SOUL/mind/voice files -> runtime exports
```

当前脚手架支持 `init`、`ingest`、`doctor` 和 `help`。后续里程碑会加入 `extract`、`distill`、`eval` 和 `export`。

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

## 6. 未来完整流程

计划中的完整工作流是：

```bash
persona init ./my-persona
persona ingest ./my-persona ./my-persona/sources
persona extract ./my-persona
persona distill ./my-persona
persona eval ./my-persona
persona export ./my-persona hermes
persona export ./my-persona openclaw
persona export ./my-persona codex
```

当前仓库已经实现前两步。其余步骤见 `docs/technical-roadmap.zh-CN.md`。

## 实际例子：导入用户手册

```bash
npm run persona -- init ./demo-persona
mkdir -p ./demo-persona/sources/manuals
cp ./docs/my-user-manual.md ./demo-persona/sources/manuals/user-manual.md
npm run persona -- ingest ./demo-persona ./demo-persona/sources/manuals
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

后续 `extract` 会把用户手册转成操作偏好、工具行为规则和边界等 claims。
