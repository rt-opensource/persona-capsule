import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const CLI_PATH = path.resolve("packages/cli/src/persona-capsule.js");

test("init creates a capsule directory", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "persona-capsule-"));
  const target = path.join(root, "capsule");

  const result = spawnSync(process.execPath, [CLI_PATH, "init", target], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Created persona capsule/);

  for (const file of ["capsule.yaml", "SOUL.md", "USER.md", "MEMORY_POLICY.md", "BOUNDARIES.md"]) {
    await assert.doesNotReject(fs.access(path.join(target, file)));
  }

  await assert.doesNotReject(fs.access(path.join(target, "adapters", "hermes")));
  await assert.doesNotReject(fs.access(path.join(target, "sources")));
});

test("init refuses a non-empty directory", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "persona-capsule-"));
  await fs.writeFile(path.join(root, "existing.txt"), "already here");

  const result = spawnSync(process.execPath, [CLI_PATH, "init", root], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Target directory is not empty/);
});

test("ingest indexes source files", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "persona-capsule-"));
  const target = path.join(root, "capsule");
  const sourceDir = path.join(target, "sources", "manuals");

  const initResult = spawnSync(process.execPath, [CLI_PATH, "init", target], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });
  assert.equal(initResult.status, 0, initResult.stderr);

  await fs.mkdir(sourceDir, { recursive: true });
  await fs.writeFile(path.join(sourceDir, "user-manual.md"), "# User Manual\n\nUse this tool carefully.\n");

  const ingestResult = spawnSync(process.execPath, [CLI_PATH, "ingest", target, sourceDir], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.equal(ingestResult.status, 0, ingestResult.stderr);
  assert.match(ingestResult.stdout, /Indexed 1 source file/);

  const rawIndex = await fs.readFile(path.join(target, "evidence", "source-index.json"), "utf8");
  const index = JSON.parse(rawIndex);

  assert.equal(index.sources.length, 1);
  assert.equal(index.sources[0].path, "sources/manuals/user-manual.md");
  assert.equal(index.sources[0].type, "markdown");
  assert.equal(index.sources[0].status, "indexed");
});

test("validate accepts a freshly initialized capsule", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "persona-capsule-"));
  const target = path.join(root, "capsule");

  const initResult = spawnSync(process.execPath, [CLI_PATH, "init", target], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });
  assert.equal(initResult.status, 0, initResult.stderr);

  const validateResult = spawnSync(process.execPath, [CLI_PATH, "validate", target], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.equal(validateResult.status, 0, validateResult.stderr);
  assert.match(validateResult.stdout, /Validation passed/);
});

test("validate reports readable capsule manifest errors", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "persona-capsule-"));
  const target = path.join(root, "capsule");

  const initResult = spawnSync(process.execPath, [CLI_PATH, "init", target], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });
  assert.equal(initResult.status, 0, initResult.stderr);

  await fs.writeFile(
    path.join(target, "capsule.yaml"),
    `id: Invalid ID
version: 0.1.0
mode: haunted
subject:
  description: "missing display name"
consent:
  status: unverified
export_targets:
  - codex
  - codex
  - unknown-runtime
`
  );

  const validateResult = spawnSync(process.execPath, [CLI_PATH, "validate", target], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.notEqual(validateResult.status, 0);
  assert.match(validateResult.stderr, /capsule\.yaml/);
  assert.match(validateResult.stderr, /id must match/);
  assert.match(validateResult.stderr, /mode must be one of/);
  assert.match(validateResult.stderr, /subject\.display_name is required/);
  assert.match(validateResult.stderr, /consent\.status must be one of/);
  assert.match(validateResult.stderr, /export_targets\[1\] duplicates codex/);
  assert.match(validateResult.stderr, /export_targets\[2\] must be one of/);
});

test("validate reports readable source index errors", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "persona-capsule-"));
  const target = path.join(root, "capsule");

  const initResult = spawnSync(process.execPath, [CLI_PATH, "init", target], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });
  assert.equal(initResult.status, 0, initResult.stderr);

  await fs.writeFile(
    path.join(target, "evidence", "source-index.json"),
    `${JSON.stringify({ sources: [{ id: "src_bad", path: "sources/bad.md" }] }, null, 2)}\n`
  );

  const validateResult = spawnSync(process.execPath, [CLI_PATH, "validate", target], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.notEqual(validateResult.status, 0);
  assert.match(validateResult.stderr, /source-index\.json/);
  assert.match(validateResult.stderr, /sources\[0\]\.hash is required/);
  assert.match(validateResult.stderr, /sources\[0\]\.type is required/);
});

test("validate reports indexed source files that changed after ingest", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "persona-capsule-"));
  const target = path.join(root, "capsule");
  const sourcePath = path.join(target, "sources", "journal.md");

  const initResult = spawnSync(process.execPath, [CLI_PATH, "init", target], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });
  assert.equal(initResult.status, 0, initResult.stderr);

  await fs.writeFile(sourcePath, "Tea is my steady morning ritual.\n");

  const ingestResult = spawnSync(process.execPath, [CLI_PATH, "ingest", target, sourcePath], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });
  assert.equal(ingestResult.status, 0, ingestResult.stderr);

  await fs.writeFile(sourcePath, "Coffee replaced the tea ritual.\n");

  const validateResult = spawnSync(process.execPath, [CLI_PATH, "validate", target], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.notEqual(validateResult.status, 0);
  assert.match(validateResult.stderr, /source content hash does not match index/);
});

test("validate reports indexed source files that are missing", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "persona-capsule-"));
  const target = path.join(root, "capsule");
  const sourcePath = path.join(target, "sources", "journal.md");

  const initResult = spawnSync(process.execPath, [CLI_PATH, "init", target], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });
  assert.equal(initResult.status, 0, initResult.stderr);

  await fs.writeFile(sourcePath, "Tea is my steady morning ritual.\n");

  const ingestResult = spawnSync(process.execPath, [CLI_PATH, "ingest", target, sourcePath], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });
  assert.equal(ingestResult.status, 0, ingestResult.stderr);

  await fs.unlink(sourcePath);

  const validateResult = spawnSync(process.execPath, [CLI_PATH, "validate", target], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.notEqual(validateResult.status, 0);
  assert.match(validateResult.stderr, /indexed source file is missing/);
});

test("validate reports claims without source references", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "persona-capsule-"));
  const target = path.join(root, "capsule");

  const initResult = spawnSync(process.execPath, [CLI_PATH, "init", target], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });
  assert.equal(initResult.status, 0, initResult.stderr);

  await fs.writeFile(
    path.join(target, "evidence", "claims.jsonl"),
    `${JSON.stringify({
      id: "claim_tea",
      type: "preference",
      text: "The persona prefers tea.",
      confidence: "verified",
      source_ids: [],
      created_at: "2026-05-22T00:00:00.000Z"
    })}\n`
  );

  const validateResult = spawnSync(process.execPath, [CLI_PATH, "validate", target], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.notEqual(validateResult.status, 0);
  assert.match(validateResult.stderr, /claims\.jsonl:1/);
  assert.match(validateResult.stderr, /source_ids must contain at least one source id/);
});

test("validate accepts claims that reference indexed sources", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "persona-capsule-"));
  const target = path.join(root, "capsule");
  const sourcePath = path.join(target, "sources", "journal.md");

  const initResult = spawnSync(process.execPath, [CLI_PATH, "init", target], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });
  assert.equal(initResult.status, 0, initResult.stderr);

  await fs.writeFile(sourcePath, "Tea is my steady morning ritual.\n");

  const ingestResult = spawnSync(process.execPath, [CLI_PATH, "ingest", target, sourcePath], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });
  assert.equal(ingestResult.status, 0, ingestResult.stderr);

  const rawIndex = await fs.readFile(path.join(target, "evidence", "source-index.json"), "utf8");
  const sourceId = JSON.parse(rawIndex).sources[0].id;

  await fs.writeFile(
    path.join(target, "evidence", "claims.jsonl"),
    `${JSON.stringify({
      id: "claim_tea",
      type: "preference",
      text: "The persona treats tea as a morning ritual.",
      confidence: "verified",
      source_ids: [sourceId],
      evidence: [{ source_id: sourceId, quote: "Tea is my steady morning ritual.", location: "line 1" }],
      created_at: "2026-05-22T00:00:00.000Z"
    })}\n`
  );

  const validateResult = spawnSync(process.execPath, [CLI_PATH, "validate", target], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.equal(validateResult.status, 0, validateResult.stderr);
  assert.match(validateResult.stdout, /Validation passed/);
});
