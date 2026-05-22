import test from "node:test";
import assert from "node:assert/strict";
import { CAPSULE_DIRECTORIES, CAPSULE_FILES, listCapsuleFiles } from "../src/index.js";

test("capsule template includes required root files", () => {
  for (const file of ["capsule.yaml", "SOUL.md", "USER.md", "MEMORY_POLICY.md", "BOUNDARIES.md"]) {
    assert.ok(file in CAPSULE_FILES, `${file} should exist in the template`);
  }
});

test("capsule template includes adapter directories", () => {
  for (const runtime of ["hermes", "openclaw", "openhands", "codex", "claude-code"]) {
    assert.ok(CAPSULE_DIRECTORIES.includes(`adapters/${runtime}`));
  }
});

test("listCapsuleFiles returns every template file", () => {
  assert.deepEqual(listCapsuleFiles().sort(), Object.keys(CAPSULE_FILES).sort());
});
