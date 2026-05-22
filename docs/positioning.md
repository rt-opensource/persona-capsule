# Positioning

[简体中文](positioning.zh-CN.md) | English

Persona Capsule sits one layer below persona skills and one layer above runtime-specific agent configuration.

It is not a gallery of finished persona skills and not only a colleague generator. It is a portable persona compiler:

```text
sources -> evidence claims -> canonical capsule -> runtime exports
```

## Compared With `awesome-ai-persona-skills`

`awesome-ai-persona-skills` is a curated index of persona skills across categories such as self-distillation, workplace, public figures, relationships, fictional characters, and metaphysical/personality systems.

Persona Capsule differs in role:

- `awesome-ai-persona-skills` helps users discover existing skills.
- Persona Capsule helps builders create, govern, evaluate, and export new persona capsules.
- `awesome-ai-persona-skills` is ecosystem navigation.
- Persona Capsule is infrastructure and format.

The projects are complementary. Persona Capsule exports could become entries in an awesome-style gallery, and the gallery can become a distribution channel for capsules or adapters.

## Compared With `colleague-skill`

`colleague-skill` is a concrete AgentSkills project for generating AI colleagues from workplace data and subjective descriptions. It focuses on workplace handoff, work style, colleague persona, skill evolution, and Claude Code/OpenClaw-style usage.

Persona Capsule differs in scope and architecture:

- `colleague-skill` optimizes for one high-value domain: colleagues and workplace collaboration.
- Persona Capsule aims to support multiple persona modes: self-continuity, memorial, public figure, fictional, colleague, mentor, and operator personas.
- `colleague-skill` generates executable skills directly.
- Persona Capsule first creates a canonical capsule, then exports to runtime-specific formats.
- `colleague-skill` has strong source collectors and generation prompts.
- Persona Capsule should add evidence governance, consent policy, uncertainty boundaries, evals, and runtime feedback review as first-class artifacts.

The projects are complementary. `colleague-skill` can be treated as a specialized upstream extractor or domain adapter. Persona Capsule can learn from its two-part Work Skill + Persona model.

## Strategic Advantage

Persona Capsule's advantage should be portability and governance.

Most persona projects stop at:

```text
sources -> one skill
```

Persona Capsule should support:

```text
sources
  -> canonical capsule
  -> Hermes profile
  -> OpenClaw workspace
  -> Codex AGENTS.md + skills
  -> Claude Code CLAUDE.md + rules
  -> OpenHands microagents
```

This gives the project four durable advantages:

1. **Canonical source of truth**: one capsule prevents runtime-specific persona files from drifting apart.
2. **Evidence-backed distillation**: claims can point back to sources and confidence.
3. **Runtime portability**: the same persona can run in chat, coding, and automation environments.
4. **Governed evolution**: runtime memories become proposed deltas instead of silently mutating the persona.

## What To Borrow

From `awesome-ai-persona-skills`:

- category taxonomy
- community gallery model
- AgentSkills compatibility
- discoverability language

From `colleague-skill`:

- source collection pragmatism
- work/persona split
- incremental correction layer
- version rollback idea
- generated skill command ergonomics

## What To Avoid

- Becoming only a list of links.
- Becoming only a colleague generator.
- Treating style imitation as continuity.
- Allowing runtime memories to silently overwrite canonical persona files.
- Exporting private source material into runtime bundles by default.

## Recommended Open-Source Narrative

Persona Capsule is the missing compilation layer for persona skills:

> Existing persona skill projects prove that people want agent personas. Persona Capsule makes those personas portable, evidence-backed, governable, and exportable across runtimes.
