# Persona Capsule

English | [简体中文](README.zh-CN.md)

Persona Capsule is an open-source toolkit for distilling a person's sources into a portable, agent-native persona capsule.

It is CLI-first, runtime-agnostic, and designed to export the same persona core into tools such as Hermes, OpenClaw, OpenHands, Codex, and Claude Code.

## Status

This repository is in the architecture and scaffold phase. It is not a complete v1 implementation yet.

Implemented now:

- CLI scaffold with `init`, `ingest`, `doctor`, and `help`.
- Portable capsule template.
- Source indexing into `evidence/source-index.json`.
- Initial capsule manifest schema.
- Architecture, roadmap, usage, and positioning documents.

Planned next:

- Claim extraction.
- Persona distillation.
- Runtime exporters.
- Eval runner.
- Optional web studio.

## Quick Start

```bash
npm run persona -- init ./my-persona
npm run persona -- ingest ./my-persona ./my-persona/sources
npm run doctor
npm test
```

The `init` command creates a portable capsule structure:

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

## Core Idea

Persona Capsule is not a chatbot and not a character-card generator. It is a persona compiler:

```text
raw sources -> evidence index -> distilled persona capsule -> runtime adapters
```

The project owns the schema, distillation workflow, evidence trail, boundaries, and export formats. It does not try to replace runtime memory systems. Hermes, OpenClaw, OpenHands, Codex, and Claude Code can keep their own memory layers; Persona Capsule defines how important memories and persona changes should be governed.

## Project Layout

```text
packages/
  core/      shared schema constants and capsule templates
  cli/       developer CLI
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
```

Future packages will add adapter-specific exporters, eval runners, and an optional web studio.

## Design Principles

- Preserve continuity, not imitation.
- Model values and memory before surface style.
- Keep evidence close to claims.
- Treat uncertainty as a first-class state.
- Export to existing agent runtimes instead of building another closed runtime.
- Make consent, boundaries, and revocation visible in the artifact.

## Runtime Targets

- Hermes: profile-oriented SOUL and memory runtime.
- OpenClaw: chat gateway, workspace memory, and daily log runtime.
- OpenHands: engineering agent runtime with skills and project instructions.
- Codex: coding agent runtime with AGENTS.md, skills, and memories.
- Claude Code: coding agent runtime with CLAUDE.md and memory files.

See [docs/architecture.md](docs/architecture.md) and [docs/technical-roadmap.md](docs/technical-roadmap.md).

For step-by-step usage, see [docs/user-guide.md](docs/user-guide.md).

For project positioning against adjacent persona-skill projects, see [docs/positioning.md](docs/positioning.md).

## License

Persona Capsule is released under the [MIT License](LICENSE).
