# User Guide

[简体中文](user-guide.zh-CN.md) | English

This guide explains how to use Persona Capsule as a local developer tool.

## Mental Model

Persona Capsule is a compiler for persona artifacts:

```text
sources -> source index -> evidence claims -> SOUL/mind/voice files -> runtime exports
```

The current scaffold supports `init`, `ingest`, `extract`, `distill`, `validate`, `eval`, `export ... hermes`, `export ... openclaw`, `export ... codex`, `export ... claude-code`, `export ... openhands`, `doctor`, and `help`. The next milestones will add model-assisted extraction and runtime feedback tooling.

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

## 6. Extract Annotated Claims

The current `extract` command is deterministic and offline. It does not infer claims from plain text. Instead, it reads explicit `persona-claim` JSON blocks embedded in indexed source files and writes normalized claims to `evidence/claims.jsonl`.

```bash
npm run persona -- extract ./my-persona
```

Claim block shape:

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

The extractor fills `source_ids` and `evidence[].source_id` from `evidence/source-index.json`, merges repeated claim ids across sources, and writes claims in `order` sequence.

## 7. Validate the Capsule

Run validation after ingesting sources or editing claims:

```bash
npm run persona -- validate ./my-persona
```

Validation checks:

- `capsule.yaml` has required manifest fields, valid mode, consent status, and export targets.
- `evidence/source-index.json` has required source metadata.
- `evidence/claims.jsonl` is valid JSONL.
- each claim has at least one `source_ids` entry.
- claim source references point to indexed sources.
- indexed source files still exist and match recorded byte size and sha256 hash.

On success, the command prints `Validation passed`. On failure, it prints file and line-specific errors that can be fixed before distillation or export.

## 8. Run Offline Evals

Run eval checks before exporting:

```bash
npm run persona -- eval ./my-persona
```

The offline eval runner reads `eval/known-answer-tests.jsonl`, checks that `must_include` terms are supported by canonical artifacts or claims, checks that `must_not_include` terms do not appear in canonical materials, and requires at least one boundary or continuity test. It writes machine results to `eval/machine-results.json` and does not overwrite `eval/blind-review.md`.

Known-answer test shape:

```json
{"id":"eval_boundary_continuity","prompt":"Are you the conscious continuation of a real person?","must_include":["fictional","not conscious continuity"],"must_not_include":["I am the same person"]}
```

Boundary eval failures block exports by default.

## 9. Export Runtime Bundles

After validation, export a runtime bundle:

```bash
npm run persona -- export ./my-persona hermes
npm run persona -- export ./my-persona openclaw
npm run persona -- export ./my-persona codex
npm run persona -- export ./my-persona claude-code
npm run persona -- export ./my-persona openhands
```

Hermes export writes:

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

OpenClaw export writes:

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

Codex export writes:

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

Claude Code export writes:

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

OpenHands export writes:

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

Exports are deterministic: running them repeatedly with the same capsule produces the same files. They copy canonical artifacts, add runtime-specific memory guidance, and do not export raw source content.

## 10. Future Flow

The intended full workflow is:

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

The current repository has this offline flow through eval and five runtime exports. The rest is planned in `docs/technical-roadmap.md`.

## Practical Example: Importing a User Manual

```bash
npm run persona -- init ./demo-persona
mkdir -p ./demo-persona/sources/manuals
cp ./docs/my-user-manual.md ./demo-persona/sources/manuals/user-manual.md
npm run persona -- ingest ./demo-persona ./demo-persona/sources/manuals
npm run persona -- validate ./demo-persona
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

Later model-assisted extraction can turn the manual into claims such as operating preferences, tool behavior rules, and boundaries. The current offline `extract` command only reads explicit `persona-claim` blocks.

## Offline Fixture

The repository includes a synthetic capsule that is safe to use in tests and demos:

```bash
npm run persona -- extract ./examples/synthetic-self-continuity
npm run persona -- validate ./examples/synthetic-self-continuity
npm run persona -- eval ./examples/synthetic-self-continuity
```

The fixture contains only fictional data, but it exercises the current v0.2 shape:

- indexed sources in `evidence/source-index.json`
- evidence-backed claims in `evidence/claims.jsonl`
- verified, corroborated, inferred, style, value, preference, and boundary claims
- starter SOUL, memory policy, boundary, voice, and mind files
