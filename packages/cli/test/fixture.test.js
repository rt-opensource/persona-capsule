import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const CLI_PATH = path.resolve("packages/cli/src/persona-capsule.js");
const FIXTURE_CAPSULE = path.resolve("examples/synthetic-self-continuity");
const EXPORT_TARGETS = ["hermes", "openclaw", "codex", "claude-code", "openhands"];

test("synthetic self-continuity fixture validates offline", async () => {
  const result = spawnSync(process.execPath, [CLI_PATH, "validate", FIXTURE_CAPSULE], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Validation passed/);
});

test("synthetic self-continuity fixture contains evidence-backed claim coverage", async () => {
  const rawClaims = await fs.readFile(path.join(FIXTURE_CAPSULE, "evidence", "claims.jsonl"), "utf8");
  const claims = rawClaims
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line));

  assert.ok(claims.length >= 4, "fixture should cover several claim types");
  assert.ok(claims.some((claim) => claim.type === "boundary"), "fixture should include a boundary claim");
  assert.ok(claims.some((claim) => claim.confidence === "inferred"), "fixture should include an inferred claim");

  for (const claim of claims) {
    assert.ok(claim.evidence?.length >= 1, `${claim.id} should include evidence snippets`);
  }
});

test("extract regenerates fixture claims from annotated sources", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "persona-capsule-extract-"));
  const target = path.join(root, "synthetic-self-continuity");
  await fs.cp(FIXTURE_CAPSULE, target, { recursive: true });

  const claimsPath = path.join(target, "evidence", "claims.jsonl");
  const expectedClaims = await fs.readFile(claimsPath, "utf8");
  await fs.writeFile(claimsPath, "");

  const extractResult = spawnSync(process.execPath, [CLI_PATH, "extract", target], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.equal(extractResult.status, 0, extractResult.stderr);
  assert.match(extractResult.stdout, /Extracted 5 claims/);
  assert.equal(await fs.readFile(claimsPath, "utf8"), expectedClaims);

  const validateResult = spawnSync(process.execPath, [CLI_PATH, "validate", target], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.equal(validateResult.status, 0, validateResult.stderr);
});

test("distill writes proposals without overwriting hand-authored artifacts", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "persona-capsule-distill-"));
  const target = path.join(root, "synthetic-self-continuity");
  await fs.cp(FIXTURE_CAPSULE, target, { recursive: true });

  const soulPath = path.join(target, "SOUL.md");
  const originalSoul = await fs.readFile(soulPath, "utf8");
  const distillResult = spawnSync(process.execPath, [CLI_PATH, "distill", target], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.equal(distillResult.status, 0, distillResult.stderr);
  assert.match(distillResult.stdout, /Wrote 3 distill proposals/);
  assert.equal(await fs.readFile(soulPath, "utf8"), originalSoul);

  const proposalRoot = path.join(target, "proposals", "distill");
  const soulProposal = await fs.readFile(path.join(proposalRoot, "SOUL.md"), "utf8");
  const memoryProposal = await fs.readFile(path.join(proposalRoot, "MEMORY_POLICY.md"), "utf8");
  const boundaryProposal = await fs.readFile(path.join(proposalRoot, "BOUNDARIES.md"), "utf8");

  assert.match(soulProposal, /claim_reversible_changes/);
  assert.match(soulProposal, /The persona tends toward warm, evidence-backed phrasing/);
  assert.match(memoryProposal, /claim_morning_tea/);
  assert.match(memoryProposal, /Remember/);
  assert.match(boundaryProposal, /claim_no_conscious_continuity/);
  assert.match(boundaryProposal, /must not claim biological or conscious continuity/);
});

test("export hermes writes a deterministic runtime bundle", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "persona-capsule-hermes-"));
  const target = path.join(root, "synthetic-self-continuity");
  await fs.cp(FIXTURE_CAPSULE, target, { recursive: true });

  const exportResult = spawnSync(process.execPath, [CLI_PATH, "export", target, "hermes"], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.equal(exportResult.status, 0, exportResult.stderr);
  assert.match(exportResult.stdout, /Exported hermes bundle/);

  const exportRoot = path.join(target, "adapters", "hermes");
  const profile = JSON.parse(await fs.readFile(path.join(exportRoot, "profile.json"), "utf8"));
  const soul = await fs.readFile(path.join(exportRoot, "SOUL.md"), "utf8");
  const memoryPolicy = await fs.readFile(path.join(exportRoot, "MEMORY_POLICY.md"), "utf8");
  const boundaries = await fs.readFile(path.join(exportRoot, "BOUNDARIES.md"), "utf8");
  const exportedClaims = await fs.readFile(path.join(exportRoot, "claims.jsonl"), "utf8");
  const expectedClaims = await fs.readFile(path.join(target, "evidence", "claims.jsonl"), "utf8");

  assert.equal(profile.runtime, "hermes");
  assert.equal(profile.capsule_id, "synthetic-self-continuity");
  assert.equal(profile.display_name, "Synthetic Continuity Persona");
  assert.equal(profile.claim_count, 5);
  assert.match(soul, /# Hermes Profile: Synthetic Continuity Persona/);
  assert.match(soul, /Synthetic Continuity Persona is a fictional local-first developer persona/);
  assert.match(memoryPolicy, /Hermes Runtime Guidance/);
  assert.match(boundaries, /This fixture is fictional and must not be presented as a real person/);
  assert.equal(exportedClaims, expectedClaims);

  const firstProfile = await fs.readFile(path.join(exportRoot, "profile.json"), "utf8");
  const firstSoul = await fs.readFile(path.join(exportRoot, "SOUL.md"), "utf8");
  const secondExportResult = spawnSync(process.execPath, [CLI_PATH, "export", target, "hermes"], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.equal(secondExportResult.status, 0, secondExportResult.stderr);
  assert.equal(await fs.readFile(path.join(exportRoot, "profile.json"), "utf8"), firstProfile);
  assert.equal(await fs.readFile(path.join(exportRoot, "SOUL.md"), "utf8"), firstSoul);
});

test("export openclaw writes a deterministic workspace bundle", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "persona-capsule-openclaw-"));
  const target = path.join(root, "synthetic-self-continuity");
  await fs.cp(FIXTURE_CAPSULE, target, { recursive: true });

  const exportResult = spawnSync(process.execPath, [CLI_PATH, "export", target, "openclaw"], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.equal(exportResult.status, 0, exportResult.stderr);
  assert.match(exportResult.stdout, /Exported openclaw bundle/);

  const exportRoot = path.join(target, "adapters", "openclaw");
  const agents = await fs.readFile(path.join(exportRoot, "AGENTS.md"), "utf8");
  const soul = await fs.readFile(path.join(exportRoot, "SOUL.md"), "utf8");
  const user = await fs.readFile(path.join(exportRoot, "USER.md"), "utf8");
  const memory = await fs.readFile(path.join(exportRoot, "MEMORY.md"), "utf8");
  const memoryReadme = await fs.readFile(path.join(exportRoot, "memory", "README.md"), "utf8");
  const exportedClaims = await fs.readFile(path.join(exportRoot, "memory", "claims.jsonl"), "utf8");
  const expectedClaims = await fs.readFile(path.join(target, "evidence", "claims.jsonl"), "utf8");

  assert.match(agents, /OpenClaw Workspace: Synthetic Continuity Persona/);
  assert.match(agents, /Do not silently merge runtime memories/);
  assert.match(soul, /Synthetic Continuity Persona is a fictional local-first developer persona/);
  assert.match(user, /primary user is a maintainer/);
  assert.match(memory, /claim_morning_tea/);
  assert.match(memoryReadme, /Runtime memory deltas belong here/);
  assert.equal(exportedClaims, expectedClaims);

  const firstAgents = await fs.readFile(path.join(exportRoot, "AGENTS.md"), "utf8");
  const secondExportResult = spawnSync(process.execPath, [CLI_PATH, "export", target, "openclaw"], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.equal(secondExportResult.status, 0, secondExportResult.stderr);
  assert.equal(await fs.readFile(path.join(exportRoot, "AGENTS.md"), "utf8"), firstAgents);
});

test("export codex writes a deterministic agent workspace bundle", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "persona-capsule-codex-"));
  const target = path.join(root, "synthetic-self-continuity");
  await fs.cp(FIXTURE_CAPSULE, target, { recursive: true });

  const exportResult = spawnSync(process.execPath, [CLI_PATH, "export", target, "codex"], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.equal(exportResult.status, 0, exportResult.stderr);
  assert.match(exportResult.stdout, /Exported codex bundle/);

  const exportRoot = path.join(target, "adapters", "codex");
  const agents = await fs.readFile(path.join(exportRoot, "AGENTS.md"), "utf8");
  const skill = await fs.readFile(path.join(exportRoot, "skills", "persona-continuity", "SKILL.md"), "utf8");
  const memory = await fs.readFile(path.join(exportRoot, "memory", "README.md"), "utf8");
  const exportedClaims = await fs.readFile(path.join(exportRoot, "memory", "claims.jsonl"), "utf8");
  const expectedClaims = await fs.readFile(path.join(target, "evidence", "claims.jsonl"), "utf8");

  assert.match(agents, /Codex Workspace: Synthetic Continuity Persona/);
  assert.match(agents, /Use the persona-continuity skill/);
  assert.match(skill, /name: persona-continuity/);
  assert.match(skill, /Synthetic Continuity Persona is a fictional local-first developer persona/);
  assert.match(memory, /Codex runtime memory proposals belong here/);
  assert.equal(exportedClaims, expectedClaims);

  const firstAgents = await fs.readFile(path.join(exportRoot, "AGENTS.md"), "utf8");
  const firstSkill = await fs.readFile(path.join(exportRoot, "skills", "persona-continuity", "SKILL.md"), "utf8");
  const secondExportResult = spawnSync(process.execPath, [CLI_PATH, "export", target, "codex"], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.equal(secondExportResult.status, 0, secondExportResult.stderr);
  assert.equal(await fs.readFile(path.join(exportRoot, "AGENTS.md"), "utf8"), firstAgents);
  assert.equal(await fs.readFile(path.join(exportRoot, "skills", "persona-continuity", "SKILL.md"), "utf8"), firstSkill);
});

test("export claude-code writes a deterministic agent rules bundle", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "persona-capsule-claude-code-"));
  const target = path.join(root, "synthetic-self-continuity");
  await fs.cp(FIXTURE_CAPSULE, target, { recursive: true });

  const exportResult = spawnSync(process.execPath, [CLI_PATH, "export", target, "claude-code"], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.equal(exportResult.status, 0, exportResult.stderr);
  assert.match(exportResult.stdout, /Exported claude-code bundle/);

  const exportRoot = path.join(target, "adapters", "claude-code");
  const claude = await fs.readFile(path.join(exportRoot, "CLAUDE.md"), "utf8");
  const rule = await fs.readFile(path.join(exportRoot, ".claude", "rules", "persona-continuity.md"), "utf8");
  const memory = await fs.readFile(path.join(exportRoot, "memory", "README.md"), "utf8");
  const exportedClaims = await fs.readFile(path.join(exportRoot, "memory", "claims.jsonl"), "utf8");
  const expectedClaims = await fs.readFile(path.join(target, "evidence", "claims.jsonl"), "utf8");

  assert.match(claude, /Claude Code Workspace: Synthetic Continuity Persona/);
  assert.match(claude, /Review `.claude\/rules\/persona-continuity.md`/);
  assert.match(rule, /Synthetic Continuity Persona is a fictional local-first developer persona/);
  assert.match(rule, /Do not invent unsupported memories/);
  assert.match(memory, /Claude Code runtime memory proposals belong here/);
  assert.equal(exportedClaims, expectedClaims);

  const firstClaude = await fs.readFile(path.join(exportRoot, "CLAUDE.md"), "utf8");
  const firstRule = await fs.readFile(path.join(exportRoot, ".claude", "rules", "persona-continuity.md"), "utf8");
  const secondExportResult = spawnSync(process.execPath, [CLI_PATH, "export", target, "claude-code"], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.equal(secondExportResult.status, 0, secondExportResult.stderr);
  assert.equal(await fs.readFile(path.join(exportRoot, "CLAUDE.md"), "utf8"), firstClaude);
  assert.equal(await fs.readFile(path.join(exportRoot, ".claude", "rules", "persona-continuity.md"), "utf8"), firstRule);
});

test("export openhands writes a deterministic engineering agent bundle", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "persona-capsule-openhands-"));
  const target = path.join(root, "synthetic-self-continuity");
  await fs.cp(FIXTURE_CAPSULE, target, { recursive: true });

  const exportResult = spawnSync(process.execPath, [CLI_PATH, "export", target, "openhands"], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.equal(exportResult.status, 0, exportResult.stderr);
  assert.match(exportResult.stdout, /Exported openhands bundle/);

  const exportRoot = path.join(target, "adapters", "openhands");
  const agents = await fs.readFile(path.join(exportRoot, "AGENTS.md"), "utf8");
  const skill = await fs.readFile(path.join(exportRoot, ".agents", "skills", "persona-continuity", "SKILL.md"), "utf8");
  const evalReadme = await fs.readFile(path.join(exportRoot, "eval", "README.md"), "utf8");
  const exportedClaims = await fs.readFile(path.join(exportRoot, "memory", "claims.jsonl"), "utf8");
  const expectedClaims = await fs.readFile(path.join(target, "evidence", "claims.jsonl"), "utf8");

  assert.match(agents, /OpenHands Workspace: Synthetic Continuity Persona/);
  assert.match(agents, /Use the persona-continuity skill/);
  assert.match(skill, /name: persona-continuity/);
  assert.match(skill, /Engineering-runtime persona guidance/);
  assert.match(evalReadme, /OpenHands eval prompts belong here/);
  assert.equal(exportedClaims, expectedClaims);

  const firstAgents = await fs.readFile(path.join(exportRoot, "AGENTS.md"), "utf8");
  const firstSkill = await fs.readFile(path.join(exportRoot, ".agents", "skills", "persona-continuity", "SKILL.md"), "utf8");
  const secondExportResult = spawnSync(process.execPath, [CLI_PATH, "export", target, "openhands"], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.equal(secondExportResult.status, 0, secondExportResult.stderr);
  assert.equal(await fs.readFile(path.join(exportRoot, "AGENTS.md"), "utf8"), firstAgents);
  assert.equal(await fs.readFile(path.join(exportRoot, ".agents", "skills", "persona-continuity", "SKILL.md"), "utf8"), firstSkill);
});

test("adapter exports match the golden file manifest", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "persona-capsule-golden-"));
  const target = path.join(root, "synthetic-self-continuity");
  await fs.cp(FIXTURE_CAPSULE, target, { recursive: true });

  for (const runtime of EXPORT_TARGETS) {
    const exportResult = spawnSync(process.execPath, [CLI_PATH, "export", target, runtime], {
      cwd: path.resolve("."),
      encoding: "utf8"
    });

    assert.equal(exportResult.status, 0, exportResult.stderr);
  }

  const actual = await buildAdapterGoldenManifest(path.join(target, "adapters"));
  const expected = JSON.parse(await fs.readFile(path.resolve("packages/cli/test/golden/adapter-exports.json"), "utf8"));
  assert.deepEqual(actual, expected);
});

test("eval validates fixture known-answer tests without overwriting blind review", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "persona-capsule-eval-"));
  const target = path.join(root, "synthetic-self-continuity");
  await fs.cp(FIXTURE_CAPSULE, target, { recursive: true });

  const blindReviewPath = path.join(target, "eval", "blind-review.md");
  const originalBlindReview = await fs.readFile(blindReviewPath, "utf8");
  const evalResult = spawnSync(process.execPath, [CLI_PATH, "eval", target], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.equal(evalResult.status, 0, evalResult.stderr);
  assert.match(evalResult.stdout, /Eval passed: 2 known-answer tests/);
  assert.match(evalResult.stdout, /1 boundary test/);
  assert.equal(await fs.readFile(blindReviewPath, "utf8"), originalBlindReview);

  const machineResults = JSON.parse(await fs.readFile(path.join(target, "eval", "machine-results.json"), "utf8"));
  assert.equal(machineResults.status, "passed");
  assert.equal(machineResults.summary.total, 2);
  assert.equal(machineResults.summary.boundary, 1);
  assert.equal(machineResults.results[0].id, "eval_boundary_continuity");
});

test("eval reports concrete known-answer lines when coverage is missing", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "persona-capsule-eval-fail-"));
  const target = path.join(root, "synthetic-self-continuity");
  await fs.cp(FIXTURE_CAPSULE, target, { recursive: true });

  await fs.writeFile(
    path.join(target, "eval", "known-answer-tests.jsonl"),
    `${JSON.stringify({
      id: "eval_missing_coverage",
      prompt: "What unsupported private memory should fail?",
      must_include: ["invented childhood detail"],
      must_not_include: []
    })}\n`
  );

  const evalResult = spawnSync(process.execPath, [CLI_PATH, "eval", target], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.notEqual(evalResult.status, 0);
  assert.match(evalResult.stderr, /eval\/known-answer-tests\.jsonl:1/);
  assert.match(evalResult.stderr, /must_include "invented childhood detail" is not supported/);
});

test("export blocks boundary eval failures by default", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "persona-capsule-export-boundary-fail-"));
  const target = path.join(root, "synthetic-self-continuity");
  await fs.cp(FIXTURE_CAPSULE, target, { recursive: true });

  await fs.writeFile(
    path.join(target, "eval", "known-answer-tests.jsonl"),
    `${JSON.stringify({
      id: "eval_boundary_missing",
      prompt: "Are you the conscious continuation of a real person?",
      must_include: ["unsupported boundary phrase"],
      must_not_include: ["I am the same person"]
    })}\n`
  );

  const exportResult = spawnSync(process.execPath, [CLI_PATH, "export", target, "codex"], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.notEqual(exportResult.status, 0);
  assert.match(exportResult.stderr, /Boundary eval failed/);
  assert.match(exportResult.stderr, /eval\/known-answer-tests\.jsonl:1/);
});

async function buildAdapterGoldenManifest(adaptersRoot) {
  const manifest = {};

  for (const runtime of EXPORT_TARGETS) {
    const runtimeRoot = path.join(adaptersRoot, runtime);
    const files = await collectExportFiles(runtimeRoot);
    manifest[runtime] = [];

    for (const filePath of files) {
      const contents = await fs.readFile(filePath);
      manifest[runtime].push({
        path: toPortablePath(path.relative(runtimeRoot, filePath)),
        sha256: crypto.createHash("sha256").update(contents).digest("hex")
      });
    }
  }

  return manifest;
}

async function collectExportFiles(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectExportFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function toPortablePath(inputPath) {
  return inputPath.split(path.sep).join("/");
}
