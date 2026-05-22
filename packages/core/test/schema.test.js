import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("capsule schema documents required manifest fields", async () => {
  const raw = await fs.readFile("schemas/capsule.schema.json", "utf8");
  const schema = JSON.parse(raw);

  for (const field of ["id", "version", "subject", "mode", "consent", "export_targets"]) {
    assert.ok(schema.required.includes(field), `${field} should be required`);
  }

  assert.deepEqual(schema.properties.mode.enum, ["self-continuity", "memorial", "public-figure", "fictional"]);
  assert.deepEqual(schema.properties.export_targets.items.enum, ["hermes", "openclaw", "openhands", "codex", "claude-code"]);
});

test("source index schema documents required source metadata", async () => {
  const raw = await fs.readFile("schemas/source-index.schema.json", "utf8");
  const schema = JSON.parse(raw);
  const sourceRequired = schema.properties.sources.items.required;

  for (const field of ["id", "path", "type", "bytes", "hash", "sensitivity", "owner", "imported_at", "modified_at", "status"]) {
    assert.ok(sourceRequired.includes(field), `${field} should be required`);
  }
});

test("claim schema documents evidence-backed claim fields", async () => {
  const raw = await fs.readFile("schemas/claim.schema.json", "utf8");
  const schema = JSON.parse(raw);

  for (const field of ["id", "type", "text", "confidence", "source_ids", "created_at"]) {
    assert.ok(schema.required.includes(field), `${field} should be required`);
  }

  assert.equal(schema.properties.source_ids.minItems, 1);
});

test("known-answer eval schema documents prompt and answer constraints", async () => {
  const raw = await fs.readFile("schemas/known-answer-test.schema.json", "utf8");
  const schema = JSON.parse(raw);

  for (const field of ["id", "prompt", "must_include", "must_not_include"]) {
    assert.ok(schema.required.includes(field), `${field} should be required`);
  }

  assert.equal(schema.properties.must_include.type, "array");
  assert.equal(schema.properties.must_not_include.type, "array");
});
