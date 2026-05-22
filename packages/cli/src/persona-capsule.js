#!/usr/bin/env node
import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildClaudeCodeExport,
  buildCodexExport,
  buildDistillProposals,
  buildHermesExport,
  buildOpenClawExport,
  buildOpenHandsExport,
  CAPSULE_DIRECTORIES,
  CAPSULE_FILES,
  extractClaimsFromIndexedSources,
  formatClaimsJsonl,
  parseCapsuleManifest,
  runCapsuleEval,
  validateCapsuleManifest,
  validateClaimsJsonl,
  validateSourceIndex
} from "../../core/src/index.js";

const [, , command, ...args] = process.argv;
const EXPORT_BUILDERS = {
  "claude-code": buildClaudeCodeExport,
  codex: buildCodexExport,
  hermes: buildHermesExport,
  openclaw: buildOpenClawExport,
  openhands: buildOpenHandsExport
};

async function main() {
  switch (command) {
    case "init":
      await initCapsule(args[0] ?? "./persona-capsule");
      break;
    case "ingest":
      await ingestSources(args);
      break;
    case "extract":
      await extractClaims(args[0] ?? ".");
      break;
    case "distill":
      await distillClaims(args[0] ?? ".");
      break;
    case "export":
      await exportCapsule(args);
      break;
    case "eval":
      await evalCapsule(args[0] ?? ".");
      break;
    case "validate":
      await validateCapsule(args[0] ?? ".");
      break;
    case "doctor":
      doctor();
      break;
    case "help":
    case undefined:
      printHelp();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exitCode = 1;
  }
}

async function initCapsule(targetArg) {
  const target = path.resolve(process.cwd(), targetArg);
  await assertDirectoryIsWritable(target);

  for (const directory of CAPSULE_DIRECTORIES) {
    await fs.mkdir(path.join(target, directory), { recursive: true });
  }

  for (const [relativePath, contents] of Object.entries(CAPSULE_FILES)) {
    const destination = path.join(target, relativePath);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, contents, { flag: "wx" });
  }

  console.log(`Created persona capsule at ${target}`);
}

async function ingestSources(args) {
  const { capsuleDir, sourcePaths } = parseIngestArgs(args);
  if (sourcePaths.length === 0) {
    throw new Error("ingest requires at least one source path");
  }

  const capsuleRoot = path.resolve(process.cwd(), capsuleDir);
  await assertCapsuleExists(capsuleRoot);

  const indexPath = path.join(capsuleRoot, "evidence", "source-index.json");
  const index = await readSourceIndex(indexPath);
  const seen = new Set(index.sources.map((source) => `${source.hash}:${source.path}`));
  const added = [];

  for (const sourcePath of sourcePaths) {
    const resolvedSource = path.resolve(process.cwd(), sourcePath);
    const files = await collectFiles(resolvedSource);

    for (const filePath of files) {
      const source = await createSourceRecord(capsuleRoot, filePath);
      const key = `${source.hash}:${source.path}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      index.sources.push(source);
      added.push(source);
    }
  }

  index.sources.sort((left, right) => left.path.localeCompare(right.path));
  await fs.writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`Indexed ${added.length} source file${added.length === 1 ? "" : "s"} in ${indexPath}`);
}

async function extractClaims(capsuleArg) {
  const capsuleRoot = path.resolve(process.cwd(), capsuleArg);
  await assertCapsuleExists(capsuleRoot);

  const errors = [];
  const sourceIndexPath = path.join(capsuleRoot, "evidence", "source-index.json");
  const claimsPath = path.join(capsuleRoot, "evidence", "claims.jsonl");
  const sourceIndex = await readJsonForValidation(sourceIndexPath, "evidence/source-index.json", errors);

  if (!sourceIndex) {
    return failWithErrors(errors);
  }

  for (const error of validateSourceIndex(sourceIndex)) {
    errors.push(`evidence/source-index.json: ${error}`);
  }
  errors.push(...await validateIndexedSourceFiles(capsuleRoot, sourceIndex));

  if (errors.length > 0) {
    return failWithErrors(errors);
  }

  const sourceDocuments = [];
  for (const source of sourceIndex.sources.filter(isCheckableIndexedSource)) {
    sourceDocuments.push({
      source,
      text: await fs.readFile(path.join(capsuleRoot, source.path), "utf8")
    });
  }

  const { claims, errors: extractErrors } = extractClaimsFromIndexedSources(sourceDocuments);
  errors.push(...extractErrors);
  errors.push(...validateClaimsJsonl(formatClaimsJsonl(claims), sourceIndex.sources.map((source) => source.id)));

  if (errors.length > 0) {
    return failWithErrors(errors);
  }

  await fs.writeFile(claimsPath, formatClaimsJsonl(claims));
  console.log(`Extracted ${claims.length} claim${claims.length === 1 ? "" : "s"} into ${claimsPath}`);
}

async function distillClaims(capsuleArg) {
  const capsuleRoot = path.resolve(process.cwd(), capsuleArg);
  await assertCapsuleExists(capsuleRoot);

  const errors = [];
  const sourceIndexPath = path.join(capsuleRoot, "evidence", "source-index.json");
  const claimsPath = path.join(capsuleRoot, "evidence", "claims.jsonl");
  const sourceIndex = await readJsonForValidation(sourceIndexPath, "evidence/source-index.json", errors);
  const rawClaims = await readTextForValidation(claimsPath, "evidence/claims.jsonl", errors);

  if (!sourceIndex || rawClaims === undefined) {
    return failWithErrors(errors);
  }

  for (const error of validateSourceIndex(sourceIndex)) {
    errors.push(`evidence/source-index.json: ${error}`);
  }
  errors.push(...validateClaimsJsonl(rawClaims, sourceIndex.sources.map((source) => source.id)));

  if (errors.length > 0) {
    return failWithErrors(errors);
  }

  const claims = parseClaimsJsonl(rawClaims);
  const proposals = buildDistillProposals(claims);
  const proposalRoot = path.join(capsuleRoot, "proposals", "distill");
  await fs.mkdir(proposalRoot, { recursive: true });

  for (const [fileName, contents] of Object.entries(proposals)) {
    await fs.writeFile(path.join(proposalRoot, fileName), contents);
  }

  console.log(`Wrote ${Object.keys(proposals).length} distill proposals into ${proposalRoot}`);
}

async function exportCapsule(args) {
  const [capsuleArg, target] = args;
  if (!capsuleArg || !target) {
    return failWithErrors(["export requires a capsule directory and target"]);
  }

  if (!EXPORT_BUILDERS[target]) {
    return failWithErrors([`Unsupported export target: ${target}`]);
  }

  const capsuleRoot = path.resolve(process.cwd(), capsuleArg);
  await assertCapsuleExists(capsuleRoot);

  const errors = [];
  const rawManifest = await readTextForValidation(path.join(capsuleRoot, "capsule.yaml"), "capsule.yaml", errors);
  const sourceIndex = await readJsonForValidation(path.join(capsuleRoot, "evidence", "source-index.json"), "evidence/source-index.json", errors);
  const rawClaims = await readTextForValidation(path.join(capsuleRoot, "evidence", "claims.jsonl"), "evidence/claims.jsonl", errors);

  if (rawManifest === undefined || !sourceIndex || rawClaims === undefined) {
    return failWithErrors(errors);
  }

  const manifestResult = parseCapsuleManifest(rawManifest);
  errors.push(...manifestResult.errors.map((error) => `capsule.yaml: ${error}`));
  errors.push(...validateCapsuleManifest(rawManifest).map((error) => `capsule.yaml: ${error}`));
  errors.push(...validateSourceIndex(sourceIndex).map((error) => `evidence/source-index.json: ${error}`));
  errors.push(...validateClaimsJsonl(rawClaims, sourceIndex.sources.map((source) => source.id)));

  if (errors.length > 0) {
    return failWithErrors(errors);
  }

  const artifacts = {
    SOUL: await fs.readFile(path.join(capsuleRoot, "SOUL.md"), "utf8"),
    USER: await fs.readFile(path.join(capsuleRoot, "USER.md"), "utf8"),
    MEMORY_POLICY: await fs.readFile(path.join(capsuleRoot, "MEMORY_POLICY.md"), "utf8"),
    BOUNDARIES: await fs.readFile(path.join(capsuleRoot, "BOUNDARIES.md"), "utf8")
  };
  const claims = parseClaimsJsonl(rawClaims);
  const exportInput = {
    manifest: manifestResult.manifest,
    artifacts,
    claims,
    rawClaims
  };
  const evalResult = await runEval(capsuleRoot, artifacts, rawClaims);
  if (evalResult.boundaryFailures.length > 0) {
    return failWithErrors(["Boundary eval failed before export.", ...evalResult.boundaryFailures]);
  }

  const files = EXPORT_BUILDERS[target](exportInput);

  const exportRoot = path.join(capsuleRoot, "adapters", target);
  await fs.mkdir(exportRoot, { recursive: true });
  for (const [fileName, contents] of Object.entries(files)) {
    const destination = path.join(exportRoot, fileName);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, contents);
  }

  console.log(`Exported ${target} bundle into ${exportRoot}`);
}

async function evalCapsule(capsuleArg) {
  const capsuleRoot = path.resolve(process.cwd(), capsuleArg);
  await assertCapsuleExists(capsuleRoot);

  const errors = [];
  const rawClaims = await readTextForValidation(path.join(capsuleRoot, "evidence", "claims.jsonl"), "evidence/claims.jsonl", errors);
  const artifacts = await readCanonicalArtifacts(capsuleRoot, errors);

  if (rawClaims === undefined || !artifacts) {
    return failWithErrors(errors);
  }

  const result = await runEval(capsuleRoot, artifacts, rawClaims);
  await fs.writeFile(path.join(capsuleRoot, "eval", "machine-results.json"), `${JSON.stringify(result, null, 2)}\n`);

  if (result.status !== "passed") {
    return failWithErrors(result.errors);
  }

  console.log(`Eval passed: ${result.summary.total} known-answer tests, ${result.summary.boundary} boundary test${result.summary.boundary === 1 ? "" : "s"}`);
}

async function runEval(capsuleRoot, artifacts, rawClaims) {
  const evalPath = path.join(capsuleRoot, "eval", "known-answer-tests.jsonl");
  let rawKnownAnswerTests = "";
  try {
    rawKnownAnswerTests = await fs.readFile(evalPath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  return runCapsuleEval({
    rawKnownAnswerTests,
    corpus: [
      artifacts.SOUL,
      artifacts.USER,
      artifacts.MEMORY_POLICY,
      artifacts.BOUNDARIES,
      rawClaims
    ].join("\n\n")
  });
}

async function validateCapsule(capsuleArg) {
  const capsuleRoot = path.resolve(process.cwd(), capsuleArg);
  await assertCapsuleExists(capsuleRoot);

  const errors = [];
  const manifestPath = path.join(capsuleRoot, "capsule.yaml");
  const sourceIndexPath = path.join(capsuleRoot, "evidence", "source-index.json");
  const claimsPath = path.join(capsuleRoot, "evidence", "claims.jsonl");
  const rawManifest = await readTextForValidation(manifestPath, "capsule.yaml", errors);
  if (rawManifest !== undefined) {
    for (const error of validateCapsuleManifest(rawManifest)) {
      errors.push(`capsule.yaml: ${error}`);
    }
  }

  const sourceIndex = await readJsonForValidation(sourceIndexPath, "evidence/source-index.json", errors);

  if (sourceIndex) {
    for (const error of validateSourceIndex(sourceIndex)) {
      errors.push(`evidence/source-index.json: ${error}`);
    }

    errors.push(...await validateIndexedSourceFiles(capsuleRoot, sourceIndex));
  }

  const sourceIds = sourceIndex?.sources?.map((source) => source.id) ?? [];
  const rawClaims = await readTextForValidation(claimsPath, "evidence/claims.jsonl", errors);
  if (rawClaims !== undefined) {
    errors.push(...validateClaimsJsonl(rawClaims, sourceIds));
  }

  if (errors.length > 0) {
    return failWithErrors(errors);
  }

  console.log(`Validation passed: ${capsuleRoot}`);
}

function failWithErrors(errors) {
  for (const error of errors) {
    console.error(error);
  }
  process.exitCode = 1;
}

async function readCanonicalArtifacts(capsuleRoot, errors) {
  const artifactEntries = [
    ["SOUL", "SOUL.md"],
    ["USER", "USER.md"],
    ["MEMORY_POLICY", "MEMORY_POLICY.md"],
    ["BOUNDARIES", "BOUNDARIES.md"]
  ];
  const artifacts = {};

  for (const [key, relativePath] of artifactEntries) {
    const contents = await readTextForValidation(path.join(capsuleRoot, relativePath), relativePath, errors);
    if (contents !== undefined) {
      artifacts[key] = contents;
    }
  }

  return Object.keys(artifacts).length === artifactEntries.length ? artifacts : undefined;
}

async function validateIndexedSourceFiles(capsuleRoot, sourceIndex) {
  const errors = [];
  if (!Array.isArray(sourceIndex.sources)) {
    return errors;
  }

  for (const [sourcePosition, source] of sourceIndex.sources.entries()) {
    if (!isCheckableIndexedSource(source)) {
      continue;
    }

    const displayPath = `evidence/source-index.json: sources[${sourcePosition}]`;
    const sourcePath = path.join(capsuleRoot, source.path);

    try {
      const buffer = await fs.readFile(sourcePath);
      const hash = crypto.createHash("sha256").update(buffer).digest("hex");

      if (buffer.byteLength !== source.bytes) {
        errors.push(`${displayPath} source byte size does not match index`);
      }

      if (hash !== source.hash) {
        errors.push(`${displayPath} source content hash does not match index`);
      }
    } catch (error) {
      if (error.code === "ENOENT") {
        errors.push(`${displayPath} indexed source file is missing`);
        continue;
      }

      throw error;
    }
  }

  return errors;
}

function isCheckableIndexedSource(source) {
  return source?.status === "indexed" && typeof source.path === "string" && !source.path.startsWith("/") && !source.path.includes("..");
}

function parseIngestArgs(args) {
  const capsuleFlagIndex = args.indexOf("--capsule");
  if (capsuleFlagIndex >= 0) {
    const capsuleDir = args[capsuleFlagIndex + 1];
    if (!capsuleDir) {
      throw new Error("--capsule requires a directory");
    }

    return {
      capsuleDir,
      sourcePaths: args.filter((_, index) => index !== capsuleFlagIndex && index !== capsuleFlagIndex + 1)
    };
  }

  if (args.length >= 2) {
    return {
      capsuleDir: args[0],
      sourcePaths: args.slice(1)
    };
  }

  return {
    capsuleDir: ".",
    sourcePaths: args
  };
}

async function assertCapsuleExists(capsuleRoot) {
  const manifestPath = path.join(capsuleRoot, "capsule.yaml");
  try {
    await fs.access(manifestPath);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`Not a persona capsule: ${capsuleRoot}`);
    }
    throw error;
  }
}

async function readSourceIndex(indexPath) {
  try {
    const raw = await fs.readFile(indexPath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      sources: Array.isArray(parsed.sources) ? parsed.sources : []
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { sources: [] };
    }
    throw error;
  }
}

async function readJsonForValidation(filePath, displayPath, errors) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      errors.push(`${displayPath} is required`);
      return undefined;
    }

    if (error instanceof SyntaxError) {
      errors.push(`${displayPath} must be valid JSON`);
      return undefined;
    }

    throw error;
  }
}

async function readTextForValidation(filePath, displayPath, errors) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      errors.push(`${displayPath} is required`);
      return undefined;
    }

    throw error;
  }
}

function parseClaimsJsonl(rawClaims) {
  return rawClaims
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line));
}

async function collectFiles(inputPath) {
  const stat = await fs.stat(inputPath);
  if (stat.isFile()) {
    return [inputPath];
  }

  if (!stat.isDirectory()) {
    return [];
  }

  const files = [];
  const entries = await fs.readdir(inputPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const child = path.join(inputPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(child));
    } else if (entry.isFile()) {
      files.push(child);
    }
  }

  return files;
}

async function createSourceRecord(capsuleRoot, filePath) {
  const buffer = await fs.readFile(filePath);
  const stat = await fs.stat(filePath);
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");

  return {
    id: `src_${hash.slice(0, 12)}`,
    path: toPortablePath(capsuleRoot, filePath),
    type: detectSourceType(filePath),
    bytes: stat.size,
    hash,
    sensitivity: "unspecified",
    owner: "unknown",
    imported_at: new Date().toISOString(),
    modified_at: stat.mtime.toISOString(),
    status: "indexed"
  };
}

function toPortablePath(capsuleRoot, filePath) {
  const relativeToCapsule = path.relative(capsuleRoot, filePath);
  if (!relativeToCapsule.startsWith("..") && !path.isAbsolute(relativeToCapsule)) {
    return normalizePath(relativeToCapsule);
  }

  return normalizePath(path.relative(process.cwd(), filePath));
}

function normalizePath(inputPath) {
  return inputPath.split(path.sep).join("/");
}

function detectSourceType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const types = {
    ".md": "markdown",
    ".txt": "text",
    ".json": "json",
    ".jsonl": "jsonl",
    ".csv": "csv",
    ".html": "html",
    ".htm": "html",
    ".pdf": "pdf",
    ".docx": "docx",
    ".srt": "subtitle",
    ".vtt": "subtitle"
  };

  return types[extension] ?? "unknown";
}

async function assertDirectoryIsWritable(target) {
  try {
    const entries = await fs.readdir(target);
    if (entries.length > 0) {
      throw new Error(`Target directory is not empty: ${target}`);
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      await fs.mkdir(target, { recursive: true });
      return;
    }
    throw error;
  }
}

function doctor() {
  const major = Number.parseInt(process.versions.node.split(".")[0], 10);
  const cliPath = fileURLToPath(import.meta.url);

  console.log("Persona Capsule doctor");
  console.log(`Node.js: ${process.version}`);
  console.log(`CLI: ${cliPath}`);

  if (major < 20) {
    console.error("Node.js >=20 is required.");
    process.exitCode = 1;
    return;
  }

  console.log("Status: ok");
}

function printHelp() {
  console.log(`Persona Capsule

Usage:
  persona init <directory>   Create a new persona capsule
  persona ingest <capsule> <sources...>
                              Index source files into evidence/source-index.json
  persona ingest <sources...> --capsule <capsule>
                              Same as above with an explicit capsule flag
  persona extract <capsule>   Generate evidence/claims.jsonl from source claim blocks
  persona distill <capsule>   Write proposal files from evidence/claims.jsonl
  persona export <capsule> <target>
                              Write a runtime bundle (claude-code, codex, hermes, openclaw, openhands)
  persona eval <capsule>      Run offline known-answer and boundary eval checks
  persona validate <capsule>  Validate source index and claims files
  persona doctor             Check local runtime requirements
  persona help               Show this help
`);
}

await main();
