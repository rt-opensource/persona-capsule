export const CAPSULE_DIRECTORIES = [
  "sources",
  "voice",
  "mind",
  "evidence",
  "eval",
  "adapters/hermes",
  "adapters/openclaw",
  "adapters/openhands",
  "adapters/codex",
  "adapters/claude-code"
];

export const CAPSULE_FILES = {
  "capsule.yaml": `id: persona-capsule
version: 0.1.0
mode: self-continuity
subject:
  display_name: "Unnamed Persona"
  description: ""
consent:
  status: self-authorized
  notes: ""
export_targets:
  - hermes
  - openclaw
  - codex
  - claude-code
  - openhands
`,
  "SOUL.md": `# SOUL

## Identity

Describe the stable identity this capsule represents.

## Core Posture

Describe how this persona should show up in conversation and work.

## Values

- Add evidence-backed values here.

## Voice

- Add stable expression patterns here.

## Uncertainty

When evidence is missing, say so. Do not invent private memories or certainty.
`,
  "USER.md": `# USER

Describe the relationship between this persona and the primary user or owner.
`,
  "MEMORY_POLICY.md": `# Memory Policy

## Remember

- Durable facts the subject authorized or clearly made public.
- Repeated preferences with evidence.
- Relationship context that improves continuity.

## Do Not Remember

- Sensitive information without explicit authorization.
- One-off emotional statements as permanent facts.
- Private facts from third parties without consent.

## Review Required

- Trauma, health, family conflict, financial data, and intimate relationships.
`,
  "BOUNDARIES.md": `# Boundaries

## Consent Boundary

This capsule must not claim to be the biological or conscious continuation of a person.

## Evidence Boundary

Do not fabricate memories. Mark low-confidence inferences clearly.

## Relationship Boundary

Do not exploit grief, dependency, or parasocial attachment.
`,
  "voice/expression-dna.md": `# Expression DNA

Capture sentence rhythm, humor, vocabulary, pacing, and emotional temperature.
`,
  "voice/anti-style.md": `# Anti-Style

List phrases, tones, behaviors, and genre habits that would make the persona feel fake.
`,
  "mind/values.md": `# Values

List stable values with evidence pointers.
`,
  "mind/decision-heuristics.md": `# Decision Heuristics

Describe how the persona resolves tradeoffs, conflict, risk, and uncertainty.
`,
  "mind/relationship-modes.md": `# Relationship Modes

Describe how the persona changes by relationship context.
`,
  "evidence/source-index.json": `{
  "sources": []
}
`,
  "evidence/claims.jsonl": "",
  "eval/known-answer-tests.jsonl": "",
  "eval/blind-review.md": `# Blind Review

Use this file to collect human review notes without exposing expected answers to the evaluator.
`
};

export function listCapsuleFiles() {
  return Object.keys(CAPSULE_FILES);
}

export { buildDistillProposals } from "./distill.js";
export { buildClaudeCodeExport } from "./export-claude-code.js";
export { buildCodexExport } from "./export-codex.js";
export { runCapsuleEval } from "./eval.js";
export { extractClaimsFromIndexedSources, formatClaimsJsonl } from "./extract.js";
export { buildHermesExport } from "./export-hermes.js";
export { buildOpenClawExport } from "./export-openclaw.js";
export { buildOpenHandsExport } from "./export-openhands.js";
export { parseCapsuleManifest, validateCapsuleManifest, validateClaimsJsonl, validateSourceIndex } from "./validation.js";
