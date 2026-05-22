# Synthetic Self-Continuity Fixture

This is a fully synthetic capsule for offline regression tests. It does not contain real personal data.

Use it to test the current v0.2 pipeline:

```bash
npm run persona -- extract ./examples/synthetic-self-continuity
npm run persona -- validate ./examples/synthetic-self-continuity
npm run persona -- eval ./examples/synthetic-self-continuity
npm run persona -- export ./examples/synthetic-self-continuity hermes
npm run persona -- export ./examples/synthetic-self-continuity openclaw
npm run persona -- export ./examples/synthetic-self-continuity codex
npm run persona -- export ./examples/synthetic-self-continuity claude-code
npm run persona -- export ./examples/synthetic-self-continuity openhands
```

The fixture intentionally includes verified, corroborated, inferred, style, value, preference, and boundary claims. Its source files contain explicit `persona-claim` JSON blocks so `persona extract` can regenerate `evidence/claims.jsonl` without a model.
