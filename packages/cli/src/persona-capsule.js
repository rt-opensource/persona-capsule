#!/usr/bin/env node
import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CAPSULE_DIRECTORIES, CAPSULE_FILES } from "../../core/src/index.js";

const [, , command, ...args] = process.argv;

async function main() {
  switch (command) {
    case "init":
      await initCapsule(args[0] ?? "./persona-capsule");
      break;
    case "ingest":
      await ingestSources(args);
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
  persona doctor             Check local runtime requirements
  persona help               Show this help
`);
}

await main();
