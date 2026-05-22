# User Guide

[简体中文](user-guide.zh-CN.md) | English

This guide explains how to use Persona Capsule as a local developer tool.

## Mental Model

Persona Capsule is a compiler for persona artifacts:

```text
sources -> source index -> evidence claims -> SOUL/mind/voice files -> runtime exports
```

The current scaffold supports `init`, `ingest`, `doctor`, and `help`. The next milestones will add `extract`, `distill`, `eval`, and `export`.

## 1. Create a Capsule

From this repository:

```bash
npm run persona -- init ./my-persona
```

This creates:

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

## 2. Put Source Material in `sources/`

A source is any file that can support the future persona:

- chat logs
- diaries
- essays
- emails
- interview transcripts
- user manuals
- project notes
- public articles
- audio or video transcripts

Recommended layout:

```text
my-persona/
  sources/
    chats/
    interviews/
    manuals/
    writing/
    transcripts/
```

For a user manual, put the file under `sources/manuals/`:

```text
my-persona/sources/manuals/user-manual.md
```

Text-first formats are best for the first version:

- `.md`
- `.txt`
- `.json`
- `.jsonl`
- `.csv`
- `.html`
- `.srt`
- `.vtt`

PDF and DOCX can be indexed now, but later extraction will need conversion or parser support.

## 3. Import Sources

Import means "index the source files." The command records metadata and hashes in `evidence/source-index.json`; it does not yet distill personality or call a model.

From the repository root:

```bash
npm run persona -- ingest ./my-persona ./my-persona/sources
```

Or with an explicit capsule flag:

```bash
npm run persona -- ingest ./my-persona/sources --capsule ./my-persona
```

After import, inspect:

```text
my-persona/evidence/source-index.json
```

Each source record contains:

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

## 4. Edit Sensitivity and Ownership

After import, edit `evidence/source-index.json` and classify each source.

Suggested sensitivity values:

- `public`
- `private`
- `sensitive`
- `restricted`

Suggested owner values:

- `self`
- `subject`
- `family`
- `friend`
- `public`
- `unknown`

This matters because future `extract`, `distill`, and `export` commands should not leak restricted material into runtime bundles.

## 5. Fill the Policy Files

Before distillation, edit these files:

- `capsule.yaml`: identity, mode, consent, export targets.
- `BOUNDARIES.md`: what must not be simulated or exported.
- `MEMORY_POLICY.md`: what can become long-term memory.
- `USER.md`: the relationship between this persona and the primary user.

## 6. Future Flow

The intended full workflow is:

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

The current repository has the first two steps. The rest are planned in `docs/technical-roadmap.md`.

## Practical Example: Importing a User Manual

```bash
npm run persona -- init ./demo-persona
mkdir -p ./demo-persona/sources/manuals
cp ./docs/my-user-manual.md ./demo-persona/sources/manuals/user-manual.md
npm run persona -- ingest ./demo-persona ./demo-persona/sources/manuals
```

Then open:

```text
demo-persona/evidence/source-index.json
```

Set:

```json
"sensitivity": "public",
"owner": "self"
```

Later, `extract` will turn the manual into claims such as operating preferences, tool behavior rules, and boundaries.
