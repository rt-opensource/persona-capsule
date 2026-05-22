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
